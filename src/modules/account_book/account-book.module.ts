import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from '../user/user.module';
import { AccountBookService } from './account-book.service';
import { AccountBookController } from './account-book.controller';
import { AccountBookEntity } from './entities/account-book.entity';

@Module({
  imports: [TypeOrmModule.forFeature([AccountBookEntity]), UserModule],
  controllers: [AccountBookController],
  providers: [AccountBookService],
})
export class AccountBookModule {}
