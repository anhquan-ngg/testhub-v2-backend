import { PrismaService } from './prisma.service';
import {
  INTERNAL_PRISMA_CLIENT,
  POLICY_AWARE_PRISMA_CLIENT,
} from './prisma.constants';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationService } from '../notification/notification.service';
import { Global, Module, Provider, Scope } from '@nestjs/common';
import { REQUEST, ModuleRef } from '@nestjs/core';
import { PrismaClient } from '../../generated/prisma-client';
import { enhance } from '@zenstackhq/runtime';
import { Request } from 'express';
import { ZenStackModule } from '@zenstackhq/server/nestjs';

export * from './prisma.constants';

const prismaServiceProvider: Provider = {
  provide: PrismaService,
  inject: [ModuleRef],
  useFactory: (moduleRef: ModuleRef) => {
    const client = new PrismaClient();

    const extended = client.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Broad logging for debugging
            console.log(`[Ext] Op: ${operation}, Model: ${model || 'N/A'}`);

            const result = await query(args);

            // Dashboard update logic for Prisma 6
            const isMutation = [
              'create',
              'update',
              'delete',
              'upsert',
              'createMany',
              'updateMany',
              'deleteMany',
            ].includes(operation);

            const modelsToWatch = [
              'Exam',
              'Question',
              'User',
              'Submission',
            ].map((m) => m.toLowerCase());

            if (
              isMutation &&
              model &&
              modelsToWatch.includes(model.toLowerCase())
            ) {
              console.log(`[Hook] Detected mutation: ${model}.${operation}`);
              // Delay to ensure the transaction is committed
              setTimeout(async () => {
                try {
                  const gateway = moduleRef.get(NotificationGateway, {
                    strict: false,
                  });
                  const service = moduleRef.get(NotificationService, {
                    strict: false,
                  });
                  if (gateway && service) {
                    console.log(
                      `[Hook] Fetching metrics from ${model}.${operation}...`,
                    );
                    const metrics = await service.getDashboardMetrics();
                    gateway.pushAdminDashboardUpdate(metrics);
                    console.log(
                      `[Hook] Dashboard update sent after ${model}.${operation}`,
                    );
                  } else {
                    console.warn(
                      `[Hook] NotificationGateway or Service not available`,
                    );
                  }
                } catch (e) {
                  console.error(`[Hook] Error pushing dashboard update:`, e);
                }
              }, 500); // Increased delay slightly
            }

            return result;
          },
        },
      },
    });

    // Add NestJS lifecycle hook to the extended client
    (extended as any).onModuleDestroy = async () => {
      await client.$disconnect();
    };

    console.log('Prisma Extended Client initialized (Prisma 6 hooks)');
    return extended;
  },
};

/**
 * Provider cho Internal Client
 * - Bỏ qua mọi access policy.
 * - Dùng cho các tác vụ hệ thống, admin, hoặc trong service login.
 */
const internalPrismaProvider: Provider = {
  provide: INTERNAL_PRISMA_CLIENT,
  inject: [PrismaService],
  useFactory: (prisma: PrismaService) => {
    // Không truyền context -> bỏ qua access policy
    return enhance(prisma);
  },
};

/**
 * Provider cho Policy-Aware Client
 * - Áp dụng access policy dựa trên user của request hiện tại.
 * - Phải là request-scoped.
 */
const policyAwarePrismaProvider: Provider = {
  provide: POLICY_AWARE_PRISMA_CLIENT,
  scope: Scope.REQUEST, // Rất quan trọng! Mỗi request sẽ có một instance riêng.
  inject: [REQUEST, PrismaService], // ✅ Inject đối tượng REQUEST và PrismaService
  useFactory: (req: Request | any, prisma: PrismaService) => {
    // Giả định rằng một AuthGuard đã xác thực JWT và gắn user vào request.
    // Ví dụ: req.user = { id: 1, role: 'USER' }
    const user = req.user;

    // Truyền user vào context để ZenStack áp dụng access policy
    return enhance(prisma, { user });
  },
};

@Global()
@Module({
  imports: [
    // ZenStackModule cung cấp các tiện ích cần thiết.
    ZenStackModule,
  ],
  providers: [
    internalPrismaProvider,
    policyAwarePrismaProvider,
    prismaServiceProvider,
  ],
  exports: [INTERNAL_PRISMA_CLIENT, POLICY_AWARE_PRISMA_CLIENT, PrismaService],
})
export class PrismaModule {}
