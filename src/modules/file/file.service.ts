import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import sharp from 'sharp';
import { StorageTypeEnum } from './enums/storage-type.enum';
import { LocalStorage } from './interfaces/local.storage';
import { OssStorage } from './interfaces/oss.storage';
import { FileStorage, UploadResult } from './interfaces/file-storage.interface';
import { FileEntity } from './entities/file.entity';

// 允许上传的图片后缀
const ALLOW_IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)$/i;
const ALLOW_MIME = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

@Injectable()
export class FileService {
  private storage: FileStorage;

  constructor(
    private configService: ConfigService,
    @InjectRepository(FileEntity)
    private fileRepo: Repository<FileEntity>,
    private localStorage: LocalStorage,
    private ossStorage: OssStorage,
  ) {
    // 根据环境变量自动切换存储策略
    const type = this.configService.get<StorageTypeEnum>('STORAGE_TYPE');
    this.storage = type === StorageTypeEnum.OSS ? this.ossStorage : this.localStorage;
  }

  /**
   * 单文件上传 + 图片压缩 + 入库
   */
  async uploadSingle(
    file: Express.Multer.File,
    module = 'common',
    compress = true,
  ) {
    // 1. 基础校验
    if (!file?.buffer) {
      throw new BadRequestException('文件缓冲区为空，上传失败');
    }
    const ext = file.originalname.substring(file.originalname.lastIndexOf('.'));
    if (!ALLOW_IMAGE_EXT.test(ext) || !ALLOW_MIME.includes(file.mimetype)) {
      throw new BadRequestException('仅支持 jpg、png、gif、webp 图片格式');
    }

    let uploadBuffer = file.buffer;

    // 2. 图片压缩（默认开启，长边最大1920）
    if (compress && file.mimetype.startsWith('image/')) {
      uploadBuffer = await sharp(file.buffer)
        .resize({ width: 1920, height: 1920, fit: 'inside', withoutEnlargement: true })
        .toBuffer();
    }

    // 3. 调用存储策略上传
    const res: UploadResult = await this.storage.upload(
      { ...file, buffer: uploadBuffer },
      module,
    );

    // 4. 数据库写入记录
    const record = this.fileRepo.create({
      originalName: file.originalname,
      saveName: res.saveName,
      filePath: res.filePath,
      url: res.url,
      mimeType: file.mimetype,
      size: uploadBuffer.length,
      storageType: this.configService.get('STORAGE_TYPE'),
      module,
    });
    await this.fileRepo.save(record);

    return record;
  }

  /**
   * 删除文件（物理删除+数据库软删/硬删）
   */
  async deleteFile(id: number) {
    const file = await this.fileRepo.findOneBy({ id });
    if (!file) throw new BadRequestException('文件不存在');

    // 删除云端/本地物理文件
    if (file.filePath) {
      await this.storage.delete(file.filePath);
    }
    // 删除数据库记录
    await this.fileRepo.delete(id);
    return true;
  }
}
