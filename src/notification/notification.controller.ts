import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationGateway } from './notification.gateway';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@Controller('notification')
export class NotificationController {
  constructor(
    private readonly notificationService: NotificationService,
    private readonly notificationGateway: NotificationGateway,
  ) {}

  // ─── Notification CRUD ────────────────────────────────────────────────────

  @UseGuards(JwtAuthGuard)
  @Get('/history')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get notification history (paginated)' })
  async getHistory(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user?.id;
    return this.notificationService.getAll(
      userId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('/unread-count')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count' })
  async getUnreadCount(@Req() req: any) {
    const userId = req.user?.id;
    const count = await this.notificationService.countUnread(userId);
    return { count };
  }

  // ─── Exam Registration + Notification ─────────────────────────────────────

  /**
   * Student requests to join an exam → notify lecturer
   */
  @UseGuards(JwtAuthGuard)
  @Post('/exam/request-registration')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Student requests exam registration' })
  async requestRegistration(@Req() req: any, @Body() body: { examId: string }) {
    const studentId = req.user?.id;
    const { examId } = body;

    // Create registration with PENDING status
    const registration = await this.notificationService.createExamRegistration(
      examId,
      studentId,
      'PENDING',
    );

    // Find exam to get lecturer info
    const exam = await this.notificationService.findExamWithLecturer(examId);
    if (!exam) throw new Error('Exam not found');

    const student = await this.notificationService.findUser(studentId);
    const studentName = student?.full_name || 'Sinh viên';

    // Send notification to lecturer
    await this.notificationGateway.sendToUser(exam.lecturer_id, {
      user: { connect: { id: exam.lecturer_id } },
      title: 'Yêu cầu tham gia bài thi',
      content: `${studentName} yêu cầu tham gia bài thi "${exam.title}"`,
      type: 'INFO',
      link: '/lecturer/exams',
    });

    // Emit exam event to lecturer for real-time UI update
    this.notificationGateway.emitExamEvent(
      exam.lecturer_id,
      'exam:registration_requested',
      {
        examId: exam.id,
        examTitle: exam.title,
        studentId,
        studentName,
        registrationId: registration.id,
      },
    );

    // Push admin dashboard update
    const metrics = await this.notificationService.getDashboardMetrics();
    this.notificationGateway.pushAdminDashboardUpdate(metrics);

    return registration;
  }

  /**
   * Lecturer approves a registration → notify student
   */
  @UseGuards(JwtAuthGuard)
  @Post('/exam/approve-registration')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lecturer approves exam registration' })
  async approveRegistration(@Body() body: { registrationId: string }) {
    const { registrationId } = body;

    // Update registration status
    const registration =
      await this.notificationService.updateExamRegistrationStatus(
        registrationId,
        'APPROVED',
      );

    const studentId = registration.student.id;
    const examTitle = registration.exam.title;

    // Send notification to student
    await this.notificationGateway.sendToUser(studentId, {
      user: { connect: { id: studentId } },
      title: 'Đăng ký bài thi được chấp nhận',
      content: `Yêu cầu tham gia bài thi "${examTitle}" đã được chấp nhận`,
      type: 'SUCCESS',
      link: '/home',
    });

    // Emit exam event to student for real-time UI update
    this.notificationGateway.emitExamEvent(
      studentId,
      'exam:registration_approved',
      {
        examId: registration.exam.id,
        examTitle,
        registrationId,
      },
    );

    return registration;
  }

  /**
   * Lecturer manually adds a student to an exam → notify student
   */
  @UseGuards(JwtAuthGuard)
  @Post('/exam/add-student')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Lecturer adds student to exam directly' })
  async addStudentToExam(
    @Body() body: { examId: string; studentEmail: string },
  ) {
    const { examId, studentEmail } = body;

    // Find the exam
    const exam = await this.notificationService.findExamWithLecturer(examId);
    if (!exam) throw new Error('Exam not found');

    // Find student by email — use internalPrisma via service
    const student = await this.findStudentByEmail(studentEmail);
    if (!student) {
      return { error: 'Không tìm thấy sinh viên với email này.' };
    }

    // Create registration with APPROVED status
    const registration = await this.notificationService.createExamRegistration(
      examId,
      student.id,
      'APPROVED',
    );

    // Send notification to student
    await this.notificationGateway.sendToUser(student.id, {
      user: { connect: { id: student.id } },
      title: 'Được thêm vào bài thi',
      content: `Bạn đã được thêm vào bài thi "${exam.title}" bởi giảng viên ${exam.lecturer.full_name}`,
      type: 'INFO',
      link: '/home',
    });

    // Emit exam event to student for real-time UI update
    this.notificationGateway.emitExamEvent(student.id, 'exam:student_added', {
      examId: exam.id,
      examTitle: exam.title,
    });

    // Push admin dashboard update
    const metrics = await this.notificationService.getDashboardMetrics();
    this.notificationGateway.pushAdminDashboardUpdate(metrics);

    return registration;
  }

  private async findStudentByEmail(email: string) {
    // Use internal prisma to find student
    return this.notificationService.findUserByEmail(email, 'STUDENT');
  }
}
