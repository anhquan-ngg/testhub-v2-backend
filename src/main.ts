import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  const frontendUrls = configService.get<string>('FRONTEND_URL');

  app.use(cookieParser());

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

  await app.listen(process.env.PORT ?? 3001);
  console.log(`Application is running on: ${await app.getUrl()}`);
  console.log(`Swagger is running on: ${await app.getUrl()}/api-docs`);
}
bootstrap();
