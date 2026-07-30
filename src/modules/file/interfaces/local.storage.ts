import * as fs from 'fs';
import * as path from 'path';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UploadResult, FileStorage } from './file-storage.interface';

@Injectable()
export class LocalStorage implements FileStorage {
  private readonly baseDir: string;
  private readonly staticPrefix: string;

  constructor(private configService: ConfigService) {
    this.baseDir = path.resolve(process.cwd(), <string>this.configService.get('LOCAL_UPLOAD_BASE_DIR'));
    this.staticPrefix = <string>this.configService.get('LOCAL_STATIC_PREFIX');
    // 根目录不存在自动创建
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  async upload(file: Express.Multer.File, folder = ''): Promise<UploadResult> {
    // 按日期分文件夹 upload/2026/07/30
    const date = new Date();
    const dateFolder = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
    const targetFolder = path.join(this.baseDir, folder, dateFolder);

    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
    }

    // 重命名防止覆盖
    const ext = path.extname(file.originalname);
    const saveName = `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
    const fullPath = path.join(targetFolder, saveName);

    // 写入磁盘
    fs.writeFileSync(fullPath, file.buffer);

    // 相对路径 & 访问URL
    const relativePath = path.join(folder, dateFolder, saveName).replace(/\\/g, '/');
    const url = `${this.staticPrefix}/${relativePath}`;

    return {
      filePath: relativePath,
      url,
      saveName,
    };
  }

  async delete(filePath: string): Promise<boolean> {
    const fullPath = path.resolve(this.baseDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
    return true;
  }
}
