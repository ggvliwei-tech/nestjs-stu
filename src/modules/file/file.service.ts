/**
 * 文件服务
 * 负责组装文件访问 URL 等文件相关业务逻辑
 */
import { Injectable } from '@nestjs/common';        // NestJS 可注入装饰器
import { ConfigService } from '@nestjs/config';     // 配置服务，用于读取环境变量

@Injectable()                                       // 标记为可注入服务，供依赖注入容器管理
export class FileService {
  constructor(private readonly configService: ConfigService) {}  // 注入配置服务

  /**
   * 组装文件访问地址
   * @param filename 存储的文件名
   * @returns 完整的文件访问 URL
   */
  getFileUrl(filename: string): string {
    // 从配置中读取应用基础地址，默认本地开发地址
    const baseUrl = this.configService.get('APP_BASE_URL') || 'http://localhost:3000';
    // 拼接文件访问路径，格式为 {baseUrl}/api/v1/uploads/{filename}
    return `${baseUrl}/api/v1/uploads/${filename}`;
  }
}
