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
}
