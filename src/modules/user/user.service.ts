import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private readonly userRepo: Repository<User>,
    ) {}

    async create(createUserDto: CreateUserDto) {
        const user = this.userRepo.create(createUserDto);
        return await this.userRepo.save(user);
    }

    async findAll() {
        return await this.userRepo.find();
    }
}
