import { ApiProperty } from '@nestjs/swagger';

export class UploadResDto {
  @ApiProperty({ description: '文件访问完整地址' })
  url: string;

  @ApiProperty({ description: '文件原始名称' })
  originalname: string;

  @ApiProperty({ description: '存储文件名' })
  filename: string;

  @ApiProperty({ description: '文件大小 byte' })
  size: number;

  @ApiProperty({ description: 'MIME类型' })
  mimetype: string;
}
