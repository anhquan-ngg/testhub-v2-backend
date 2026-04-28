import {
  Injectable,
  OnModuleInit,
  Inject,
  Optional,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { PrismaService } from './prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class PrismaHooksService implements OnApplicationBootstrap {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly moduleRef: ModuleRef,
  ) {}

  onApplicationBootstrap() {
    // Wait for other modules to be fully initialized before setting up hooks
    this.setupDashboardUpdateMiddleware();

    console.log('Prisma hooks service initialized');
  }

  private setupDashboardUpdateMiddleware() {
    // Setup Prisma middleware to listen for Exam and Question create/update
    (this.prismaService as any).$use(async (params: any, next: any) => {
      const result = await next(params);

      // Check if this is a create or update operation on Exam or Question
      const isExamOperation =
        params.model === 'Exam' &&
        (params.action === 'create' ||
          params.action === 'update' ||
          params.action === 'delete');
      const isQuestionOperation =
        params.model === 'Question' &&
        (params.action === 'create' ||
          params.action === 'update' ||
          params.action === 'delete');
      const isUserOperation =
        params.model === 'User' &&
        (params.action === 'create' || params.action === 'delete');
      const isSubmissionOperation =
        params.model === 'Submission' &&
        (params.action === 'create' ||
          params.action === 'update' ||
          params.action === 'delete');

      if (
        isExamOperation ||
        isQuestionOperation ||
        isUserOperation ||
        isSubmissionOperation
      ) {
        // Delay to avoid race conditions with database updates
        setTimeout(async () => {
          try {
            // Lazy load NotificationGateway to avoid circular dependency
            const notificationGateway = this.moduleRef.get(
              NotificationGateway,
              {
                strict: false,
              },
            );
            const notificationService = this.moduleRef.get(
              NotificationService,
              {
                strict: false,
              },
            );

            if (notificationGateway && notificationService) {
              const metrics = await notificationService.getDashboardMetrics();
              notificationGateway.pushAdminDashboardUpdate(metrics);
              console.log(
                `Dashboard update sent after ${params.model} ${params.action}`,
              );
            }
          } catch (error) {
            console.error('Error pushing dashboard update:', error);
          }
        }, 100);
      }

      return result;
    });
  }
}
