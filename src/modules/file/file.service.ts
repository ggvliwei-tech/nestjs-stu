import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { join } from 'path';

@Injectable()
export class FileService {
  constructor(private readonly configService: ConfigService) {}

  /**
   * 组装文件访问地址
   */
  getFileUrl(filename: string): string {
    const baseUrl = this.configService.get('APP_BASE_URL') || 'http://localhost:3000';
    return `${baseUrl}/api/v1/uploads/${filename}`;
  }
}
