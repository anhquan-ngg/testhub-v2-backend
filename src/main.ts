import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';
import { ZenStackMiddleware } from '@zenstackhq/server/express';
import { enhance } from '@zenstackhq/runtime';
import { PrismaService } from './prisma/prisma.service';
import { json, urlencoded, type Request } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const prisma = app.get(PrismaService);

  const frontendUrls = configService.get<string>('FRONTEND_URL');

  app.use(cookieParser());
  app.use(json({ limit: '50mb' })); // <-- 2. Thêm dòng này để parse JSON
  app.use(urlencoded({ extended: true, limit: '50mb' })); // <-- Thêm cả dòng này để parse URL-encoded (hữu ích cho form)

  app.enableCors({
    origin: frontendUrls ? frontendUrls.split(',') : [],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    credentials: true,
  });

  // Cấu hình cho tài liệu Swagger
  const config = new DocumentBuilder()
    .setTitle('Testhub API')
    .setDescription('The API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  // Tạo tài liệu Swagger
  const document = SwaggerModule.createDocument(app, config);

  // Cài đặt Swagger UI tại endpoint '/api'
  SwaggerModule.setup('api-docs', app, document);

  // Mount ZenStack REST API under '/api'
  app.use(
    '/api',
    ZenStackMiddleware({
      getPrisma: (req: any) => enhance(prisma, { user: req?.user ?? null }),
    }) as any,
  );

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger is running on: ${await app.getUrl()}/api-docs`);
}
bootstrap();
