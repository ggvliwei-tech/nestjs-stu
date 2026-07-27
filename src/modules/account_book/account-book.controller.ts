import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AccountBookService } from './account-book.service';
import { CreateAccountBookDto } from './dto/create-account-book.dto';
import { UpdateAccountBookDto } from './dto/update-account-book.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('账号账本管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard) // 所有接口必须登录
@Controller('account-book')
export class AccountBookController {
  constructor(private readonly accountBookService: AccountBookService) {}

  @Post()
  @ApiOperation({ summary: '新增账号账本记录' })
  create(@Body() createDto: CreateAccountBookDto,@CurrentUser() user) {
    return this.accountBookService.create(createDto,user.id);
  }

  @Get()
  @ApiOperation({ summary: '分页查询所有账本' })
  findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 10,
    @CurrentUser() user
  ) {
    return this.accountBookService.findAll(user.id,+page, +limit);
  }

  @Get(':id')
  @ApiOperation({ summary: '根据ID查询单条' })
  findOne(@Param('id') id: string,@CurrentUser() user) {
    return this.accountBookService.findOne(+id,user.id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '修改账本记录' })
  update(
    @Param('id') id: string,
    @Body() updateDto: UpdateAccountBookDto,
    @CurrentUser() user
  ) {
    return this.accountBookService.update(+id, updateDto,user.id);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除账本记录' })
  remove(@Param('id') id: string,@CurrentUser() user) {
    return this.accountBookService.remove(+id,user.id);
  }
}
