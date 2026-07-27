import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { AccountBookEntity } from './entities/account-book.entity';
import { CreateAccountBookDto } from './dto/create-account-book.dto';
import { UpdateAccountBookDto } from './dto/update-account-book.dto';

@Injectable()
export class AccountBookService {
  constructor(
    @InjectRepository(AccountBookEntity)
    private readonly accountBookRepo: Repository<AccountBookEntity>,
  ) {}

  // 新增账本
  async create(dto: CreateAccountBookDto,userId:number) {
    // 密码加密
    const hashPwd = await bcrypt.hash(dto.loginPassword, 10);
    const record = this.accountBookRepo.create({
      ...dto,
      loginPassword: hashPwd,
      userId
    });
    return this.accountBookRepo.save(record);
  }

  // 列表查询（简单分页）
  async findAll(userId:number,page = 1, limit = 10) {
    const skip = (page - 1) * limit;
    const [list, total] = await this.accountBookRepo.findAndCount({
      where:{userId},
      skip,
      take: limit,
      order: { updatedAt: 'DESC' },
    });
    return {
      list,
      total,
      page,
      limit,
    };
  }

  // 单条详情
  async findOne(id: number,userId:number) {
    const item = await this.accountBookRepo.findOneBy({ id ,userId});
    if (!item) throw new NotFoundException('记录不存在');
    return item;
  }

  // 更新
  async update(id: number, dto: UpdateAccountBookDto,userId:number) {
    const item = await this.findOne(id,userId);

    // 如果传了新密码则加密，否则沿用旧密码
    if (dto.loginPassword) {
      dto.loginPassword = await bcrypt.hash(dto.loginPassword, 10);
    }

    Object.assign(item, dto);
    return this.accountBookRepo.save(item);
  }

  // 删除
  async remove(id: number,userId:number) {
    await this.findOne(id,userId);
    await this.accountBookRepo.delete(id);
    return { msg: '删除成功' };
  }
}
