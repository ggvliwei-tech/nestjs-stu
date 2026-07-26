import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UserService } from '../../modules/user/user.service';

@Injectable()
export class RefreshTokenGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
/*    const authHeader = req.headers.authorization;

    if (!authHeader) throw new UnauthorizedException('请携带refresh token');
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException('token格式错误');*/

    // 从Cookie读取refresh_token，不再从Authorization Header
    const token = req.cookies?.refresh_token;
    if (!token) {
      throw new UnauthorizedException('未携带刷新令牌，请重新登录');
    }

    try {
      // 使用Refresh专用密钥校验
      const payload = this.jwtService.verify(token, {
        secret: this.configService.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });

      // 数据库比对是否一致（防止已退出登录的旧Token）
      const user = await this.userService.findById(payload.sub);
      if (!user || user.refreshToken !== token) {
        throw new UnauthorizedException('刷新令牌已失效，请重新登录');
      }

      req.user = user;
      return true;
    } catch {
      throw new UnauthorizedException('刷新令牌过期或非法');
    }
  }
}
