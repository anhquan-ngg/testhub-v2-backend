import { Global, Module, Provider, Scope } from '@nestjs/common';
import { APP_INTERCEPTOR, REQUEST } from '@nestjs/core';
import { PrismaClient } from '@prisma/client';
import { enhance } from '@zenstackhq/runtime';
import { Request } from 'express';
import { ZenStackModule } from '@zenstackhq/server/nestjs';
import { PrismaService } from './prisma.service';

// Định nghĩa Injection Tokens
export const INTERNAL_PRISMA_CLIENT = 'INTERNAL_PRISMA_CLIENT';
export const POLICY_AWARE_PRISMA_CLIENT = 'POLICY_AWARE_PRISMA_CLIENT';

/**
 * Provider cho Internal Client
 * - Bỏ qua mọi access policy.
 * - Dùng cho các tác vụ hệ thống, admin, hoặc trong service login.
 */
const internalPrismaProvider: Provider = {
  provide: INTERNAL_PRISMA_CLIENT,
  useFactory: () => {
    // Không truyền context -> bỏ qua access policy
    return enhance(new PrismaClient());
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
  inject: [REQUEST], // ✅ Inject đối tượng REQUEST
  useFactory: (req: Request | any) => {
    // Giả định rằng một AuthGuard đã xác thực JWT và gắn user vào request.
    // Ví dụ: req.user = { id: 1, role: 'USER' }
    const user = req.user;

    // Truyền user vào context để ZenStack áp dụng access policy
    return enhance(new PrismaClient(), { user });
  },
};

@Global()
@Module({
  imports: [
    // ZenStackModule cung cấp các tiện ích cần thiết.
    // Nó không còn cần thiết nếu bạn không dùng ZenStackInterceptor, nhưng giữ lại cũng không sao.
    ZenStackModule,
  ],
  providers: [
    internalPrismaProvider,
    policyAwarePrismaProvider,
    PrismaService,
    // Bạn vẫn cần một cơ chế để lấy user từ JWT và gắn vào request.
    // Thường thì việc này được thực hiện bởi một AuthGuard toàn cục hoặc trên từng route.
    // ZenStackInterceptor chỉ hữu ích nếu bạn dùng ClsService.
  ],
  exports: [INTERNAL_PRISMA_CLIENT, POLICY_AWARE_PRISMA_CLIENT, PrismaService],
})
export class PrismaModule {}
