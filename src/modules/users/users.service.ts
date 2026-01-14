import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserEntity } from './entities/user.entity';
import { PasswordUtil } from '../../common/utils/password.util';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new user
   */
  async create(createUserDto: CreateUserDto): Promise<UserEntity> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: createUserDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already exists');
    }

    // Validate password strength
    const passwordValidation = PasswordUtil.validateStrength(
      createUserDto.password,
    );
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Hash password
    const hashedPassword = await PasswordUtil.hash(createUserDto.password);

    // Get default visitor role if no role provided
    let roleId = createUserDto.roleId;
    if (!roleId) {
      const visitorRole = await this.prisma.role.findFirst({
        where: { name: 'VISITANTE' },
      });
      if (!visitorRole) {
        throw new BadRequestException('Default visitor role not found');
      }
      roleId = visitorRole.id;
    }

    // Create user
    const user = await this.prisma.user.create({
      data: {
        name: createUserDto.name,
        email: createUserDto.email,
        password: hashedPassword,
        roleId,
        genderId: createUserDto.genderId,
        typeId: createUserDto.typeId,
        institutionId: createUserDto.institutionId,
        isCollector: createUserDto.isCollector || false,
        isActive: createUserDto.isActive !== undefined ? createUserDto.isActive : true,
      },
      include: {
        role: true,
        gender: true,
        type: true,
        institution: true,
      },
    });

    return new UserEntity(user);
  }

  /**
   * Find all users (with optional filters)
   */
  async findAll(filters?: {
    isActive?: boolean;
    isCollector?: boolean;
    roleId?: string;
  }): Promise<UserEntity[]> {
    const users = await this.prisma.user.findMany({
      where: {
        ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
        ...(filters?.isCollector !== undefined && {
          isCollector: filters.isCollector,
        }),
        ...(filters?.roleId && { roleId: filters.roleId }),
      },
      include: {
        role: true,
        gender: true,
        type: true,
        institution: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users.map((user) => new UserEntity(user));
  }

  /**
   * Find one user by ID
   */
  async findOne(id: string): Promise<UserEntity> {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        role: true,
        gender: true,
        type: true,
        institution: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return new UserEntity(user);
  }

  /**
   * Find user by email (for authentication)
   */
  async findByEmail(email: string): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        gender: true,
        type: true,
        institution: true,
      },
    });

    return user ? new UserEntity(user) : null;
  }

  /**
   * Update user
   */
  async update(id: string, updateUserDto: UpdateUserDto): Promise<UserEntity> {
    // Check if user exists
    await this.findOne(id);

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...(updateUserDto.name && { name: updateUserDto.name }),
        ...(updateUserDto.roleId && { roleId: updateUserDto.roleId }),
        ...(updateUserDto.genderId && { genderId: updateUserDto.genderId }),
        ...(updateUserDto.typeId && { typeId: updateUserDto.typeId }),
        ...(updateUserDto.institutionId && {
          institutionId: updateUserDto.institutionId,
        }),
        ...(updateUserDto.isCollector !== undefined && {
          isCollector: updateUserDto.isCollector,
        }),
        ...(updateUserDto.isActive !== undefined && {
          isActive: updateUserDto.isActive,
        }),
      },
      include: {
        role: true,
        gender: true,
        type: true,
        institution: true,
      },
    });

    return new UserEntity(user);
  }

  /**
   * Soft delete user (deactivate)
   */
  async remove(id: string): Promise<void> {
    await this.findOne(id);

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Change user password
   */
  async changePassword(
    id: string,
    oldPassword: string,
    newPassword: string,
  ): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Verify old password
    const isPasswordValid = await PasswordUtil.compare(
      oldPassword,
      user.password!,
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Invalid old password');
    }

    // Validate new password strength
    const passwordValidation = PasswordUtil.validateStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new BadRequestException(passwordValidation.errors);
    }

    // Hash and update password
    const hashedPassword = await PasswordUtil.hash(newPassword);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Get collectors
   */
  async getCollectors(): Promise<UserEntity[]> {
    return this.findAll({ isCollector: true, isActive: true });
  }

  /**
   * Update password directly (for password recovery)
   */
  async updatePassword(id: string, hashedPassword: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  }

  /**
   * Deactivate own profile
   */
  async deactivateProfile(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  /**
   * Validate user credentials (for authentication)
   */
  async validateCredentials(
    email: string,
    password: string,
  ): Promise<UserEntity | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        gender: true,
        type: true,
        institution: true,
      },
    });

    if (!user || !user.password) {
      return null;
    }

    const isPasswordValid = await PasswordUtil.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    if (!user.isActive) {
      return null;
    }

    return new UserEntity(user);
  }
}
