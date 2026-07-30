import { IsNotEmpty, IsOptional } from 'class-validator';

export class ChatDto {
  @IsNotEmpty({ message: '提问内容不能为空' })
  question: string;

  @IsOptional()
  sessionId?: string; // 多轮对话唯一会话ID
}
