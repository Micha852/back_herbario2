/**
 * Documentos descargables: ficha técnica (PDF) e informe por recolector (PDF / Excel).
 */

import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma } from '@prisma/client';
import * as sharp from 'sharp';
import { PrismaService } from '../../database/prisma.service';
import { resolveTaxonomy, taxonomyInclude } from '../../common/prisma/taxonomy';
import { ImagesService } from '../images/images.service';
import { DarwinCoreService } from '../darwin-core/darwin-core.service';
import { PERMISSIONS } from '../permissions/permissions.constants';
import {
  SheetSpecimen,
  sheetInclude,
  specimenSheetPdf,
} from './pdf/specimen-sheet';
import { herbariumLabelPdf } from './pdf/herbarium-label';
import {
  CollectorReportRow,
  collectorReportPdf,
  collectorReportXlsx,
} from './pdf/collector-report';
import { formatDate } from './pdf/pdf-kit';
import { herbariumName } from '../../tenancy/tenant-context';

export interface DownloadFile {
  buffer: Buffer;
  filename: string;
  contentType: string;
}

export interface CollectorOption {
  /** "user:<id>" (usuario del sistema) o "name:<nombre>" (recolector en texto) */
  key: string;
  name: string;
  type: 'user' | 'text';
  specimens: number;
}

const XLSX =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/** Nombre de archivo seguro: sin tildes ni símbolos */
export function slug(text: string): string {
  return (
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-zA-Z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase()
      .slice(0, 60) || 'documento'
  );
}

const canSeeInactive = (user?: { permissions?: string[] } | null) =>
  !!user?.permissions?.includes(PERMISSIONS.SPECIMENS_STATUS);

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(
    private prisma: PrismaService,
    private images: ImagesService,
    private darwinCore: DarwinCoreService,
    private config: ConfigService,
  ) {}

  /** Nombre de la colección para encabezados (de "Datos de la colección") */
  private async collectionName() {
    const s = await this.darwinCore.getCollectionSettings();
    return (
      [s.institutionCode, s.collectionCode && `Colección ${s.collectionCode}`]
        .filter(Boolean)
        .join(' · ') || herbariumName()
    );
  }

  // ---------- Ficha técnica ----------

  /**
   * Ficha de la muestra en PDF.
   * - full: ficha técnica completa (imagen opcional).
   * - label: etiqueta de herbario sobre la foto del pliego (requiere imagen).
   */
  async specimenSheet(
    id: string,
    user?: { permissions?: string[] } | null,
    style: 'full' | 'label' = 'full',
  ): Promise<DownloadFile> {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id },
      include: sheetInclude,
    });
    if (!specimen || (!specimen.isActive && !canSeeInactive(user))) {
      throw new NotFoundException('Muestra no encontrada');
    }

    if (style === 'label') return this.herbariumLabel(specimen);

    // Imagen principal en JPEG (pdfkit no lee WebP); si falla, la ficha sale sin imagen
    let image: Buffer | null = null;
    const primary = specimen.images[0];
    if (primary) {
      try {
        const { buffer } = await this.images.getImageFile(primary.id, 'medium');
        image = await sharp(buffer)
          .flatten({ background: '#ffffff' })
          .jpeg({ quality: 85 })
          .toBuffer();
      } catch (error) {
        this.logger.warn(
          `Ficha ${specimen.catalogNumber}: no se pudo cargar la imagen (${(error as Error).message})`,
        );
      }
    }

    const appUrl = this.config.get<string>('APP_URL')?.replace(/\/$/, '');
    const buffer = await specimenSheetPdf(specimen, {
      collection: await this.collectionName(),
      image,
      publicUrl:
        appUrl && specimen.isActive
          ? `${appUrl}/consultas/${specimen.id}`
          : null,
    });
    return {
      buffer,
      filename: `ficha_${slug(specimen.catalogNumber)}_${slug(specimen.scientificName)}.pdf`,
      contentType: 'application/pdf',
    };
  }

  private async herbariumLabel(specimen: SheetSpecimen): Promise<DownloadFile> {
    const primary = specimen.images[0];
    if (!primary) {
      throw new BadRequestException(
        'Esta muestra todavía no tiene la foto del pliego: la etiqueta de herbario la necesita',
      );
    }

    // Original reducida a 2400 px (≈ 220 ppp en carta): la versión "large" se queda corta para imprimir
    let image: { buffer: Buffer; width: number; height: number };
    try {
      const { buffer: original } = await this.images.getImageFile(
        primary.id,
        'original',
      );
      const { data, info } = await sharp(original)
        .rotate()
        .resize({
          width: 2400,
          height: 2400,
          fit: 'inside',
          withoutEnlargement: true,
        })
        .flatten({ background: '#ffffff' })
        .jpeg({ quality: 85 })
        .toBuffer({ resolveWithObject: true });
      image = { buffer: data, width: info.width, height: info.height };
    } catch (error) {
      this.logger.warn(
        `Etiqueta ${specimen.catalogNumber}: no se pudo cargar la imagen (${(error as Error).message})`,
      );
      throw new BadRequestException('No se pudo leer la imagen de la muestra');
    }

    const settings = await this.darwinCore.getCollectionSettings();
    const title =
      settings.labelTitle.trim() ||
      (settings.collectionCode
        ? `HERBARIO ${settings.collectionCode}`
        : settings.institutionCode.toUpperCase()) ||
      herbariumName().toUpperCase();

    const buffer = await herbariumLabelPdf(specimen, {
      title,
      country: settings.country || 'Colombia',
      image,
    });
    return {
      buffer,
      filename: `etiqueta_${slug(specimen.catalogNumber)}_${slug(specimen.scientificName)}.pdf`,
      contentType: 'application/pdf',
    };
  }

  // ---------- Recolectores ----------

  /** Usuarios recolectores y recolectores en texto (importados), con su número de muestras */
  async listCollectors(
    user?: { permissions?: string[] } | null,
  ): Promise<CollectorOption[]> {
    const specimenWhere: Prisma.SpecimenWhereInput = canSeeInactive(user)
      ? {}
      : { isActive: true };

    const [users, texts] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          OR: [
            { isCollector: true },
            { collectedSpecimens: { some: { specimen: specimenWhere } } },
          ],
        },
        select: {
          id: true,
          name: true,
          _count: {
            select: {
              collectedSpecimens: { where: { specimen: specimenWhere } },
            },
          },
        },
      }),
      this.prisma.specimen.findMany({
        where: { ...specimenWhere, otherCollectors: { not: null } },
        select: { otherCollectors: true },
      }),
    ]);

    const textCounts = new Map<string, { name: string; count: number }>();
    for (const { otherCollectors } of texts) {
      const names = new Set(
        (otherCollectors ?? '')
          .split('|')
          .map((n) => n.trim())
          .filter(Boolean),
      );
      for (const name of names) {
        const key = name.toLowerCase();
        const entry = textCounts.get(key) ?? { name, count: 0 };
        entry.count++;
        textCounts.set(key, entry);
      }
    }

    return [
      ...users.map((u) => ({
        key: `user:${u.id}`,
        name: u.name,
        type: 'user' as const,
        specimens: u._count.collectedSpecimens,
      })),
      ...[...textCounts.values()].map((t) => ({
        key: `name:${t.name}`,
        name: t.name,
        type: 'text' as const,
        specimens: t.count,
      })),
    ].sort(
      (a, b) => b.specimens - a.specimens || a.name.localeCompare(b.name, 'es'),
    );
  }

  async collectorReport(
    key: string,
    query: { format?: 'pdf' | 'xlsx'; startDate?: string; endDate?: string },
    user?: { permissions?: string[] } | null,
  ): Promise<DownloadFile> {
    let collectorName: string;
    let collectorWhere: Prisma.SpecimenWhereInput;

    if (key.startsWith('user:')) {
      const userId = key.slice(5);
      const found = await this.prisma.user
        .findUnique({ where: { id: userId }, select: { name: true } })
        .catch(() => null);
      if (!found) throw new NotFoundException('Recolector no encontrado');
      collectorName = found.name;
      collectorWhere = { collectors: { some: { userId } } };
    } else if (key.startsWith('name:') && key.length > 5) {
      collectorName = key.slice(5).trim();
      collectorWhere = {
        otherCollectors: { contains: collectorName, mode: 'insensitive' },
      };
    } else {
      throw new BadRequestException('Recolector no válido');
    }

    const dateFilter: Prisma.DateTimeNullableFilter = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate)
      dateFilter.lte = new Date(`${query.endDate.slice(0, 10)}T23:59:59.999Z`);

    const specimens = await this.prisma.specimen.findMany({
      where: {
        ...collectorWhere,
        ...(!canSeeInactive(user) && { isActive: true }),
        ...((query.startDate || query.endDate) && {
          collectionDate: dateFilter,
        }),
      },
      include: {
        ...taxonomyInclude,
        location: {
          include: { municipality: { include: { department: true } } },
        },
        project: { select: { name: true } },
      },
      orderBy: [
        { collectionDate: { sort: 'asc', nulls: 'last' } },
        { catalogNumber: 'asc' },
      ],
    });

    // Un nombre en texto también podría ser parte de otro ("Ana" en "Ana María"): se valida exacto
    const rows: CollectorReportRow[] = specimens
      .filter(
        (s) =>
          !key.startsWith('name:') ||
          (s.otherCollectors ?? '')
            .split('|')
            .some(
              (n) => n.trim().toLowerCase() === collectorName.toLowerCase(),
            ),
      )
      .map((s) => {
        const t = resolveTaxonomy(s);
        return {
          catalogNumber: s.catalogNumber,
          scientificName: s.scientificName,
          commonName: s.commonName,
          family: t.family?.name ?? null,
          order: t.order?.name ?? null,
          date: formatDate(s.collectionDate),
          year: s.collectionDate?.getUTCFullYear() ?? s.collectionYear,
          department: s.location?.municipality?.department?.name ?? null,
          municipality: s.location?.municipality?.name ?? null,
          locality: s.location?.name ?? null,
          latitude: s.latitude != null ? Number(s.latitude) : null,
          longitude: s.longitude != null ? Number(s.longitude) : null,
          project: s.project?.name ?? null,
          isActive: s.isActive,
        };
      });

    const from = formatDate(query.startDate ? new Date(query.startDate) : null);
    const to = formatDate(query.endDate ? new Date(query.endDate) : null);
    const period =
      from && to
        ? `Colectadas del ${from} al ${to}`
        : from
          ? `Colectadas desde el ${from}`
          : to
            ? `Colectadas hasta el ${to}`
            : 'Todas las fechas de colecta';

    const data = {
      collection: await this.collectionName(),
      collector: collectorName,
      period,
      rows,
    };
    const format = query.format ?? 'pdf';
    const name = `recolector_${slug(collectorName)}_${new Date().toISOString().slice(0, 10)}`;
    return format === 'xlsx'
      ? {
          buffer: await collectorReportXlsx(data),
          filename: `${name}.xlsx`,
          contentType: XLSX,
        }
      : {
          buffer: await collectorReportPdf(data),
          filename: `${name}.pdf`,
          contentType: 'application/pdf',
        };
  }
}
