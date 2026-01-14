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
import { UserRole } from '../users/enums/user-role.enum';

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
    return this.commentsService.create(dto, user.id);
  }

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Get comments by specimen ID',
    description: 'Returns all comments for a specimen. Public endpoint.',
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
  findBySpecimen(@Query('specimenId') specimenId: string) {
    return this.commentsService.findBySpecimen(specimenId);
  }

  @Public()
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
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Patch(':id')
  @ApiOperation({
    summary: 'Update a comment',
    description: 'Updates comment text. Owner can update their own comments, ADMIN can update any.',
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
    @Body('text') text: string,
    @CurrentUser() user: UserEntity,
  ) {
    const isAdmin = user.role?.name === UserRole.ADMIN;
    return this.commentsService.update(id, text, user.id, isAdmin);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Delete(':id')
  @ApiOperation({
    summary: 'Delete a comment',
    description: 'Soft deletes a comment. Owner can delete their own comments, ADMIN can delete any.',
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
    const isAdmin = user.role?.name === UserRole.ADMIN;
    return this.commentsService.remove(id, user.id, isAdmin);
  }
}
