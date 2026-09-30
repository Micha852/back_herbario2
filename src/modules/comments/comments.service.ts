import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { publicUserSelect } from '../../common/prisma/user-select';
import { CreateCommentDto } from './dto/create-comment.dto';

/** Datos del comentario que se devuelven (sin la muestra completa) */
const commentInclude = {
  user: { select: publicUserSelect },
  specimen: { select: { id: true, scientificName: true, catalogNumber: true } },
} as const;

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Verifica que la muestra exista y sea visible para quien pregunta:
   * las muestras inactivas solo las ve el equipo (ADMIN/COLABORADOR).
   */
  private async assertSpecimenVisible(specimenId: string, isStaff: boolean) {
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: specimenId },
      select: { id: true, isActive: true },
    });
    if (!specimen || (!specimen.isActive && !isStaff)) {
      throw new NotFoundException(`Specimen with ID ${specimenId} not found`);
    }
  }

  async create(dto: CreateCommentDto, userId: string, isStaff = false) {
    await this.assertSpecimenVisible(dto.specimenId, isStaff);

    return this.prisma.comment.create({
      data: {
        text: dto.text,
        specimenId: dto.specimenId,
        userId,
      },
      include: commentInclude,
    });
  }

  async findBySpecimen(specimenId: string, isStaff = false) {
    await this.assertSpecimenVisible(specimenId, isStaff);

    return this.prisma.comment.findMany({
      where: { specimenId },
      orderBy: { createdAt: 'desc' },
      include: commentInclude,
    });
  }

  async findOne(id: string, isStaff = true) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { ...commentInclude, specimen: { select: { ...commentInclude.specimen.select, isActive: true } } },
    });

    if (!comment || (!comment.specimen.isActive && !isStaff)) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  /** Solo el autor puede editar su comentario (ni siquiera ADMIN edita textos ajenos) */
  async update(id: string, text: string, userId: string) {
    const comment = await this.findOne(id);

    if (comment.userId !== userId) {
      throw new ForbiddenException('Solo puedes editar tus propios comentarios');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { text },
      include: commentInclude,
    });
  }

  /** El autor o un ADMIN pueden eliminar (moderación) */
  async remove(id: string, userId: string, isAdmin = false) {
    const comment = await this.findOne(id);

    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('Solo puedes eliminar tus propios comentarios');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: 'Comment deleted successfully' };
  }
}
