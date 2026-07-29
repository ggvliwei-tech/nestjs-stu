/**
 * 自定义文件类型验证器
 *
 * 基于 multer 提供的 file.mimetype 进行验证，不依赖 file.buffer
 * 适用于使用 diskStorage 的场景
 */
import { FileValidator } from '@nestjs/common';
import { Express } from 'express';

export interface FileTypeValidatorOptions {
  fileType: RegExp | string;
}

export class MimeTypeValidator extends FileValidator<FileTypeValidatorOptions, Express.Multer.File> {
  buildErrorMessage(): string {
    return `Validation failed (file type does not match; expected type is ${this.validationOptions.fileType})`;
  }

  isValid(file?: Express.Multer.File): boolean {
    if (!file) return false;

    const { fileType } = this.validationOptions;
    const mimetype = file.mimetype || '';

    if (fileType instanceof RegExp) {
      return fileType.test(mimetype);
    }

    return mimetype === fileType;
  }
}
