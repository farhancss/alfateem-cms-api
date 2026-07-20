import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PostsService } from './posts.service';
import {
  CreateCategoryDto,
  CreatePostDto,
  PostQueryDto,
  UpdateCategoryDto,
  UpdatePostDto,
} from './dto/post.dto';

@ApiTags('Posts')
@Controller('posts')
export class PostsController {
  constructor(private readonly posts: PostsService) {}

  // Categories (declared before :slug so "categories" isn't captured as a slug)
  @Public()
  @Get('categories')
  @ApiOperation({ summary: 'Public: list categories' })
  listCategories() {
    return this.posts.listCategories();
  }

  @ApiBearerAuth('access-token')
  @Post('categories')
  @ApiOperation({ summary: 'Create a category (EDITOR+)' })
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.posts.createCategory(dto);
  }

  @ApiBearerAuth('access-token')
  @Patch('categories/:slug')
  @ApiOperation({ summary: 'Update a category (EDITOR+)' })
  updateCategory(@Param('slug') slug: string, @Body() dto: UpdateCategoryDto) {
    return this.posts.updateCategory(slug, dto);
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Delete('categories/:slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete an empty category (ADMIN)' })
  removeCategory(@Param('slug') slug: string) {
    return this.posts.removeCategory(slug);
  }

  // Posts
  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: list posts (filter by category, published, search)' })
  findAll(@Query() query: PostQueryDto) {
    return this.posts.findAll(query);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public: a single post by slug' })
  findOne(@Param('slug') slug: string) {
    return this.posts.findBySlug(slug);
  }

  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Create a post (EDITOR+)' })
  create(@Body() dto: CreatePostDto) {
    return this.posts.create(dto);
  }

  @ApiBearerAuth('access-token')
  @Patch(':slug')
  @ApiOperation({ summary: 'Update a post (EDITOR+)' })
  update(@Param('slug') slug: string, @Body() dto: UpdatePostDto) {
    return this.posts.update(slug, dto);
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Delete(':slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a post (ADMIN)' })
  remove(@Param('slug') slug: string) {
    return this.posts.remove(slug);
  }
}
