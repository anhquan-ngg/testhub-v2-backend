import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { JwtGuard } from '@/auth/guards/jwt.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitQuestionDto } from './dto/submit-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';
import { CreateSubmissionDto } from './dto/create-submission.dto';
import { QuerySubmissionDto } from './dto/query-submission.dto';
import { UpdateSubmissionDto } from './dto/update-submission.dto';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    id: string;
    [key: string]: any;
  };
}

@ApiTags('Submissions')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('submission')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @Post()
  @ApiOperation({ summary: 'Create a submission' })
  @ApiResponse({ status: 201, description: 'Submission created successfully.' })
  create(@Body() dto: CreateSubmissionDto) {
    return this.submissionService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get submissions with pagination and filters' })
  findAll(@Query() query: QuerySubmissionDto) {
    return this.submissionService.findAll(query);
  }

  @Get('exams/:examId/session')
  @ApiOperation({ summary: 'Get active exam session for current student' })
  getExamSession(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.submissionService.getExamSession(examId, req.user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('exams/:examId/start')
  @ApiOperation({ summary: 'Start an exam for current student' })
  startExamForUser(
    @Param('examId', new ParseUUIDPipe()) examId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.submissionService.startExamForUser(examId, req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a submission by ID' })
  @ApiResponse({ status: 404, description: 'Submission not found.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.submissionService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a submission' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateSubmissionDto,
  ) {
    return this.submissionService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete a submission' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.submissionService.remove(id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/start-exam')
  @ApiOperation({ summary: 'Start an exam' })
  @ApiResponse({ status: 200, description: 'Exam started successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  async startExam(@Body() startExamDto: StartExamDto) {
    return this.submissionService.startExam(startExamDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/submit-by-question')
  @ApiOperation({ summary: 'Submit a question of exam' })
  @ApiResponse({ status: 200, description: 'Question submitted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  async submitQuestion(@Body() submitQuestionDto: SubmitQuestionDto) {
    return this.submissionService.submitByQuestion(submitQuestionDto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('/submit-exam')
  @ApiOperation({ summary: 'Submit an exam' })
  @ApiResponse({ status: 200, description: 'Exam submitted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  async submitExam(
    @Body() submitExamDto: SubmitExamDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.submissionService.submitByExam(submitExamDto, req.user.id);
  }
}
