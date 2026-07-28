import { Module } from '@nestjs/common';
import { FileService } from './file.service';
import { FileController } from './file.controller';
import { UserModule } from '../user/user.module';

@Module({
  imports:[UserModule],
  controllers: [FileController],
  providers: [FileService],
})
export class FileModule {}
