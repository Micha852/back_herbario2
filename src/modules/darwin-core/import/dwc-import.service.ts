/**
 * Importación de muestras desde Darwin Core.
 * - Vista previa (commit=false): no escribe nada; informa qué se crearía, duplicados y problemas.
 * - Importar (commit=true): mismo proceso dentro de una transacción (todo o nada).
 * Los catálogos se buscan sin distinguir mayúsculas/tildes y se crean si no existen.
 */

import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service';
import { speciesFullName } from '../../catalogs/catalog-input';
import { DwcReadError, readDwcFile } from './dwc-read';
import { ImportRow, interpretRow } from './dwc-row';

type Db = Prisma.TransactionClient | PrismaClient;

export const MAX_IMPORT_ROWS = 5000;
const MAX_REPORTED_ISSUES = 300;
const DEFAULT_LOCATION_TYPE = 'Sin clasificar';

/** minúsculas, sin tildes, espacios simples */
export function normalizeName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** "nativo" ≈ "nativa", "introducido" ≈ "introducida" */
const genderless = (key: string) => key.replace(/[oa]$/, '');

export const CATALOG_LABELS = {
  divisions: 'Divisiones',
  classes: 'Clases',
  orders: 'Órdenes',
  families: 'Familias',
  genera: 'Géneros',
  species: 'Especies',
  departments: 'Departamentos',
  municipalities: 'Municipios',
  locations: 'Localidades',
  locationTypes: 'Tipos de localidad',
  conditions: 'Condiciones',
  origins: 'Orígenes',
  originTypes: 'Tipos de origen',
  habitats: 'Hábitats',
} as const;

type CatalogKind = keyof typeof CATALOG_LABELS;

interface Named {
  id: string;
  name: string;
}

export interface ImportIssue {
  line: number;
  catalogNumber: string;
  status: 'error' | 'duplicate' | 'warning';
  messages: string[];
}

export interface ImportReport {
  committed: boolean;
  file: { sheetName: string | null; rows: number; ignoredColumns: string[] };
  summary: {
    toImport: number;
    imported: number;
    duplicates: number;
    errors: number;
    withWarnings: number;
  };
  newCatalogs: { kind: CatalogKind; label: string; names: string[] }[];
  collectors: {
    matched: { name: string; user: string }[];
    unmatched: string[];
  };
  issues: ImportIssue[];
  issuesTruncated: boolean;
}

/**
 * Busca o crea catálogos. En vista previa no escribe: devuelve ids "new:..." y
 * anota los nombres que se crearían.
 */
class CatalogResolver {
  private maps = new Map<string, Map<string, Named>>();
  readonly created = new Map<CatalogKind, Set<string>>();

  constructor(
    private db: Db,
    private commit: boolean,
  ) {}

  /** Carga los catálogos simples (clave = nombre normalizado) */
  async load() {
    const [
      divisions,
      classes,
      orders,
      families,
      departments,
      conditions,
      origins,
      originTypes,
      habitats,
      locationTypes,
    ] = await Promise.all([
      this.db.division.findMany({ select: { id: true, name: true } }),
      this.db.class.findMany({ select: { id: true, name: true } }),
      this.db.order.findMany({ select: { id: true, name: true } }),
      this.db.family.findMany({ select: { id: true, name: true } }),
      this.db.department.findMany({ select: { id: true, name: true } }),
      this.db.condition.findMany({ select: { id: true, name: true } }),
      this.db.origin.findMany({ select: { id: true, name: true } }),
      this.db.originType.findMany({ select: { id: true, name: true } }),
      this.db.habitat.findMany({ select: { id: true, name: true } }),
      this.db.locationType.findMany({ select: { id: true, name: true } }),
    ]);
    const index = (items: Named[]) =>
      new Map(items.map((item) => [normalizeName(item.name), item]));
    this.maps.set('divisions', index(divisions));
    this.maps.set('classes', index(classes));
    this.maps.set('orders', index(orders));
    this.maps.set('families', index(families));
    this.maps.set('departments', index(departments));
    this.maps.set('conditions', index(conditions));
    this.maps.set('origins', index(origins));
    this.maps.set('originTypes', index(originTypes));
    this.maps.set('habitats', index(habitats));
    this.maps.set('locationTypes', index(locationTypes));

    // Jerárquicos: clave compuesta con el id del padre
    const [genera, species, municipalities, locations] = await Promise.all([
      this.db.genus.findMany({
        select: { id: true, name: true, familyId: true },
      }),
      this.db.species.findMany({
        select: { id: true, epithet: true, genusId: true },
      }),
      this.db.municipality.findMany({
        select: { id: true, name: true, departmentId: true },
      }),
      this.db.location.findMany({
        select: { id: true, name: true, municipalityId: true },
      }),
    ]);
    this.maps.set(
      'genera',
      new Map(
        genera.map((g) => [`${g.familyId ?? ''}|${normalizeName(g.name)}`, g]),
      ),
    );
    // Géneros también por nombre solo (cuando el archivo no trae familia)
    this.maps.set(
      'generaByName',
      new Map(genera.map((g) => [normalizeName(g.name), g])),
    );
    this.maps.set(
      'species',
      new Map(
        species.map((s) => [
          `${s.genusId ?? ''}|${normalizeName(s.epithet)}`,
          { id: s.id, name: s.epithet },
        ]),
      ),
    );
    this.maps.set(
      'municipalities',
      new Map(
        municipalities.map((m) => [
          `${m.departmentId}|${normalizeName(m.name)}`,
          m,
        ]),
      ),
    );
    this.maps.set(
      'locations',
      new Map(
        locations.map((l) => [
          `${l.municipalityId}|${normalizeName(l.name)}`,
          l,
        ]),
      ),
    );
  }

  private map(kind: string) {
    let map = this.maps.get(kind);
    if (!map) {
      map = new Map();
      this.maps.set(kind, map);
    }
    return map;
  }

  /** Busca en un catálogo simple; con `fuzzy` tolera masculino/femenino */
  find(kind: CatalogKind, name: string, fuzzy = false): Named | null {
    const map = this.map(kind);
    const key = normalizeName(name);
    const exact = map.get(key);
    if (exact || !fuzzy) return exact ?? null;
    for (const [candidate, item] of map) {
      if (genderless(candidate) === genderless(key)) return item;
    }
    return null;
  }

  private async getOrCreate(
    kind: CatalogKind,
    key: string,
    name: string,
    create: () => Promise<Named>,
    extraKeys: [string, string][] = [],
  ): Promise<string> {
    const map = this.map(kind);
    const existing = map.get(key);
    if (existing) return existing.id;

    const item = this.commit
      ? await create()
      : { id: `new:${kind}:${key}`, name };
    map.set(key, item);
    for (const [otherKind, otherKey] of extraKeys)
      this.map(otherKind).set(otherKey, item);
    if (!this.created.has(kind)) this.created.set(kind, new Set());
    this.created.get(kind)!.add(name);
    return item.id;
  }

  /** ids "new:" en vista previa no existen en la base: no se usan como FK */
  private real = (id: string | null) =>
    id && !id.startsWith('new:') ? id : null;

  simple(
    kind:
      | 'divisions'
      | 'conditions'
      | 'origins'
      | 'originTypes'
      | 'habitats'
      | 'locationTypes'
      | 'departments',
    name: string,
  ) {
    const found = this.find(
      kind,
      name,
      ['conditions', 'origins', 'originTypes', 'habitats'].includes(kind),
    );
    if (found) return Promise.resolve(found.id);
    const data = { name };
    return this.getOrCreate(kind, normalizeName(name), name, () => {
      switch (kind) {
        case 'divisions':
          return this.db.division.create({ data });
        case 'conditions':
          return this.db.condition.create({ data });
        case 'origins':
          return this.db.origin.create({ data });
        case 'originTypes':
          return this.db.originType.create({ data });
        case 'habitats':
          return this.db.habitat.create({ data });
        case 'locationTypes':
          return this.db.locationType.create({ data });
        case 'departments':
          return this.db.department.create({ data });
      }
    });
  }

  taxon(
    kind: 'classes' | 'orders' | 'families',
    name: string,
    parentId: string | null,
  ) {
    const parent = this.real(parentId);
    return this.getOrCreate(kind, normalizeName(name), name, () => {
      switch (kind) {
        case 'classes':
          return this.db.class.create({ data: { name, divisionId: parent } });
        case 'orders':
          return this.db.order.create({ data: { name, classId: parent } });
        case 'families':
          return this.db.family.create({ data: { name, orderId: parent } });
      }
    });
  }

  genus(name: string, familyId: string | null) {
    const key = normalizeName(name);
    if (!familyId) {
      const byName = this.map('generaByName').get(key);
      if (byName) return Promise.resolve(byName.id);
    }
    return this.getOrCreate(
      'genera',
      `${familyId ?? ''}|${key}`,
      name,
      () =>
        this.db.genus.create({ data: { name, familyId: this.real(familyId) } }),
      [['generaByName', key]],
    );
  }

  species(
    genusId: string,
    genusName: string,
    epithet: string,
    author: string | null,
  ) {
    return this.getOrCreate(
      'species',
      `${genusId}|${normalizeName(epithet)}`,
      `${genusName} ${epithet}`,
      () =>
        this.db.species
          .create({
            data: {
              epithet,
              author,
              genusId: this.real(genusId),
              fullName: speciesFullName(genusName, epithet, author),
            },
          })
          .then((s) => ({ id: s.id, name: s.epithet })),
    );
  }

  municipality(name: string, departmentId: string, code: string | null) {
    return this.getOrCreate(
      'municipalities',
      `${departmentId}|${normalizeName(name)}`,
      name,
      () =>
        this.db.municipality.create({
          data: { name, code, departmentId: this.real(departmentId)! },
        }),
    );
  }

  async location(row: ImportRow, municipalityId: string) {
    const name = row.location.locality!;
    const key = `${municipalityId}|${normalizeName(name)}`;
    if (this.map('locations').has(key))
      return this.map('locations').get(key)!.id;
    const locationTypeId = await this.simple(
      'locationTypes',
      DEFAULT_LOCATION_TYPE,
    );
    return this.getOrCreate('locations', key, name, () =>
      this.db.location.create({
        data: {
          name,
          municipalityId: this.real(municipalityId)!,
          locationTypeId: this.real(locationTypeId)!,
          waterBody: row.location.waterBody?.slice(0, 200),
          description: row.location.remarks,
          latitude: row.latitude,
          longitude: row.longitude,
        },
      }),
    );
  }
}

@Injectable()
export class DwcImportService {
  constructor(private prisma: PrismaService) {}

  async import(
    file: { buffer: Buffer; originalname: string },
    options: { commit: boolean; projectId?: string; userId: string },
  ): Promise<ImportReport> {
    let read;
    try {
      read = await readDwcFile(file.buffer, file.originalname);
    } catch (error) {
      if (error instanceof DwcReadError)
        throw new BadRequestException(error.message);
      throw error;
    }
    if (read.rows.length === 0)
      throw new BadRequestException('El archivo no tiene filas con datos');
    if (read.rows.length > MAX_IMPORT_ROWS) {
      throw new BadRequestException(
        `Máximo ${MAX_IMPORT_ROWS} filas por archivo (tiene ${read.rows.length})`,
      );
    }
    if (options.projectId) {
      const project = await this.prisma.project.findUnique({
        where: { id: options.projectId },
      });
      if (!project)
        throw new BadRequestException('El proyecto elegido no existe');
    }

    const rows = read.rows.map(({ line, values }) =>
      interpretRow(line, values),
    );

    const run = (db: Db) => this.process(db, rows, read, options);
    if (!options.commit) return run(this.prisma);
    return this.prisma.$transaction((tx) => run(tx), {
      timeout: 300_000,
      maxWait: 10_000,
    });
  }

  private async process(
    db: Db,
    rows: ImportRow[],
    read: { sheetName: string | null; ignoredColumns: string[] },
    options: { commit: boolean; projectId?: string; userId: string },
  ): Promise<ImportReport> {
    const resolver = new CatalogResolver(db, options.commit);
    await resolver.load();

    // Duplicados: ya en la base o repetidos en el archivo
    const existing = new Set(
      (
        await db.specimen.findMany({
          where: {
            catalogNumber: {
              in: rows.map((r) => r.catalogNumber).filter(Boolean),
            },
          },
          select: { catalogNumber: true },
        })
      ).map((s) => s.catalogNumber.toLowerCase()),
    );
    const seen = new Set<string>();

    // Recolectores: usuarios recolectores activos por nombre
    const collectorUsers = await db.user.findMany({
      where: { isCollector: true, isActive: true },
      select: { id: true, name: true },
    });
    const userByName = new Map(
      collectorUsers.map((u) => [normalizeName(u.name), u]),
    );
    const matched = new Map<string, string>();
    const unmatched = new Set<string>();

    const issues: ImportIssue[] = [];
    let imported = 0;
    let toImport = 0;
    let duplicates = 0;
    let errors = 0;
    let withWarnings = 0;

    for (const row of rows) {
      const catalogKey = row.catalogNumber.toLowerCase();
      if (row.errors.length) {
        errors++;
        issues.push({
          line: row.line,
          catalogNumber: row.catalogNumber,
          status: 'error',
          messages: row.errors,
        });
        continue;
      }
      if (existing.has(catalogKey) || seen.has(catalogKey)) {
        duplicates++;
        issues.push({
          line: row.line,
          catalogNumber: row.catalogNumber,
          status: 'duplicate',
          messages: [
            existing.has(catalogKey)
              ? 'Ya existe una muestra con ese número de catálogo: se omite'
              : 'Número de catálogo repetido en el archivo: se omite',
          ],
        });
        continue;
      }
      seen.add(catalogKey);

      const warnings = [...row.warnings];
      const data = await this.resolveRow(resolver, row, warnings);

      // Recolectores
      const collectorIds: string[] = [];
      const others: string[] = [];
      for (const name of row.recordedBy) {
        const user = userByName.get(normalizeName(name));
        if (user) {
          if (!collectorIds.includes(user.id)) collectorIds.push(user.id);
          matched.set(name, user.name);
        } else {
          others.push(name);
          unmatched.add(name);
        }
      }

      toImport++;
      if (warnings.length) {
        withWarnings++;
        issues.push({
          line: row.line,
          catalogNumber: row.catalogNumber,
          status: 'warning',
          messages: warnings,
        });
      }

      if (options.commit) {
        await db.specimen.create({
          data: {
            ...data,
            catalogNumber: row.catalogNumber,
            scientificName: row.scientificName,
            otherCollectors: others.join(' | ').slice(0, 500) || null,
            projectId: options.projectId ?? null,
            createdById: options.userId,
            collectors: collectorIds.length
              ? {
                  create: collectorIds.map((userId, i) => ({
                    userId,
                    isPrincipal: i === 0,
                  })),
                }
              : undefined,
          },
        });
        imported++;
      }
    }

    const order: CatalogKind[] = Object.keys(CATALOG_LABELS) as CatalogKind[];
    return {
      committed: options.commit,
      file: {
        sheetName: read.sheetName,
        rows: rows.length,
        ignoredColumns: read.ignoredColumns,
      },
      summary: { toImport, imported, duplicates, errors, withWarnings },
      newCatalogs: order
        .filter((kind) => resolver.created.get(kind)?.size)
        .map((kind) => ({
          kind,
          label: CATALOG_LABELS[kind],
          names: [...resolver.created.get(kind)!].sort((a, b) =>
            a.localeCompare(b, 'es'),
          ),
        })),
      collectors: {
        matched: [...matched].map(([name, user]) => ({ name, user })),
        unmatched: [...unmatched].sort((a, b) => a.localeCompare(b, 'es')),
      },
      issues: issues.slice(0, MAX_REPORTED_ISSUES),
      issuesTruncated: issues.length > MAX_REPORTED_ISSUES,
    };
  }

  /** Resuelve catálogos de una fila y arma los datos de la muestra */
  private async resolveRow(
    resolver: CatalogResolver,
    row: ImportRow,
    warnings: string[],
  ) {
    const real = (id: string | null) =>
      id && !id.startsWith('new:') ? id : null;
    const t = row.taxonomy;

    // Taxonomía (de arriba hacia abajo; cada nivel se liga al anterior)
    const divisionId = t.division
      ? await resolver.simple('divisions', t.division)
      : null;
    const classId = t.class
      ? await resolver.taxon('classes', t.class, divisionId)
      : null;
    const orderId = t.order
      ? await resolver.taxon('orders', t.order, classId)
      : null;
    const familyId = t.family
      ? await resolver.taxon('families', t.family, orderId)
      : null;
    const genusId = t.genus ? await resolver.genus(t.genus, familyId) : null;
    const speciesId =
      genusId && t.genus && t.epithet
        ? await resolver.species(genusId, t.genus, t.epithet, row.author)
        : null;

    // Ubicación
    let locationId: string | null = null;
    const l = row.location;
    if (l.department) {
      const departmentId = await resolver.simple('departments', l.department);
      if (l.municipality) {
        const municipalityId = await resolver.municipality(
          l.municipality,
          departmentId,
          l.municipalityCode,
        );
        if (l.locality)
          locationId = await resolver.location(row, municipalityId);
      } else if (l.locality) {
        warnings.push(
          'Localidad sin municipio (county): no se asoció una ubicación',
        );
      }
    } else if (l.municipality || l.locality) {
      warnings.push(
        'Ubicación sin departamento (stateProvince): no se asoció una ubicación',
      );
    }

    // Características
    const conditionId = row.condition
      ? await resolver.simple('conditions', row.condition)
      : null;
    const habitatId = row.habitat
      ? await resolver.simple('habitats', row.habitat)
      : null;

    // establishmentMeans: lo que coincida con un tipo de origen va ahí; lo demás es el origen
    let originId: string | null = null;
    let originTypeId: string | null = null;
    for (const part of row.establishment) {
      const asType = resolver.find('originTypes', part, true);
      if (asType && !originTypeId) {
        originTypeId = asType.id;
        continue;
      }
      if (!originId) originId = await resolver.simple('origins', part);
      else if (!originTypeId)
        originTypeId = await resolver.simple('originTypes', part);
      else
        warnings.push(
          `establishmentMeans "${part}" no tiene dónde guardarse: se omitió`,
        );
    }

    return {
      author: row.author,
      commonName: row.commonName,
      registryNumber: row.registryNumber,
      speciesId: real(speciesId),
      // Sin especie: se liga al género, o si tampoco hay, a la familia
      genusId: speciesId ? null : real(genusId),
      familyId: speciesId || genusId ? null : real(familyId),
      locationId: real(locationId),
      latitude: row.latitude,
      longitude: row.longitude,
      minElevation: row.minElevation,
      maxElevation: row.maxElevation,
      collectionDate: row.collectionDate,
      collectionYear: row.collectionYear,
      adultsCount: row.adultsCount,
      juvenilesCount: row.juvenilesCount,
      conditionId: real(conditionId),
      habitatId: real(habitatId),
      originId: real(originId),
      originTypeId: real(originTypeId),
      identifiedBy: row.identifiedBy,
      dateIdentified: row.dateIdentified,
      localObservation: row.localObservation,
      fieldNotes: row.fieldNotes,
      identificationNotes: row.identificationNotes,
    };
  }
}
