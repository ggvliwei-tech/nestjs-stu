/**
 * 文件模块
 * 提供文件上传功能，包含 Controller 和 Service
 */
import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';

@Module({
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
