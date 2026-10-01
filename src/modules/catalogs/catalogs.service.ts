import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CATALOGS, CatalogDefinition, getCatalog } from './catalog-definitions';
import {
  CatalogInput,
  parseCatalogInput,
  relationOf,
  speciesFullName,
} from './catalog-input';

export interface CatalogListQuery {
  search?: string;
  parentId?: string;
  includeInactive?: boolean;
  page?: number;
  limit?: number;
}

type Delegate = {
  findMany: (args: unknown) => Promise<Record<string, unknown>[]>;
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  count: (args: unknown) => Promise<number>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<unknown>;
};

@Injectable()
export class CatalogsService {
  constructor(private prisma: PrismaService) {}

  /** Definiciones para que el front arme tablas y formularios */
  getDefinitions() {
    // Sin el nombre del modelo de Prisma (detalle interno)
    return CATALOGS.map((definition) => {
      const publicDefinition: Partial<CatalogDefinition> = { ...definition };
      delete publicDefinition.model;
      return publicDefinition;
    });
  }

  definition(key: string): CatalogDefinition {
    const definition = getCatalog(key);
    if (!definition)
      throw new NotFoundException(`El catálogo "${key}" no existe`);
    return definition;
  }

  private delegate(definition: CatalogDefinition): Delegate {
    return (this.prisma as unknown as Record<string, Delegate>)[
      definition.model
    ];
  }

  /** include: conteo de uso + elementos referenciados (padre, tipo...) con su nombre */
  private include(definition: CatalogDefinition) {
    const include: Record<string, unknown> = {
      _count: {
        select: Object.fromEntries(
          definition.usage.map((usage) => [usage.relation, true]),
        ),
      },
    };
    for (const field of definition.fields.filter((f) => f.type === 'ref')) {
      const target = this.definition(field.ref!);
      include[relationOf(field.key)] = {
        select: { id: true, [target.displayField]: true },
      };
    }
    return include;
  }

  /** Forma de respuesta: datos + uso + nombre de las referencias */
  private present(definition: CatalogDefinition, row: Record<string, unknown>) {
    const { _count, ...data } = row as Record<string, unknown> & {
      _count: Record<string, number>;
    };
    const refs: Record<string, { id: string; label: string } | null> = {};
    for (const field of definition.fields.filter((f) => f.type === 'ref')) {
      const relation = relationOf(field.key);
      const target = this.definition(field.ref!);
      const related = data[relation] as
        | Record<string, string>
        | null
        | undefined;
      refs[field.key] = related
        ? { id: related.id, label: related[target.displayField] }
        : null;
      delete data[relation];
    }
    const usage = definition.usage.map((u) => ({
      ...u,
      count: _count?.[u.relation] ?? 0,
    }));
    return {
      ...data,
      label: data[definition.displayField] ?? '',
      refs,
      usage,
      inUse: usage.some((u) => u.count > 0),
    };
  }

  async list(key: string, query: CatalogListQuery) {
    const definition = this.definition(key);
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(200, Math.max(1, query.limit ?? 50));

    const where: Record<string, unknown> = {};
    if (!query.includeInactive) where.isActive = true;
    if (query.parentId && definition.parent)
      where[definition.parent.field] = query.parentId;
    if (query.search?.trim()) {
      where.OR = definition.searchFields.map((field) => ({
        [field]: { contains: query.search!.trim(), mode: 'insensitive' },
      }));
    }

    const delegate = this.delegate(definition);
    const [rows, total] = await Promise.all([
      delegate.findMany({
        where,
        include: this.include(definition),
        orderBy: definition.orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
      delegate.count({ where }),
    ]);

    return {
      data: rows.map((row) => this.present(definition, row)),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(key: string, id: string) {
    const definition = this.definition(key);
    const row = await this.delegate(definition).findUnique({
      where: { id },
      include: this.include(definition),
    });
    if (!row)
      throw new NotFoundException(
        `${definition.labelSingular} no encontrado(a)`,
      );
    return this.present(definition, row);
  }

  /** Verifica que los elementos referenciados (padre, tipo, protocolo...) existan */
  private async assertRefsExist(
    definition: CatalogDefinition,
    data: Record<string, unknown>,
  ) {
    for (const field of definition.fields.filter((f) => f.type === 'ref')) {
      const id = data[field.key];
      if (typeof id !== 'string') continue;
      const target = this.definition(field.ref!);
      const exists = await this.delegate(target).count({ where: { id } });
      if (!exists)
        throw new BadRequestException(
          `${field.label}: el elemento seleccionado no existe`,
        );
    }
  }

  private validate(
    definition: CatalogDefinition,
    input: CatalogInput,
    mode: 'create' | 'update',
  ) {
    const { data, errors } = parseCatalogInput(definition, input, mode);
    if (errors.length) throw new BadRequestException(errors);
    return data;
  }

  private conflict(error: unknown, definition: CatalogDefinition): never {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      throw new ConflictException(
        `Ya existe ${definition.labelSingular.toLowerCase()} con esos datos (nombre o código repetido)`,
      );
    }
    throw error;
  }

  async create(key: string, input: CatalogInput) {
    const definition = this.definition(key);
    const data = this.validate(definition, input, 'create');
    await this.assertRefsExist(definition, data);

    if (definition.key === 'species') {
      const genus = await this.prisma.genus.findUnique({
        where: { id: data.genusId as string },
      });
      data.fullName = speciesFullName(
        genus!.name,
        data.epithet as string,
        data.author as string | null,
      );
    }

    try {
      const row = await this.delegate(definition).create({
        data,
        include: this.include(definition),
      });
      return this.present(definition, row);
    } catch (error) {
      this.conflict(error, definition);
    }
  }

  /**
   * @param canToggleActive si el usuario tiene catalogs.delete (inhabilitar/habilitar)
   */
  async update(
    key: string,
    id: string,
    input: CatalogInput,
    canToggleActive: boolean,
  ) {
    const definition = this.definition(key);
    const existing = await this.delegate(definition).findUnique({
      where: { id },
    });
    if (!existing)
      throw new NotFoundException(
        `${definition.labelSingular} no encontrado(a)`,
      );

    const data = this.validate(definition, input, 'update');
    if (typeof input?.isActive === 'boolean') {
      if (!canToggleActive) {
        throw new ForbiddenException(
          'No tienes permiso para inhabilitar o habilitar elementos de los catálogos',
        );
      }
      data.isActive = input.isActive;
    }
    await this.assertRefsExist(definition, data);

    // Especie: recalcular el nombre completo si cambia género, epíteto o autor
    if (
      definition.key === 'species' &&
      ('genusId' in data || 'epithet' in data || 'author' in data)
    ) {
      const genusId = (data.genusId ?? existing.genusId) as string;
      const genus = await this.prisma.genus.findUnique({
        where: { id: genusId },
      });
      data.fullName = speciesFullName(
        genus?.name ?? '',
        (data.epithet ?? existing.epithet) as string,
        ('author' in data ? data.author : existing.author) as string | null,
      );
    }

    try {
      const row = await this.delegate(definition).update({
        where: { id },
        data,
        include: this.include(definition),
      });

      // Género renombrado: actualizar el nombre completo de sus especies
      if (
        definition.key === 'genera' &&
        'name' in data &&
        data.name !== existing.name
      ) {
        const species = await this.prisma.species.findMany({
          where: { genusId: id },
        });
        await this.prisma.$transaction(
          species.map((sp) =>
            this.prisma.species.update({
              where: { id: sp.id },
              data: {
                fullName: speciesFullName(
                  data.name as string,
                  sp.epithet,
                  sp.author,
                ),
              },
            }),
          ),
        );
      }

      return this.present(definition, row);
    } catch (error) {
      this.conflict(error, definition);
    }
  }

  /** Eliminar solo si nadie lo usa; si no, sugerir inhabilitar */
  async remove(key: string, id: string) {
    const definition = this.definition(key);
    const item = await this.findOne(key, id);
    const used = item.usage.filter((usage) => usage.count > 0);
    if (used.length) {
      throw new ConflictException({
        statusCode: 409,
        message: `No se puede eliminar: está en uso (${used
          .map((u) => `${u.count} ${u.label}`)
          .join(
            ', ',
          )}). Puedes inhabilitarlo para que no aparezca en los formularios.`,
        usage: used,
      });
    }
    await this.delegate(definition).delete({ where: { id } });
    return { message: `${definition.labelSingular} eliminado(a)` };
  }
}
