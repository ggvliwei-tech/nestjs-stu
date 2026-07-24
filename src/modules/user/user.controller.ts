import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { LoginUserDto } from './dto/login-user.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('用户管理模块')
@Controller('user')
export class UserController {
    constructor(private readonly userService: UserService) {}

    @ApiOperation({ summary: '注册用户' })
    @Post('register')
    register(@Body() createUserDto: CreateUserDto) {
        return this.userService.create(createUserDto);
    }

    @ApiOperation({ summary: '用户登录，获取token' })
    @Post('login')
    login(@Body() loginDto: LoginUserDto) {
        return this.userService.login(loginDto);
    }

    // ========== 需要登录鉴权的接口 ==========
    @ApiOperation({ summary: '获取用户列表（需要Token）' })
    @ApiBearerAuth() // swagger显示授权输入框
    @UseGuards(JwtAuthGuard) // 挂载JWT守卫
    @Get()
    findAll(@CurrentUser() user: any) {
        console.log('当前登录用户', user);
        return this.userService.findAll();
    }
}
