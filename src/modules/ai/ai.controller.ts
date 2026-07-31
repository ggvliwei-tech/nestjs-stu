import { Controller, Post, Body, Sse, MessageEvent, Get, Query } from '@nestjs/common';
import { Observable, from, map } from 'rxjs';
import { AiService } from './ai.service';
import { ChatDto } from './dto/chat.dto';
import { isBaseMessage } from '@langchain/core/messages';
import { randomUUID } from 'crypto';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // 1. 普通单轮问答
  @Post('chat')
  async chat(@Body() dto: ChatDto) {
    const data = await this.aiService.simpleChat(dto.question);
    return { code: 200, data };
  }

  // 2. 带会话历史多轮对话
  @Post('chat/history')
  async chatHistory(@Body() dto: ChatDto) {
    // 不传 sessionId 时自动生成一个新的
    const sessionId = dto.sessionId || randomUUID();
    const data = await this.aiService.chatWithHistory(dto.question, sessionId);
    return { code: 200, data, sessionId };
  }

  // 3. RAG知识库问答
  @Post('rag')
  async ragChat(@Body() dto: ChatDto) {
    const data = await this.aiService.ragQuery(dto.question);
    return { code: 200, data };
  }

  // 4. SSE 流式输出（前端打字机效果）
  @Get('stream')
  @Sse()
  async stream(@Query('question') question: string): Promise<Observable<MessageEvent>> {
    const stream = await this.aiService.streamChat(question);
    return from(stream).pipe(
      map((chunk) => ({
        data: isBaseMessage(chunk) ? JSON.stringify(chunk.content) : String(chunk),
      })),
    );
  }

  // 5. 生成新的会话ID
  @Post('session/create')
  async createSession() {
    const sessionId = randomUUID();
    return { code: 200, data: { sessionId } };
  }
}
