import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { SubmissionService } from './submission.service';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StartExamDto } from './dto/start-exam.dto';
import { SubmitQuestionDto } from './dto/submit-question.dto';
import { SubmitExamDto } from './dto/submit-exam.dto';

@Controller('submission')
export class SubmissionController {
  constructor(private readonly submissionService: SubmissionService) {}

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/start-exam')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Start an exam' })
  @ApiResponse({ status: 200, description: 'Exam started successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  async startExam(@Body() startExamDto: StartExamDto) {
    return this.submissionService.startExam(startExamDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/submit-by-question')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit a question of exam' })
  @ApiResponse({ status: 200, description: 'Question submitted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  async submitQuestion(@Body() submitQuestionDto: SubmitQuestionDto) {
    return this.submissionService.submitByQuestion(submitQuestionDto);
  }

  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @Post('/submit-exam')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Submit an exam' })
  @ApiResponse({ status: 200, description: 'Exam submitted successfully.' })
  @ApiResponse({ status: 401, description: 'Unauthorized - No valid token' })
  async submitExam(@Body() submitExamDto: SubmitExamDto) {
    return this.submissionService.submitByExam(submitExamDto);
  }
}
