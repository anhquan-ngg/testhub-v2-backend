import { PrismaService } from '@/prisma/prisma.service';
import { Injectable, NestMiddleware } from '@nestjs/common';
import { enhance } from '@zenstackhq/runtime';
import RESTHandler, { RestApiHandler } from '@zenstackhq/server/api/rest';
import { ZenStackMiddleware } from '@zenstackhq/server/express';
import { Request, Response, NextFunction } from 'express';

// @Injectable()
// export class CrudMiddleware implements NestMiddleware {
//   constructor(private prisma: PrismaService) {}

//   use(req: Request, res: Response, next: NextFunction) {
//     const getPrisma = () => enhance(this.prisma, { user: req.user ?? null });
//     // ZenStack cung cấp middleware wrapper cho Express
//     return ZenStackMiddleware({ handler: RestApiHandler(), getPrisma })(
//       req,
//       res,
//       next,
//     );
//   }
// }
