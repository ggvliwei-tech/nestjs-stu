import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { ChatOllama } from '@langchain/ollama';
import { HumanMessage, SystemMessage } from '@langchain/core/messages';
import { Document } from '@langchain/core/documents';
import Redis from 'ioredis';
import { LlmTypeEnum } from './enums/llm-type.enum';
import fs from 'fs';
import { PDFParse } from 'pdf-parse';
import { ChromaClient } from 'chromadb';

@Injectable()
export class AiService {
  private readonly llm: ChatOpenAI | ChatOllama;
  private readonly embeddings: OpenAIEmbeddings;
  private readonly redisClient: Redis;
  private readonly llmType: string;

  constructor(private configService: ConfigService) {
    // 1. 初始化Redis
    const redisPassword = this.configService.get('REDIS_PASSWORD');
    this.redisClient = new Redis({
      host: this.configService.get('REDIS_HOST') || 'localhost',
      port: this.configService.get('REDIS_PORT') || 6379,
      password: redisPassword || undefined,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 3) {
          console.warn('[Redis] 连接失败次数过多，停止重试');
          return null;
        }
        return Math.min(times * 500, 2000);
      },
    });

    this.redisClient.on('error', (err) => {
      console.error('[Redis] 连接错误:', err.message);
    });

    this.redisClient.on('ready', () => {
      console.log('[Redis] 连接成功');
    });

    // 2. 判断使用哪种大模型
    this.llmType = this.configService.get('LLM_TYPE') || 'openai';
    if (this.llmType === LlmTypeEnum.OPENAI) {
      this.llm = new ChatOpenAI({
        apiKey: this.configService.get('OPENAI_API_KEY'),
        configuration: { baseURL: this.configService.get('OPENAI_BASE_URL') },
        model: this.configService.get('OPENAI_MODEL') || 'gpt-3.5-turbo',
        temperature: 0.6,
      });
      this.embeddings = new OpenAIEmbeddings({
        openAIApiKey: this.configService.get('OPENAI_API_KEY'),
        configuration: { baseURL: this.configService.get('OPENAI_BASE_URL') },
      });
    } else {
      // Ollama本地模型
      this.llm = new ChatOllama({
        baseUrl: this.configService.get('OLLAMA_BASE_URL'),
        model: this.configService.get('OLLAMA_MODEL'),
        temperature: 0.6,
        numCtx: 2048, // 减少上下文长度以降低内存占用
      });
    }
  }

  // ====================== 1. 单轮简单问答（无历史） ======================
  async simpleChat(question: string) {
    const messages = [
      new SystemMessage('你是后端全栈工程师，回答简洁，提供可直接运行代码，不要冗余描述'),
      new HumanMessage(question),
    ];
    const res = await this.llm.invoke(messages);
    return res.content;
  }

  // ====================== 2. 多轮对话（Redis持久化历史） ======================
  async chatWithHistory(question: string, sessionId: string) {
    // 从Redis获取历史消息
    const historyKey = `chat_history:${sessionId}`;
    const historyData = await this.redisClient.get(historyKey);
    const messages: Array<SystemMessage | HumanMessage> = [
      new SystemMessage('你是后端全栈工程师，回答简洁，提供可直接运行代码，不要冗余描述'),
    ];

    if (historyData) {
      const history = JSON.parse(historyData) as Array<{ type: string; content: string }>;
      for (const msg of history) {
        if (msg.type === 'human') {
          messages.push(new HumanMessage(msg.content));
        }
      }
    }

    messages.push(new HumanMessage(question));
    const res = await this.llm.invoke(messages);

    // 保存历史到Redis (保留最近10轮对话)
    const updatedHistory = [
      ...JSON.parse(historyData || '[]'),
      { type: 'human', content: question },
      { type: 'ai', content: res.content },
    ].slice(-20);
    await this.redisClient.set(historyKey, JSON.stringify(updatedHistory), 'EX', 86400);

    return res.content;
  }

  // ====================== 3. RAG知识库：上传PDF构建向量库 ======================
  async uploadPdfToVector(filePath: string, collectionName = 'business_docs') {
    if (!fs.existsSync(filePath)) throw new BadRequestException('文件不存在');
    const buffer = fs.readFileSync(filePath);
    const parser = new PDFParse({ data: buffer });
    const pdfRes = await parser.getText();
    const text = pdfRes.text;

    // 简单文本切块（替代RecursiveCharacterTextSplitter）
    const chunkSize = 600;
    const chunkOverlap = 80;
    const chunks: string[] = [];
    let start = 0;
    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      start = end - chunkOverlap;
    }

    const docs = chunks.map((chunk, i) => new Document({ pageContent: chunk, metadata: { chunk: i } }));

    // 存入Chroma向量库（需要运行Chroma服务器）
    const client = new ChromaClient({
      host: this.configService.get('CHROMA_HOST') || 'localhost',
      port: this.configService.get('CHROMA_PORT') || 8000,
    });
    const collection = await client.getOrCreateCollection({ name: collectionName });

    // 生成嵌入并添加文档
    const texts = docs.map(d => d.pageContent);
    const embeddings = await this.embeddings.embedDocuments(texts);

    await collection.add({
      ids: docs.map((_, i) => `doc_${Date.now()}_${i}`),
      embeddings,
      documents: texts,
      metadatas: docs.map(d => d.metadata),
    });

    return true;
  }

  // ====================== 4. RAG基于文档问答 ======================
  async ragQuery(question: string, collectionName = 'business_docs') {
    const client = new ChromaClient({
      host: this.configService.get('CHROMA_HOST') || 'localhost',
      port: this.configService.get('CHROMA_PORT') || 8000,
    });
    const collection = await client.getOrCreateCollection({ name: collectionName });

    // 生成问题嵌入
    const questionEmbedding = await this.embeddings.embedQuery(question);

    const queryResult = await collection.query({
      queryEmbeddings: [questionEmbedding],
      nResults: 3,
      include: ['documents'],
    });

    const relevantDocs = queryResult.documents?.[0] || [];
    const context = relevantDocs.join('\n\n');

    const prompt = `
基于下面参考内容回答问题，不知道就如实回答不知道，禁止编造内容：
【参考上下文】
${context}
【用户问题】
${question}
    `;

    return this.simpleChat(prompt);
  }

  // ====================== 5. SSE 流式打字机输出（核心体验） ======================
  async streamChat(question: string) {
    const stream = await this.llm.stream([
      new SystemMessage('回答简短精炼'),
      new HumanMessage(question),
    ]);
    return stream;
  }
}
