import {
  ConflictException,
  Injectable, // 依赖注入装饰器
  UnauthorizedException, // 未授权异常
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm'; // 注入 Repository 的装饰器
import { Repository } from 'typeorm'; // TypeORM 仓储接口，用于数据库操作
import { QueryFailedError } from 'typeorm'; // TypeORM 查询失败异常，用于捕获数据库约束冲突
import { JwtService } from '@nestjs/jwt'; // JWT 服务，用于签发 Token
import * as bcrypt from 'bcrypt'; // bcrypt 加密库，用于密码哈希和比对
import { User } from './entities/user.entity'; // 用户实体类
import { CreateUserDto } from './dto/create-user.dto'; // 注册用户 DTO
import { LoginUserDto } from './dto/login-user.dto'; // 登录用户 DTO

// 标记为可注入的服务
@Injectable()
export class UserService {
  // 构造函数注入依赖
  constructor(
    // 注入 User 实体的 Repository，用于数据库操作
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    // 注入 JWT 服务，用于 Token 签发
    private readonly jwtService: JwtService,
  ) {}

  // 注册用户：对密码进行 bcrypt 哈希后存入数据库
  // 先查询已存在用户名可快速返回提示，数据库唯一约束兜底防并发
  async create(createUserDto: CreateUserDto) {
    // 先查询用户名是否已存在，存在则快速返回冲突提示
    const existingUser = await this.userRepo.findOne({
      where: { username: createUserDto.username },
    });
    if (existingUser) {
      throw new ConflictException('用户名已注册');
    }

    // 使用 bcrypt 对密码进行哈希加密，saltRounds=10
    const hashPwd = await bcrypt.hash(createUserDto.password, 10);
    // 创建用户实体实例，将加密后的密码替换原始密码
    const user = this.userRepo.create({
      ...createUserDto, // 展开 DTO 数据（包含 username 等）
      password: hashPwd, // 使用加密后的密码
    });
    // 将用户实体保存到数据库，若并发请求导致唯一约束冲突，由数据库层面拦截
    try {
      return await this.userRepo.save(user);
    } catch (error) {
      // 捕获数据库唯一约束冲突（MySQL errno 1062 表示唯一键冲突）
      if (error instanceof QueryFailedError && (error as any).driverError?.errno === 1062) {
        throw new ConflictException('用户名已注册');
      }
      throw error;
    }
  }

  // 用户登录：验证用户名和密码，通过后签发 JWT Token
  async login(loginDto: LoginUserDto) {
    // 第一步：根据用户名查询数据库
    const user = await this.userRepo.findOne({
      where: { username: loginDto.username },
    });
    // 如果用户不存在，抛出未授权异常
    if (!user) {
      throw new UnauthorizedException('用户名不存在');
    }

    // 第二步：使用 bcrypt 比对提交的密码和数据库中存储的哈希密码
    const isPwdOk = await bcrypt.compare(loginDto.password, user.password);
    // 如果密码不匹配，抛出未授权异常
    if (!isPwdOk) {
      throw new UnauthorizedException('密码错误');
    }

    // 第三步：检查用户账号状态，0 表示已禁用
    if (user.status === 0) {
      throw new UnauthorizedException('账号已被禁用');
    }

    // 第四步：签发 JWT Token
    // payload 中包含用户 ID（sub）和用户名，Token 过期时间在配置中设置
    const payload = { sub: user.id, username: user.username };
    const token = this.jwtService.sign(payload);

    // 返回 Token 和用户基本信息
    return {
      token, // JWT 访问令牌
      userInfo: {
        id: user.id,
        username: user.username,
        status: user.status,
      },
    };
  }

  // 查询所有用户列表
  async findAll() {
    return await this.userRepo.find();
  }

  // 根据用户 ID 查询单个用户
  // 此方法被 JwtAuthGuard 调用，用于验证 Token 中的用户是否存在
  async findById(id: number) {
    return await this.userRepo.findOneBy({ id });
  }
}
