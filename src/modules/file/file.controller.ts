import {
  Controller,
  Post,
  Delete,
  UseInterceptors,
  UploadedFiles,
  Param, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { FileService } from './file.service';

@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  // 单文件（原有）
  @Post('image')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    const res = await this.fileService.uploadSingle(file, 'goods');
    return {
      code: 200,
      data: res.url,
      info: res,
    };
  }

  // ========== 多文件上传 ==========
  @Post('images')
  @UseInterceptors(
    FilesInterceptor(
      'files', // 前端 formData key 必须为 files
      10, // 最大一次上传数量
      {
        limits: {
          fileSize: 5 * 1024 * 1024, // 单文件5MB
        },
      },
    ),
  )
  async uploadImages(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      return { code: 400, msg: '未选择上传文件' };
    }

    // 循环调用单文件上传逻辑
    const list = await Promise.all(
      files.map((file) => this.fileService.uploadSingle(file, 'goods')),
    );

    return {
      code: 200,
      data: list.map((item) => item.url),
      list: list,
    };
  }

  // 删除
  @Delete(':id')
  async remove(@Param('id') id: string) {
    await this.fileService.deleteFile(+id);
    return { code: 200, msg: '删除成功' };
  }
}
