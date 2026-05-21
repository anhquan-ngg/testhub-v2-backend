import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { UpdateExamDto } from './dto/update-exam.dto';
import { QueryExamDto } from './dto/query-exam.dto';
import { AddExamQuestionDto } from './dto/add-exam-question.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@ApiTags('Exams')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exam (lecturer_id from JWT)' })
  @ApiResponse({ status: 201, description: 'Exam created successfully.' })
  create(@Req() req: any, @Body() dto: CreateExamDto) {
    return this.examsService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get exams with pagination and filters' })
  findAll(@Query() query: QueryExamDto) {
    return this.examsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get an exam by ID (includes questions, topic, lecturer)' })
  @ApiResponse({ status: 404, description: 'Exam not found.' })
  findOne(@Param('id') id: string) {
    return this.examsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exam' })
  update(@Param('id') id: string, @Body() dto: UpdateExamDto) {
    return this.examsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an exam' })
  remove(@Param('id') id: string) {
    return this.examsService.remove(id);
  }

  // ── Question management ────────────────────────────────────────────────────

  @Post(':id/questions')
  @ApiOperation({ summary: 'Add a question to the exam' })
  @ApiResponse({ status: 409, description: 'Question already in exam.' })
  addQuestion(@Param('id') id: string, @Body() dto: AddExamQuestionDto) {
    return this.examsService.addQuestion(id, dto.question_id);
  }

  @Delete(':id/questions/:questionId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a question from the exam' })
  @ApiResponse({ status: 404, description: 'Question not found in exam.' })
  removeQuestion(
    @Param('id') id: string,
    @Param('questionId') questionId: string,
  ) {
    return this.examsService.removeQuestion(id, questionId);
  }
}
