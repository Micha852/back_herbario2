import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserEntity } from '../users/entities/user.entity';
import { PERMISSIONS } from '../permissions/permissions.constants';
import { hasPermission } from '../permissions/permissions.logic';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';

/** Ve comentarios de muestras inactivas quien puede ver muestras inactivas */
const isStaff = (user: UserEntity | null) => hasPermission(user?.permissions, PERMISSIONS.SPECIMENS_STATUS);

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post()
  @ApiOperation({
    summary: 'Create a new comment',
    description: 'Creates a comment on a specimen. Requires authentication.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Comment created successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Specimen not found',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  create(@Body() dto: CreateCommentDto, @CurrentUser() user: UserEntity) {
    return this.commentsService.create(dto, user.id, isStaff(user));
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  @ApiOperation({
    summary: 'Get comments by specimen ID',
    description: 'Returns all comments for a specimen. Public endpoint (inactive specimens only for ADMIN/COLLABORATOR).',
  })
  @ApiQuery({
    name: 'specimenId',
    required: true,
    description: 'Specimen UUID',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comments retrieved successfully',
  })
  findBySpecimen(
    @Query('specimenId', new ParseUUIDPipe()) specimenId: string,
    @CurrentUser() user: UserEntity | null,
  ) {
    return this.commentsService.findBySpecimen(specimenId, isStaff(user));
  }

  @Public()
  @UseGuards(OptionalJwtAuthGuard)
  @Get(':id')
  @ApiOperation({
    summary: 'Get comment by ID',
    description: 'Returns a specific comment. Public endpoint.',
  })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
  })
  findOne(@Param('id') id: string, @CurrentUser() user: UserEntity | null) {
    return this.commentsService.findOne(id, isStaff(user));
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Updates comment text. Only the author can edit their own comment.',
  })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment updated successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to update this comment',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCommentDto,
    @CurrentUser() user: UserEntity,
  ) {
    return this.commentsService.update(id, dto.text, user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Deletes a comment. The author can delete their own comments; users with comments.moderate can delete any.',
  })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comment deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Comment not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Not authorized to delete this comment',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Not authenticated',
  })
  remove(@Param('id') id: string, @CurrentUser() user: UserEntity) {
    // Borrar comentarios ajenos = moderación (permiso comments.moderate)
    const canModerate = hasPermission(user.permissions, PERMISSIONS.COMMENTS_MODERATE);
    return this.commentsService.remove(id, user.id, canModerate);
  }
}
