/**
 * Creación de la base de un herbario desde el panel de la plataforma (en segundo plano):
 * CREATE DATABASE → migraciones (traen roles y catálogos iniciales) → primer administrador
 * → ACTIVE. Si algo falla, el herbario queda FAILED con el motivo y se puede reintentar.
 * (El comando npm run herbarium:create hace lo mismo desde la consola.)
 */

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';
import { spawn } from 'child_process';
import { PasswordUtil } from '../common/utils/password.util';
import { MasterPrismaService } from '../tenancy/master-prisma.service';
import { TenantClientsService } from '../tenancy/tenant-clients.service';
import { tenantDatabaseUrl } from '../tenancy/tenant-url';
import { TenantsService } from '../tenancy/tenants.service';
import { UserRole } from '../modules/users/enums/user-role.enum';

/** Solo [a-z0-9_]: seguro dentro de comillas en CREATE/DROP DATABASE */
export const DB_NAME_PATTERN = /^[a-z][a-z0-9_]{0,62}$/;
export const dbNameForSlug = (slug: string) =>
  `herbario_${slug.replace(/-/g, '_')}`;

export interface FirstAdmin {
  email: string;
  name: string;
  temporaryPassword: string;
}

@Injectable()
export class ProvisioningService {
  private readonly logger = new Logger(ProvisioningService.name);
  private readonly baseUrl: string;

  constructor(
    config: ConfigService,
    private readonly master: MasterPrismaService,
    private readonly clients: TenantClientsService,
    private readonly tenants: TenantsService,
  ) {
    this.baseUrl = config.getOrThrow<string>('DATABASE_URL');
  }

  /** Lanza la creación sin esperarla; el estado queda en la master (PROVISIONING → ACTIVE/FAILED) */
  start(herbariumId: string, admin: FirstAdmin): void {
    void this.provision(herbariumId, admin);
  }

  async provision(herbariumId: string, admin: FirstAdmin): Promise<void> {
    const herbarium = await this.master.herbarium.findUniqueOrThrow({
      where: { id: herbariumId },
    });
    const { dbName, slug } = herbarium;
    try {
      if (!DB_NAME_PATTERN.test(dbName))
        throw new Error(`Nombre de base inválido: ${dbName}`);

      await this.maintenance(async (db) => {
        // Reintento: la base de un intento fallido nunca tuvo datos reales
        await db.$executeRawUnsafe(
          `DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`,
        );
        await db.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
      });

      await this.migrate(dbName);
      await this.createAdmin(dbName, admin);

      await this.master.herbarium.update({
        where: { id: herbariumId },
        data: { status: 'ACTIVE', provisioningError: null },
      });
      this.logger.log(`Herbario ${slug} listo (${dbName})`);
    } catch (error) {
      const message = (error as Error).message.slice(0, 2000);
      this.logger.error(`Creando ${slug}: ${message}`);
      await this.master.herbarium.update({
        where: { id: herbariumId },
        data: { status: 'FAILED', provisioningError: message },
      });
    } finally {
      this.tenants.invalidate(slug);
    }
  }

  /** prisma migrate deploy contra la base del herbario (proceso aparte, sin bloquear la API) */
  private migrate(dbName: string): Promise<void> {
    const cli = require.resolve('prisma/build/index.js');
    return new Promise((resolve, reject) => {
      const child = spawn(process.execPath, [cli, 'migrate', 'deploy'], {
        env: {
          ...process.env,
          DATABASE_URL: tenantDatabaseUrl(this.baseUrl, dbName),
        },
      });
      let output = '';
      const collect = (chunk: Buffer) => {
        output = (output + chunk.toString()).slice(-4000);
      };
      child.stdout.on('data', collect);
      child.stderr.on('data', collect);
      child.on('error', reject);
      child.on('close', (code) =>
        code === 0
          ? resolve()
          : reject(new Error(`Las migraciones fallaron:\n${output.trim()}`)),
      );
    });
  }

  private async createAdmin(dbName: string, admin: FirstAdmin) {
    const db = this.clients.forDatabase(dbName);
    const role = await db.role.findUnique({ where: { name: UserRole.ADMIN } });
    if (!role) throw new Error('La base no tiene el rol de administrador');
    await db.user.create({
      data: {
        email: admin.email,
        name: admin.name,
        password: await PasswordUtil.hash(admin.temporaryPassword),
        roleId: role.id,
        isActive: true,
      },
    });
  }

  /** Conexión a la base de mantenimiento del servidor (para CREATE/DROP DATABASE) */
  private async maintenance(fn: (db: PrismaClient) => Promise<void>) {
    const db = new PrismaClient({
      datasources: { db: { url: tenantDatabaseUrl(this.baseUrl, 'postgres') } },
    });
    try {
      await fn(db);
    } finally {
      await db.$disconnect();
    }
  }
}
