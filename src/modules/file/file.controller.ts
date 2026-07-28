import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  MaxFileSizeValidator,
  FileTypeValidator,
  ParseFilePipe, UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { FileService } from './file.service';
import { UploadResDto } from './dto/file.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';



@ApiTags('文件上传模块')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('file')
export class FileController {
  constructor(private readonly fileService: FileService) {}

  // 单文件上传
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
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          // UUID重命名，防止文件名重复覆盖
          const randomName = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${randomName}${ext}`);
        },
      }),
    }),
  )
  uploadFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          // 最大5MB
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),
          // 只允许图片，如需放开删除此条
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
      }),
    )
      file: Express.Multer.File,
  ): UploadResDto {
    return {
      url: this.fileService.getFileUrl(file.filename),
      originalname: file.originalname,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  // 多文件上传
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
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = uuidv4();
          const ext = extname(file.originalname);
          cb(null, `${randomName}${ext}`);
        },
      }),
    }),
  )
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {
    return files.map((item) => ({
      url: this.fileService.getFileUrl(item.filename),
      originalname: item.originalname,
      filename: item.filename,
      size: item.size,
      mimetype: item.mimetype,
    }));
  }
}
