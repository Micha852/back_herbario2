import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service';
import { publicUserSelect } from '../../common/prisma/user-select';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCommentDto, userId: string) {
    // Verify specimen exists
    const specimen = await this.prisma.specimen.findUnique({
      where: { id: dto.specimenId },
    });

    if (!specimen) {
      throw new NotFoundException(
        `Specimen with ID ${dto.specimenId} not found`,
      );
    }

    return this.prisma.comment.create({
      data: {
        text: dto.text,
        specimenId: dto.specimenId,
        userId,
      },
      include: { user: { select: publicUserSelect }, specimen: true },
    });
  }

  async findBySpecimen(specimenId: string) {
    return this.prisma.comment.findMany({
      where: { specimenId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: publicUserSelect } },
    });
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { user: { select: publicUserSelect }, specimen: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  async update(id: string, text: string, userId: string, isAdmin = false) {
    const comment = await this.findOne(id);

    // Only owner or admin can update
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    return this.prisma.comment.update({
      where: { id },
      data: { text },
      include: { user: { select: publicUserSelect } },
    });
  }

  async remove(id: string, userId: string, isAdmin = false) {
    const comment = await this.findOne(id);

    // Only owner or admin can delete
    if (comment.userId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    await this.prisma.comment.delete({
      where: { id },
    });

    return { message: 'Comment deleted successfully' };
  }
}
