import { IsNotEmpty, Length } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
    @ApiProperty({ description: '用户名' })
    @IsNotEmpty({ message: '用户名不能为空' })
    @Length(2, 20, { message: '用户名长度2-20位' })
    username: string;

    @ApiProperty({ description: '密码' })
    @IsNotEmpty({ message: '密码不能为空' })
    password: string;
}
