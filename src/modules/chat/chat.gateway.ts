import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

// 全局路由前缀 /ws，允许跨域
@WebSocketGateway({
  namespace: '/ws',
  cors: {
    origin: '*',
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger('WebSocket');

  // 客户端连接
  handleConnection(client: Socket) {
    this.logger.log(`客户端上线: ${client.id}`);
  }

  // 客户端断开
  handleDisconnect(client: Socket) {
    this.logger.log(`客户端下线: ${client.id}`);
  }

  // 监听客户端发送事件 send‑msg
  @SubscribeMessage('send-msg')
  handleMessage(client: Socket, payload: string) {
    this.logger.log(`收到消息：${payload}`);

    // 1. 推送给当前客户端
    client.emit('reply', { code: 200, data: payload });
    // 2. 广播给所有在线用户（除自己）
    client.broadcast.emit('broadcast', payload);
    // 3. 全员推送
    // this.server.emit('all', payload);
  }

  // 房间功能
  @SubscribeMessage('join-room')
  joinRoom(client: Socket, roomId: string) {
    client.join(roomId);
    client.emit('room-info', `已进入房间${roomId}`);
  }
}
