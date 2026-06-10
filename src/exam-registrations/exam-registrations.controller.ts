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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateExamRegistrationDto } from './dto/create-exam-registration.dto';
import { QueryExamRegistrationDto } from './dto/query-exam-registration.dto';
import { UpdateExamRegistrationDto } from './dto/update-exam-registration.dto';
import { ExamRegistrationsService } from './exam-registrations.service';

@ApiTags('Exam Registrations')
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller('exam-registrations')
export class ExamRegistrationsController {
  constructor(
    private readonly examRegistrationsService: ExamRegistrationsService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a new exam registration' })
  @ApiResponse({
    status: 201,
    description: 'Exam registration created successfully.',
  })
  create(@Body() dto: CreateExamRegistrationDto) {
    return this.examRegistrationsService.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get exam registrations with pagination and filters',
  })
  findAll(@Query() query: QueryExamRegistrationDto) {
    return this.examRegistrationsService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get an exam registration by ID',
  })
  @ApiResponse({ status: 404, description: 'Exam registration not found.' })
  findOne(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.examRegistrationsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an exam registration' })
  update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: UpdateExamRegistrationDto,
  ) {
    return this.examRegistrationsService.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Soft-delete an exam registration' })
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.examRegistrationsService.remove(id);
  }
}
