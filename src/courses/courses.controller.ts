import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { CoursesService } from './courses.service';
import { CourseQueryDto, CreateCourseDto, LessonInputDto, UpdateCourseDto } from './dto/course.dto';

@ApiTags('Courses')
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: list courses (filter by track, published, search)' })
  findAll(@Query() query: CourseQueryDto) {
    return this.courses.findAll(query);
  }

  @Public()
  @Get('lessons/all')
  @ApiOperation({ summary: 'Public: all lessons flattened with parent course' })
  allLessons() {
    return this.courses.listAllLessons();
  }

  @Public()
  @Get('lessons/:slug')
  @ApiOperation({ summary: 'Public: a single lesson by slug' })
  lessonBySlug(@Param('slug') slug: string) {
    return this.courses.findLessonBySlug(slug);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public: a single course with its lessons' })
  findOne(@Param('slug') slug: string) {
    return this.courses.findBySlug(slug);
  }

  @ApiBearerAuth('access-token')
  @Post()
  @ApiOperation({ summary: 'Create a course (EDITOR+)' })
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  @ApiBearerAuth('access-token')
  @Patch(':slug')
  @ApiOperation({ summary: 'Update a course; sending lessons[] replaces the set (EDITOR+)' })
  update(@Param('slug') slug: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(slug, dto);
  }

  @ApiBearerAuth('access-token')
  @Roles(Role.ADMIN)
  @Delete(':slug')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a course and its lessons (ADMIN)' })
  remove(@Param('slug') slug: string) {
    return this.courses.remove(slug);
  }

  @ApiBearerAuth('access-token')
  @Post(':slug/lessons')
  @ApiOperation({ summary: 'Add a lesson to a course (EDITOR+)' })
  addLesson(@Param('slug') slug: string, @Body() dto: LessonInputDto) {
    return this.courses.addLesson(slug, dto);
  }

  @ApiBearerAuth('access-token')
  @Delete('lessons/:lessonId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Delete a lesson (EDITOR+)' })
  removeLesson(@Param('lessonId') lessonId: string) {
    return this.courses.removeLesson(lessonId);
  }
}
