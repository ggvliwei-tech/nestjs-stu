import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OSS from 'ali-oss';
import { UploadResult, FileStorage } from './file-storage.interface';
import * as path from 'path';

@Injectable()
export class OssStorage implements FileStorage {
  private client: OSS | null = null;
  private cdnDomain: string;
  private uploadFolder: string;

  constructor(private configService: ConfigService) {
    this.cdnDomain = <string>this.configService.get('OSS_CDN_DOMAIN');
    this.uploadFolder = <string>this.configService.get('OSS_UPLOAD_FOLDER');
  }

  private getClient(): OSS {
    if (!this.client) {
      this.client = new OSS({
        region: <string>this.configService.get('OSS_REGION'),
        accessKeyId: <string>this.configService.get('OSS_ACCESS_KEY_ID'),
        accessKeySecret: <string>this.configService.get('OSS_ACCESS_KEY_SECRET'),
        bucket: <string>this.configService.get('OSS_BUCKET'),
      });
    }
    return this.client;
  }

  async upload(file: Express.Multer.File, folder = ''): Promise<UploadResult> {
    const date = new Date();
    const dateFolder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const ext = path.extname(file.originalname);
    const saveName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;

    const ossKey = `${this.uploadFolder}/${folder}/${dateFolder}/${saveName}`.replace(/\/+/g, '/');

    await this.getClient().put(ossKey, file.buffer);

    const url = `${this.cdnDomain}/${ossKey}`;

    return {
      filePath: ossKey,
      url,
      saveName,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    await this.getClient().delete(filePath);
    return true;
  }
}
