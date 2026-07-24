import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';

@Injectable()
export class UserService {
    constructor(
      @InjectRepository(User)
      private readonly userRepo: Repository<User>,
      private readonly jwtService: JwtService,
    ) {}

    // 注册用户，密码加密入库
    async create(createUserDto: CreateUserDto) {
        // 密码加密
        const hashPwd = await bcrypt.hash(createUserDto.password, 10);
        const user = this.userRepo.create({
            ...createUserDto,
            password: hashPwd,
        });
        return await this.userRepo.save(user);
    }

    // 用户登录，校验密码返回token
    async login(loginDto: LoginUserDto) {
        // 1. 根据用户名查询
        const user = await this.userRepo.findOne({
            where: { username: loginDto.username },
        });
        if (!user) {
            throw new UnauthorizedException('用户名不存在');
        }

        // 2. 校验密码
        const isPwdOk = await bcrypt.compare(loginDto.password, user.password);
        if (!isPwdOk) {
            throw new UnauthorizedException('密码错误');
        }

        // 3. 账号禁用判断
        if (user.status === 0) {
            throw new UnauthorizedException('账号已被禁用');
        }

        // 4. 签发JWT token
        const payload = { sub: user.id, username: user.username };
        const token = this.jwtService.sign(payload);

        return {
            token,
            userInfo: {
                id: user.id,
                username: user.username,
                status: user.status,
            },
        };
    }

    async findAll() {
        return await this.userRepo.find();
    }

    // 根据id查询用户（守卫解析token使用）
    async findById(id: number) {
        return await this.userRepo.findOneBy({ id });
    }
}
