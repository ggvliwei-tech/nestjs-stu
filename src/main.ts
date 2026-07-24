import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  // 1. 全局跨域
  app.enableCors();

  // 2. 全局参数自动校验 + 自动去除多余字段
  app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
  );

  // 3. 全局统一返回格式拦截器
  app.useGlobalInterceptors(new TransformInterceptor());

  // 4. 全局异常过滤器
  app.useGlobalFilters(new HttpExceptionFilter());

  // 5. Swagger 接口文档（开发环境开启）
  const swaggerConfig = new DocumentBuilder()
      .setTitle('NestJS11 后端接口文档')
      .setDescription('Nest11 + TypeORM + MySQL 通用后台模板')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api-docs', app, document);

  // 6. 端口读取环境变量
  const port = configService.get<number>('APP_PORT') || 3000;
  await app.listen(port);

  console.log(`服务启动成功：http://localhost:${port}`);
  console.log(`接口文档地址：http://localhost:${port}/api-docs`);
}

bootstrap();
