import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { PasswordUtil } from '../../common/utils/password.util';
import { escapeHtml } from '../../common/utils/html.util';
import {
  assertEmailFree,
  withEmailConflict,
} from '../../common/utils/email.util';
import { MailService } from '../mail/mail.service';
import { UserRole } from './enums/user-role.enum';
import {
  AdminCreateUserDto,
  AdminListUsersQuery,
  AdminUpdateUserDto,
} from './dto/admin-user.dto';
import {
  adminChangeError,
  generateTemporaryPassword,
} from './users-admin.logic';
import { herbariumName } from '../../tenancy/tenant-context';

const userSelect = {
  id: true,
  name: true,
  email: true,
  isCollector: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { name: true } },
  institution: { select: { id: true, name: true } },
  gender: { select: { id: true, name: true } },
  _count: {
    select: {
      createdSpecimens: true,
      comments: true,
      permissionOverrides: true,
    },
  },
} satisfies Prisma.UserSelect;

type SelectedUser = Prisma.UserGetPayload<{ select: typeof userSelect }>;

/** Forma pública para el panel (nunca incluye la contraseña) */
function present(user: SelectedUser) {
  const { _count, role, ...rest } = user;
  return {
    ...rest,
    role: role.name,
    stats: { specimens: _count.createdSpecimens, comments: _count.comments },
    hasCustomPermissions:
      role.name === UserRole.COLLABORATOR && _count.permissionOverrides > 0,
  };
}

/**
 * Gestión de usuarios desde el panel (solo ADMINISTRADOR).
 * Separado de UsersService, que usan el login y el perfil.
 */
@Injectable()
export class UsersAdminService {
  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
  ) {}

  async list(query: AdminListUsersQuery) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 25));
    const search = query.search?.trim();

    const where: Prisma.UserWhereInput = {
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(query.role && { role: { name: query.role } }),
      ...(query.isActive !== undefined &&
        query.isActive !== '' && { isActive: query.isActive === 'true' }),
      ...(query.isCollector !== undefined &&
        query.isCollector !== '' && {
          isCollector: query.isCollector === 'true',
        }),
    };

    const [users, total, roleCounts] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: userSelect,
        orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
      this.prisma.role.findMany({
        select: { name: true, _count: { select: { users: true } } },
      }),
    ]);

    return {
      data: users.map(present),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      roles: Object.fromEntries(
        roleCounts.map((r) => [r.name, r._count.users]),
      ),
    };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
    if (!user)
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);
    return present(user);
  }

  private async roleId(name: string): Promise<string> {
    const role = await this.prisma.role.findUnique({ where: { name } });
    if (!role)
      throw new BadRequestException(
        `El rol ${name} no existe en la base de datos`,
      );
    return role.id;
  }

  /** Envía las credenciales (sin SMTP en desarrollo: se muestran en la consola del back) */
  private async sendCredentials(
    to: string,
    name: string,
    password: string,
    isNew: boolean,
  ) {
    try {
      await this.mailService.sendMail({
        to,
        subject: isNew
          ? `Tu cuenta en ${herbariumName()}`
          : `Nueva contraseña temporal - ${herbariumName()}`,
        html: `
          <h2>${isNew ? 'Bienvenido(a) al Herbario Digital' : 'Restablecimiento de contraseña'}</h2>
          <p>Hola ${escapeHtml(name)},</p>
          <p>${isNew ? 'Un administrador creó tu cuenta.' : 'Un administrador restableció tu contraseña.'}</p>
          <p>Correo: <strong>${escapeHtml(to)}</strong><br>Contraseña temporal: <strong>${password}</strong></p>
          <p>Inicia sesión y cámbiala desde "Mi perfil".</p>
          <br><p>${escapeHtml(herbariumName())}</p>
        `,
      });
      return true;
    } catch {
      return false;
    }
  }

  async create(dto: AdminCreateUserDto) {
    await assertEmailFree(this.prisma, dto.email);
    const roleId = await this.roleId(dto.role);
    const temporaryPassword = dto.password ? null : generateTemporaryPassword();
    const password = await PasswordUtil.hash(
      dto.password ?? temporaryPassword!,
    );

    const user = await withEmailConflict(
      this.prisma.user.create({
        data: {
          name: dto.name,
          email: dto.email,
          password,
          roleId,
          isCollector: dto.isCollector ?? false,
          institutionId: dto.institutionId,
          genderId: dto.genderId,
        },
        select: userSelect,
      }),
    );

    const emailSent = temporaryPassword
      ? await this.sendCredentials(
          user.email,
          user.name,
          temporaryPassword,
          true,
        )
      : false;

    // La contraseña temporal se devuelve UNA sola vez para que el admin pueda compartirla
    return { user: present(user), temporaryPassword, emailSent };
  }

  async update(id: string, dto: AdminUpdateUserDto, actorId: string) {
    const current = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, isActive: true, role: { select: { name: true } } },
    });
    if (!current)
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);

    const activeAdmins = await this.prisma.user.count({
      where: { isActive: true, role: { name: UserRole.ADMIN } },
    });
    const error = adminChangeError({
      actorId,
      targetId: id,
      currentRole: current.role.name,
      currentIsActive: current.isActive,
      newRole: dto.role,
      newIsActive: dto.isActive,
      activeAdmins,
    });
    if (error) throw new BadRequestException(error);

    if (dto.email) await assertEmailFree(this.prisma, dto.email, id);
    const roleChanged =
      dto.role !== undefined && dto.role !== current.role.name;

    const data: Prisma.UserUpdateInput = {
      ...(dto.name !== undefined && { name: dto.name }),
      ...(dto.email !== undefined && { email: dto.email }),
      ...(dto.isCollector !== undefined && { isCollector: dto.isCollector }),
      ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      ...(dto.institutionId !== undefined && {
        institution: { connect: { id: dto.institutionId } },
      }),
      ...(dto.genderId !== undefined && {
        gender: { connect: { id: dto.genderId } },
      }),
      ...(roleChanged && {
        role: { connect: { id: await this.roleId(dto.role!) } },
      }),
    };

    const [user] = await withEmailConflict(
      this.prisma.$transaction([
        this.prisma.user.update({ where: { id }, data, select: userSelect }),
        // Al cambiar de rol se descartan los ajustes de permisos (arranca con los del rol nuevo)
        ...(roleChanged
          ? [this.prisma.userPermission.deleteMany({ where: { userId: id } })]
          : []),
      ]),
    );
    return present(user);
  }

  /** Genera una contraseña temporal, la envía por correo y la devuelve una vez al admin */
  async resetPassword(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });
    if (!user)
      throw new NotFoundException(`Usuario con ID ${id} no encontrado`);

    const temporaryPassword = generateTemporaryPassword();
    await this.prisma.user.update({
      where: { id },
      data: { password: await PasswordUtil.hash(temporaryPassword) },
    });
    const emailSent = await this.sendCredentials(
      user.email,
      user.name,
      temporaryPassword,
      false,
    );
    return { temporaryPassword, emailSent };
  }
}
