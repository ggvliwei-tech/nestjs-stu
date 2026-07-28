/**
 * 文件模块
 * 提供文件上传功能，包含 Controller 和 Service
 */
import { Module } from '@nestjs/common';                // NestJS 模块装饰器
import { FileService } from './file.service';           // 文件服务类
import { FileController } from './file.controller';     // 文件控制器类
import { UserModule } from '../user/user.module';       // 用户模块（用于 JWT 认证依赖）

@Module({
  imports:[UserModule],              // 导入用户模块，提供 JWT 认证相关依赖
  controllers: [FileController],     // 注册文件控制器，处理文件上传请求
  providers: [FileService],          // 注册文件服务，提供 URL 组装等逻辑
})
export class FileModule {}           // 导出文件模块，供 AppModule 引入
