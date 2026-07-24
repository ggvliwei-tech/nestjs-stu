import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../modules/user/user.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 1. 获取 Authorization header
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('未携带Token，请先登录');
    }

    // 2. 拆分 Bearer token
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token格式错误，格式：Bearer xxx');
    }

    try {
      // 3. 校验token
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      // 4. 根据payload中的id查询用户是否存在
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('用户不存在，请重新登录');
      }
      if (user.status === 0) {
        throw new UnauthorizedException('账号已禁用');
      }

      // 挂载到request，控制器可通过装饰器获取
      request.user = user;
      return true;
    } catch (err) {
      throw new UnauthorizedException('Token已过期或无效，请重新登录');
    }
  }
}
