import { ForbiddenException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PERMISSIONS } from '../permissions/permissions.constants';
import {
  COLLECTION_SETTINGS_KEY,
  CollectionSettings,
  parseCollectionSettings,
} from './dwc-collection';
import { dwcSpecimenInclude, specimenToDwc } from './dwc-mapper';
import { toCsv, toXlsx } from './dwc-file';
import {
  DarwinCoreExportQuery,
  UpdateCollectionSettingsDto,
} from './dto/darwin-core.dto';

@Injectable()
export class DarwinCoreService {
  constructor(private prisma: PrismaService) {}

  async getCollectionSettings(): Promise<CollectionSettings> {
    const row = await this.prisma.systemInfo.findUnique({
      where: { key: COLLECTION_SETTINGS_KEY },
    });
    return parseCollectionSettings(row?.content);
  }

  async updateCollectionSettings(
    dto: UpdateCollectionSettingsDto,
  ): Promise<CollectionSettings> {
    const current = await this.getCollectionSettings();
    const trimmed = Object.fromEntries(
      Object.entries(dto)
        .filter(([, value]) => typeof value === 'string')
        .map(([key, value]) => [key, (value as string).trim()]),
    );
    const next = { ...current, ...trimmed };
    const content = JSON.stringify(next, null, 2);
    await this.prisma.systemInfo.upsert({
      where: { key: COLLECTION_SETTINGS_KEY },
      update: { content },
      // Inactivo: no es una página pública del sitio, solo configuración
      create: {
        key: COLLECTION_SETTINGS_KEY,
        title: 'Datos de la colección (Darwin Core)',
        content,
        isActive: false,
      },
    });
    return next;
  }

  /** Genera el archivo Darwin Core con las muestras que cumplen los filtros */
  async export(
    query: DarwinCoreExportQuery,
    user: { permissions?: string[] },
  ): Promise<{
    buffer: Buffer;
    filename: string;
    contentType: string;
    count: number;
  }> {
    if (
      query.includeInactive &&
      !user.permissions?.includes(PERMISSIONS.SPECIMENS_STATUS)
    ) {
      throw new ForbiddenException(
        'No tienes permiso para exportar muestras inactivas',
      );
    }

    const where: Prisma.SpecimenWhereInput = {
      ...(!query.includeInactive && { isActive: true }),
      ...(query.projectId && { projectId: query.projectId }),
      ...((query.startDate || query.endDate) && {
        collectionDate: {
          ...(query.startDate && { gte: new Date(query.startDate) }),
          ...(query.endDate && {
            lte: new Date(`${query.endDate.slice(0, 10)}T23:59:59.999Z`),
          }),
        },
      }),
    };

    const [settings, specimens] = await Promise.all([
      this.getCollectionSettings(),
      this.prisma.specimen.findMany({
        where,
        include: dwcSpecimenInclude,
        orderBy: { catalogNumber: 'asc' },
      }),
    ]);

    const records = specimens.map((specimen) =>
      specimenToDwc(specimen, settings),
    );
    const format = query.format ?? 'xlsx';
    const stamp = new Date().toISOString().slice(0, 10);

    return format === 'csv'
      ? {
          buffer: toCsv(records),
          filename: `darwin-core_${stamp}.csv`,
          contentType: 'text/csv; charset=utf-8',
          count: records.length,
        }
      : {
          buffer: await toXlsx(records),
          filename: `darwin-core_${stamp}.xlsx`,
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          count: records.length,
        };
  }
}
