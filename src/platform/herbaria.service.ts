/**
 * Herbarios de la plataforma (base master): listar, crear, editar, suspender y reactivar.
 */

import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Herbarium } from '.prisma/master-client';
import { generateTemporaryPassword } from '../modules/users/users-admin.logic';
import { MasterPrismaService } from '../tenancy/master-prisma.service';
import { TenantClientsService } from '../tenancy/tenant-clients.service';
import { RESERVED_SLUGS } from '../tenancy/tenant-slug';
import { TenantsService } from '../tenancy/tenants.service';
import { CreateHerbariumDto, UpdateHerbariumDto } from './platform.dto';
import { dbNameForSlug, ProvisioningService } from './provisioning.service';

/** Lo que ve el panel (sin detalles internos de conexión salvo el nombre de la base) */
const present = (h: Herbarium) => ({
  id: h.id,
  slug: h.slug,
  name: h.name,
  dbName: h.dbName,
  status: h.status,
  contactEmail: h.contactEmail,
  suspendedAt: h.suspendedAt,
  provisioningError: h.provisioningError,
  createdAt: h.createdAt,
  updatedAt: h.updatedAt,
});

@Injectable()
export class HerbariaService {
  constructor(
    private readonly master: MasterPrismaService,
    private readonly provisioning: ProvisioningService,
    private readonly tenants: TenantsService,
    private readonly clients: TenantClientsService,
  ) {}

  async list() {
    const herbaria = await this.master.herbarium.findMany({
      orderBy: { createdAt: 'asc' },
    });
    return herbaria.map(present);
  }

  async findOne(id: string) {
    return present(await this.get(id));
  }

  /**
   * Registra el herbario y crea su base en segundo plano. La contraseña temporal del primer
   * administrador se devuelve UNA sola vez: el panel la muestra para entregarla.
   */
  async create(dto: CreateHerbariumDto) {
    if (RESERVED_SLUGS.has(dto.slug)) {
      throw new BadRequestException(
        `"${dto.slug}" está reservado para la plataforma: usa otro identificador`,
      );
    }
    const dbName = dbNameForSlug(dto.slug);
    const taken = await this.master.herbarium.findFirst({
      where: { OR: [{ slug: dto.slug }, { dbName }] },
      select: { id: true },
    });
    if (taken)
      throw new ConflictException(
        'Ya existe un herbario con ese identificador',
      );

    const herbarium = await this.master.herbarium.create({
      data: {
        slug: dto.slug,
        name: dto.name,
        dbName,
        contactEmail: dto.contactEmail,
        status: 'PROVISIONING',
      },
    });
    const admin = {
      email: dto.adminEmail,
      name: dto.adminName,
      temporaryPassword: generateTemporaryPassword(),
    };
    this.provisioning.start(herbarium.id, admin);
    return { herbarium: present(herbarium), admin };
  }

  /** Reintenta la creación de un herbario que falló (nueva contraseña temporal) */
  async retry(id: string, adminEmail: string, adminName: string) {
    const herbarium = await this.get(id);
    if (herbarium.status !== 'FAILED') {
      throw new BadRequestException(
        'Solo se reintenta un herbario cuya creación falló',
      );
    }
    const updated = await this.master.herbarium.update({
      where: { id },
      data: { status: 'PROVISIONING', provisioningError: null },
    });
    const admin = {
      email: adminEmail,
      name: adminName,
      temporaryPassword: generateTemporaryPassword(),
    };
    this.provisioning.start(id, admin);
    return { herbarium: present(updated), admin };
  }

  async update(id: string, dto: UpdateHerbariumDto) {
    const herbarium = await this.get(id);
    const updated = await this.master.herbarium.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.contactEmail !== undefined && {
          contactEmail: dto.contactEmail || null,
        }),
      },
    });
    this.tenants.invalidate(herbarium.slug);
    return present(updated);
  }

  /** Sin acceso (403 en su subdominio); sus datos se conservan */
  async suspend(id: string) {
    const herbarium = await this.get(id);
    if (herbarium.status !== 'ACTIVE') {
      throw new BadRequestException('Solo se suspende un herbario activo');
    }
    const updated = await this.master.herbarium.update({
      where: { id },
      data: { status: 'SUSPENDED', suspendedAt: new Date() },
    });
    this.tenants.invalidate(herbarium.slug);
    await this.clients.release(herbarium.dbName);
    return present(updated);
  }

  async activate(id: string) {
    const herbarium = await this.get(id);
    if (herbarium.status !== 'SUSPENDED') {
      throw new BadRequestException('Solo se reactiva un herbario suspendido');
    }
    const updated = await this.master.herbarium.update({
      where: { id },
      data: { status: 'ACTIVE', suspendedAt: null },
    });
    this.tenants.invalidate(herbarium.slug);
    return present(updated);
  }

  private async get(id: string) {
    const herbarium = await this.master.herbarium.findUnique({ where: { id } });
    if (!herbarium) throw new NotFoundException('Herbario no encontrado');
    return herbarium;
  }
}
