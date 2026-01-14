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
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { CommentsService } from './comments.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@ApiTags('Comments')
@Controller('comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new comment' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'Comment created' })
  create(@Body() dto: CreateCommentDto) {
    // TODO: Get userId from JWT
    const userId = 'temp-user-id';
    return this.commentsService.create(dto, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get comments by specimen ID' })
  @ApiQuery({ name: 'specimenId', required: true, description: 'Specimen UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comments retrieved' })
  findBySpecimen(@Query('specimenId') specimenId: string) {
    return this.commentsService.findBySpecimen(specimenId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get comment by ID' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment retrieved' })
  findOne(@Param('id') id: string) {
    return this.commentsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a comment (owner or admin only)' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment updated' })
  update(@Param('id') id: string, @Body('text') text: string) {
    // TODO: Get userId and isAdmin from JWT
    const userId = 'temp-user-id';
    const isAdmin = false;
    return this.commentsService.update(id, text, userId, isAdmin);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment (owner or admin only)' })
  @ApiParam({ name: 'id', description: 'Comment UUID' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Comment deleted' })
  remove(@Param('id') id: string) {
    // TODO: Get userId and isAdmin from JWT
    const userId = 'temp-user-id';
    const isAdmin = false;
    return this.commentsService.remove(id, userId, isAdmin);
  }
}
