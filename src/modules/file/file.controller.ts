/**
 * 文件上传控制器
 *
 * 提供单文件和多文件上传功能，支持图片格式校验和大小限制
 * 所有接口需要 JWT Bearer Token 认证
 */
import {
  Controller,                                     // REST 控制器装饰器
  Post,                                           // POST 请求路由装饰器
  UseInterceptors,                                // 拦截器装饰器
  UploadedFile,                                   // 单文件上传参数装饰器
  UploadedFiles,                                  // 多文件上传参数装饰器
  MaxFileSizeValidator,                           // 文件大小验证器
  FileTypeValidator,                              // 文件类型验证器
  ParseFilePipe, UseGuards,                       // 文件解析管道 / 守卫装饰器
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';  // 单/多文件拦截器（基于 multer）
import { diskStorage } from 'multer';             // multer 磁盘存储引擎
import { extname } from 'path';                   // 获取文件扩展名
import { v4 as uuidv4 } from 'uuid';              // 生成 UUID v4，用于文件名防冲突
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';  // Swagger 文档装饰器
import { FileService } from './file.service';     // 文件服务，用于组装 URL
import { UploadResDto } from './dto/file.dto';    // 上传响应 DTO
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';  // JWT 认证守卫


/**
 * 文件上传控制器
 * 提供单文件上传和多文件批量上传功能
 * 所有接口受 JWT 认证保护，仅允许上传图片格式文件（jpg/jpeg/png/gif/webp），单文件最大 5MB
 */
@ApiTags('文件上传模块')                            // Swagger 标签分组
@ApiBearerAuth()                                  // Swagger 标注需要 Bearer Token 认证
@UseGuards(JwtAuthGuard)                          // 全局使用 JWT 守卫，要求登录
@Controller('file')                               // 路由前缀 /api/v1/file
export class FileController {
  constructor(private readonly fileService: FileService) {}  // 注入文件服务

  /**
   * 单文件上传接口
   * 使用 UUID 重命名文件避免文件名冲突
   */
  @Post('upload')                                 // POST /api/v1/file/upload
  @ApiOperation({ summary: '单文件上传' })          // Swagger 操作摘要
  @ApiConsumes('multipart/form-data')             // Swagger 标注消费类型
  @ApiBody({                                      // Swagger 请求体定义
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',                       // 二进制文件类型
        },
      },
    },
  })
  @UseInterceptors(                               // 使用文件拦截器
    FileInterceptor('file', {                     // 单文件拦截器，表单字段名为 'file'
      storage: diskStorage({                      // 使用磁盘存储
        destination: './uploads',                 // 文件保存目录
        filename: (_req, file, cb) => {            // 自定义文件名生成函数
          // UUID重命名，防止文件名重复覆盖
          const randomName = uuidv4();            // 生成随机 UUID 作为文件名
          const ext = extname(file.originalname); // 提取原始文件扩展名
          cb(null, `${randomName}${ext}`);        // 回调返回最终文件名
        },
      }),
    }),
  )
  uploadFile(                                     // 处理单文件上传的方法
    @UploadedFile(                                // 解析上传的文件并应用验证
      new ParseFilePipe({                         // 文件解析管道
        validators: [
          // 最大5MB
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }),  // 验证文件大小不超过 5MB
          // 只允许图片，如需放开删除此条
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),  // 验证文件为图片格式
        ],
      }),
    )
      file: Express.Multer.File,                  // 上传的文件对象
  ): UploadResDto {                               // 返回上传响应 DTO
    return {
      url: this.fileService.getFileUrl(file.filename),  // 组装文件访问 URL
      originalname: file.originalname,            // 原始文件名
      filename: file.filename,                    // 存储文件名（UUID + 扩展名）
      size: file.size,                            // 文件大小（字节）
      mimetype: file.mimetype,                    // 文件 MIME 类型
    };
  }

  /**
   * 多文件批量上传接口（最多 10 个文件）
   * 使用 UUID 重命名文件避免文件名冲突
   */
  @Post('uploads')                                // POST /api/v1/file/uploads
  @ApiOperation({ summary: '多文件批量上传（最多10个）' })  // Swagger 操作摘要
  @ApiConsumes('multipart/form-data')             // Swagger 标注消费类型
  @ApiBody({                                      // Swagger 请求体定义
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },  // 二进制文件数组
        },
      },
    },
  })
  @UseInterceptors(                               // 使用文件拦截器
    FilesInterceptor('files', 10, {               // 多文件拦截器，表单字段名为 'files'，最多 10 个
      storage: diskStorage({                      // 使用磁盘存储
        destination: './uploads',                 // 文件保存目录
        filename: (_req, file, cb) => {            // 自定义文件名生成函数
          const randomName = uuidv4();            // 生成随机 UUID 作为文件名
          const ext = extname(file.originalname); // 提取原始文件扩展名
          cb(null, `${randomName}${ext}`);        // 回调返回最终文件名
        },
      }),
    }),
  )
  uploadFiles(@UploadedFiles() files: Express.Multer.File[]) {  // 处理多文件上传，参数为文件数组
    return files.map((item) => ({                 // 遍历每个文件生成响应对象
      url: this.fileService.getFileUrl(item.filename),  // 组装文件访问 URL
      originalname: item.originalname,            // 原始文件名
      filename: item.filename,                    // 存储文件名（UUID + 扩展名）
      size: item.size,                            // 文件大小（字节）
      mimetype: item.mimetype,                    // 文件 MIME 类型
    }));
  }
}
