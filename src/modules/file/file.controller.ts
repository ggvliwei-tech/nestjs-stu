/**
 * 文件上传控制器
 *
 * 提供单文件和多文件上传功能，支持图片格式校验和大小限制
 * 文件上传至阿里云 OSS（未配置时降级为本地存储）
 * 所有接口使用轻量 JWT 认证，仅验证 Token 签名，不查询数据库
 */
import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  MaxFileSizeValidator,
  ParseFilePipe,
  UseGuards,
} from '@nestjs/common';
import { MimeTypeValidator } from '../../common/validators/mime-type.validator';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync, writeFileSync } from 'fs';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileService } from './file.service';
import { UploadResDto } from './dto/file.dto';
import { JwtAuthSimpleGuard } from '../../common/guards/jwt-auth-simple.guard';

/**
 * 根据当前日期生成文件存储目录（仅本地存储模式使用）
 * 格式: uploads/YYYY-MM-DD
 */
function getDateDir(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  return `uploads/${yyyy}-${mm}-${dd}`;
}

/**
 * 将文件缓冲写入本地磁盘
 */
function saveToLocal(buffer: Buffer, filename: string): string {
  const dir = getDateDir();
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, filename);
  writeFileSync(filePath, buffer);
  return filename;
}

@ApiTags('文件上传模块')
@ApiBearerAuth()
@UseGuards(JwtAuthSimpleGuard)
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  /**
   * 单文件上传接口
   * 使用 UUID 重命名文件避免文件名冲突
   */
  @Post('upload')
  @ApiOperation({ summary: '单文件上传' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
    }),
  )
  async uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          new MimeTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ): Promise<UploadResDto> {
    const ext = extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;

    let objectKey: string;

    if (this.fileService.isOssEnabled()) {
      // 上传到 OSS
      objectKey = await this.fileService.uploadToOss(file.buffer, filename);
    } else {
      // 未配置 OSS，降级到本地磁盘
      objectKey = saveToLocal(file.buffer, filename);
    }

    return {
      url: this.fileService.getFileUrl(objectKey),
      originalname: file.originalname,
      filename: objectKey,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  /**
   * 多文件批量上传接口（最多 10 个文件）
   * 使用 UUID 重命名文件避免文件名冲突
   */
  @Post('uploads')
  @ApiOperation({ summary: '多文件批量上传（最多10个）' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
        },
      },
    },
  })
  @UseInterceptors(
    FilesInterceptor('files', 10, {
      storage: memoryStorage(),
    }),
  )
  async uploadFiles(
    @UploadedFiles() files: Express.Multer.File[],
  ): Promise<UploadResDto[]> {
    const results: UploadResDto[] = [];

    for (const file of files) {
      const ext = extname(file.originalname);
      const filename = `${uuidv4()}${ext}`;

      let objectKey: string;

      if (this.fileService.isOssEnabled()) {
        objectKey = await this.fileService.uploadToOss(file.buffer, filename);
      } else {
        objectKey = saveToLocal(file.buffer, filename);
      }

      results.push({
        url: this.fileService.getFileUrl(objectKey),
        originalname: file.originalname,
        filename: objectKey,
        size: file.size,
        mimetype: file.mimetype,
      });
    }

    return results;
  }
}
