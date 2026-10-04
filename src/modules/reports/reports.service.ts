import { Injectable } from '@nestjs/common';
import { publicUserSelect } from '../../common/prisma/user-select';
import { PrismaService } from '../../database/prisma.service';
import { Prisma } from '@prisma/client';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { hasPermission } from '../permissions/permissions.logic';
import { UserRole } from '../users/enums/user-role.enum';
import { CHAIRA_PROVIDER } from '../auth/chaira/chaira.constants';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Resumen para el dashboard del panel, según lo que el usuario puede ver:
   * las muestras inactivas solo cuentan con el permiso specimens.status.
   */
  async getDashboard(user: {
    id: string;
    permissions?: string[];
    role?: { name: string } | null;
  }) {
    const canSeeInactive = hasPermission(
      user.permissions,
      PERMISSIONS.SPECIMENS_STATUS,
    );
    const visible: Prisma.SpecimenWhereInput = canSeeInactive
      ? {}
      : { isActive: true };
    const visibleComments: Prisma.CommentWhereInput = canSeeInactive
      ? {}
      : { specimen: { isActive: true } };

    const [
      total,
      active,
      inactive,
      mine,
      withoutImages,
      projects,
      collectors,
      comments,
      recentSpecimens,
      recentComments,
    ] = await Promise.all([
      this.prisma.specimen.count({ where: visible }),
      this.prisma.specimen.count({ where: { isActive: true } }),
      canSeeInactive
        ? this.prisma.specimen.count({ where: { isActive: false } })
        : Promise.resolve(null),
      this.prisma.specimen.count({
        where: { ...visible, createdById: user.id },
      }),
      this.prisma.specimen.count({
        where: { ...visible, images: { none: { isActive: true } } },
      }),
      this.prisma.project.count({ where: { isActive: true } }),
      this.prisma.user.count({ where: { isActive: true, isCollector: true } }),
      this.prisma.comment.count({ where: visibleComments }),
      this.prisma.specimen.findMany({
        where: visible,
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          scientificName: true,
          commonName: true,
          catalogNumber: true,
          isActive: true,
          createdAt: true,
          createdBy: { select: publicUserSelect },
          images: {
            where: { isActive: true },
            orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }],
            take: 1,
            select: { id: true },
          },
        },
      }),
      this.prisma.comment.findMany({
        where: visibleComments,
        orderBy: { createdAt: 'desc' },
        take: 5,
        select: {
          id: true,
          text: true,
          createdAt: true,
          user: { select: publicUserSelect },
          specimen: { select: { id: true, scientificName: true } },
        },
      }),
    ]);

    return {
      specimens: { total, active, inactive, mine, withoutImages },
      projects,
      collectors,
      comments,
      recentSpecimens: recentSpecimens.map(({ images, ...specimen }) => ({
        ...specimen,
        primaryImageId: images[0]?.id ?? null,
      })),
      recentComments,
      // Solo para el admin: ingresos con Chairá (cada ingreso crea un "Visitante Chairá N")
      chaira:
        user.role?.name === UserRole.ADMIN ? await this.chairaStats() : null,
    };
  }

  private async chairaStats() {
    const [logins, completed, last] = await Promise.all([
      this.prisma.user.count({ where: { authProvider: CHAIRA_PROVIDER } }),
      // Completadas: ya tienen correo real y contraseña
      this.prisma.user.count({
        where: { authProvider: CHAIRA_PROVIDER, password: { not: null } },
      }),
      this.prisma.user.findFirst({
        where: { authProvider: CHAIRA_PROVIDER },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      }),
    ]);
    return { logins, completed, lastLoginAt: last?.createdAt ?? null };
  }

  /**
   * Estadísticas públicas de la colección (solo muestras activas).
   * Se calculan en memoria: la jerarquía puede salir de especie, género o familia.
   */
  async getStatistics() {
    const named = { select: { name: true } } as const;
    const orderChain = { select: { name: true } } as const;
    const familyChain = { select: { name: true, order: orderChain } } as const;
    const genusChain = { select: { name: true, family: familyChain } } as const;

    const [specimens, collectorUsers, withImages] = await Promise.all([
      this.prisma.specimen.findMany({
        where: { isActive: true },
        select: {
          speciesId: true,
          collectionYear: true,
          collectionDate: true,
          source: true,
          otherCollectors: true,
          species: { select: { genus: genusChain } },
          genus: genusChain,
          family: familyChain,
          location: {
            select: { municipality: { select: { department: named } } },
          },
          collectors: { select: { userId: true } },
        },
      }),
      this.prisma.user.count({ where: { isActive: true, isCollector: true } }),
      this.prisma.specimen.count({
        where: { isActive: true, images: { some: { isActive: true } } },
      }),
    ]);

    const tally = () => new Map<string, number>();
    const add = (map: Map<string, number>, key: string | null | undefined) => {
      if (key) map.set(key, (map.get(key) ?? 0) + 1);
    };
    const top = (map: Map<string, number>, limit?: number) => {
      const list = [...map]
        .map(([name, count]) => ({ name, count }))
        .sort(
          (a, b) => b.count - a.count || a.name.localeCompare(b.name, 'es'),
        );
      if (!limit || list.length <= limit) return list;
      const rest = list.slice(limit).reduce((sum, item) => sum + item.count, 0);
      return [...list.slice(0, limit), { name: 'Otras', count: rest }];
    };

    const byFamily = tally();
    const byOrder = tally();
    const byDepartment = tally();
    const byYear = tally();
    const levels = {
      Especie: 0,
      'Solo género': 0,
      'Solo familia': 0,
      'Sin taxonomía': 0,
    };
    const families = new Set<string>();
    const genera = new Set<string>();
    const species = new Set<string>();
    const textCollectors = new Set<string>();
    const userCollectors = new Set<string>();

    for (const s of specimens) {
      const genus = s.species?.genus ?? s.genus;
      const family = genus?.family ?? s.family;
      add(byFamily, family?.name);
      add(byOrder, family?.order?.name);
      add(
        byDepartment,
        s.location?.municipality?.department?.name ?? 'Sin ubicación',
      );
      const year = s.collectionDate?.getUTCFullYear() ?? s.collectionYear;
      add(byYear, year ? String(year) : null);
      if (family) families.add(family.name);
      if (genus) genera.add(genus.name);
      if (s.speciesId) species.add(s.speciesId);
      levels[
        s.species
          ? 'Especie'
          : s.genus
            ? 'Solo género'
            : s.family
              ? 'Solo familia'
              : 'Sin taxonomía'
      ]++;
      s.collectors.forEach((c) => userCollectors.add(c.userId));
      (s.otherCollectors ?? '')
        .split('|')
        .forEach((n) => n.trim() && textCollectors.add(n.trim().toLowerCase()));
    }

    return {
      totals: {
        specimens: specimens.length,
        families: families.size,
        genera: genera.size,
        species: species.size,
        collectors:
          Math.max(collectorUsers, userCollectors.size) + textCollectors.size,
        withImages,
      },
      byFamily: top(byFamily, 12),
      byOrder: top(byOrder, 10),
      byDepartment: top(byDepartment),
      byYear: [...byYear]
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => Number(a.name) - Number(b.name)),
      byTaxonLevel: Object.entries(levels).map(([name, count]) => ({
        name,
        count,
      })),
    };
  }
}
