/**
 * 文件服务
 * 负责文件上传至阿里云 OSS 和组装文件访问 URL
 *
 * 设计说明：
 * - 优先使用阿里云 OSS 存储，未配置时自动降级为本地磁盘存储
 * - 降级逻辑保证开发环境无需配置 OSS 即可正常运行
 */
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSS from 'ali-oss';

@Injectable()
export class FileService {
  private readonly ossClient: OSS | null;
  private readonly ossBucket: string;
  private readonly ossBaseUrl: string;
  private readonly useOss: boolean;

  constructor(private readonly configService: ConfigService) {
    // 从环境变量读取 OSS 配置，缺失时默认为空字符串
    const region = this.configService.get<string>('OSS_REGION') || '';
    const accessKeyId =
      this.configService.get<string>('OSS_ACCESS_KEY_ID') || '';
    const accessKeySecret =
      this.configService.get<string>('OSS_ACCESS_KEY_SECRET') || '';
    this.ossBucket = this.configService.get<string>('OSS_BUCKET') || '';
    this.ossBaseUrl = this.configService.get<string>('OSS_BASE_URL') || '';

    // 判断是否启用 OSS：所有配置项均非空时启用
    this.useOss = !!(
      accessKeyId &&
      accessKeySecret &&
      this.ossBucket &&
      region
    );

    // 根据判断结果初始化 OSS 客户端
    if (this.useOss) {
      this.ossClient = new OSS({
        region,
        accessKeyId,
        accessKeySecret,
        bucket: this.ossBucket,
      });
    } else {
      this.ossClient = null;
    }
  }

  /**
   * 判断是否启用了 OSS
   */
  isOssEnabled(): boolean {
    return this.useOss;
  }

  /**
   * 根据当前日期生成 OSS 存储路径
   * 格式: YYYY-MM-DD/filename
   * 按日期分目录便于管理和清理文件
   */
  private getDateDir(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  /**
   * 上传文件缓冲到 OSS
   * @param buffer 文件二进制缓冲
   * @param filename 文件名（UUID + 扩展名）
   * @returns OSS 上的 object key（日期目录 + 文件名）
   * @throws Error 当 OSS 未配置时抛出异常
   */
  async uploadToOss(buffer: Buffer, filename: string): Promise<string> {
    if (!this.ossClient) {
      throw new Error('OSS 未配置，请先在 .env 中配置 OSS 相关参数');
    }

    // 生成按日期分组的存储路径，如 2026-07-30/uuid.jpg
    const dateDir = this.getDateDir();
    const objectKey = `${dateDir}/${filename}`;

    // 调用 OSS SDK 上传文件
    await this.ossClient.put(objectKey, buffer);
    return objectKey;
  }

  /**
   * 组装文件访问地址
   * 如果启用了 OSS，返回 OSS 的完整 URL；否则返回本地静态资源 URL
   * @param filename 存储的文件名（包含日期目录时拼接在 URL 中）
   * @returns 完整的文件访问 URL
   */
  getFileUrl(filename: string): string {
    if (this.useOss) {
      // OSS 模式：直接拼接 OSS 基础 URL 和文件名
      return `${this.ossBaseUrl}/${filename}`;
    }

    // 本地模式：拼接应用基础 URL 和本地静态资源路径
    const baseUrl =
      this.configService.get<string>('APP_BASE_URL') || 'http://localhost:3000';
    return `${baseUrl}/api/v1/${filename}`;
  }
}
