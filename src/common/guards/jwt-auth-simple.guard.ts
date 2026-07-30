/**
 * JWT 认证守卫（轻量版）
 *
 * 仅验证 Token 签名和有效期，不查询数据库
 * 适用于文件上传等不需要严格用户状态校验的接口
 *
 * 与 JwtAuthGuard 的区别：
 * - JwtAuthGuard：验证 Token + 查数据库确认用户存在且启用
 * - JwtAuthSimpleGuard：仅验证 Token 签名，不查数据库
 */
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtAuthSimpleGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      throw new UnauthorizedException('未携带Token，请先登录');
    }

    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Token格式错误，格式：Bearer xxx');
    }

    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });

      // 将 Token 载荷挂载到请求对象，后续可通过 request.user 获取
      request.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException('Token已过期或无效，请重新登录');
    }
  }
}
