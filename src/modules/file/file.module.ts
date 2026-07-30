import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as path from 'path';

import { FileController } from './file.controller';
import { FileService } from './file.service';
import { FileEntity } from './entities/file.entity';
import { LocalStorage } from './interfaces/local.storage';
import { OssStorage } from './interfaces/oss.storage';

@Module({
  imports: [
    TypeOrmModule.forFeature([FileEntity]),
    // 本地静态资源托管（访问上传图片URL）
    ServeStaticModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => [
        {
          rootPath: path.resolve(process.cwd(), <string>config.get('LOCAL_UPLOAD_BASE_DIR')),
          serveRoot: <string>config.get('LOCAL_STATIC_PREFIX'),
          maxAge: 30 * 24 * 60 * 60 * 1000, // 缓存30天
        },
      ],
      inject: [ConfigService],
    }),
  ],
  controllers: [FileController],
  providers: [FileService, LocalStorage, OssStorage],
  exports: [FileService],
})
export class FileModule {}
