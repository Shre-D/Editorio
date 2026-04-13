import { WebSocket, WebSocketServer } from 'ws';
import { IncomingMessage } from 'http';
import jwt from 'jsonwebtoken';
import {
  setUserPresence,
  removeUserPresence,
  getRoomPresence,
  publishToRoom,
  subscribeToRoom,
} from '../services/redis.js';
import { JwtPayload } from '../schemas/index.js';

interface ExtendedWebSocket extends WebSocket {
  userId?: string;
  username?: string;
  roomId?: string;
  cursorColor?: string;
  isAlive?: boolean;
}

interface PresenceMessage {
  type: 'join' | 'leave' | 'cursor_move' | 'selection_change' | 'ping';
  roomId?: string;
  data?: unknown;
}

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

// Generate random cursor color
const generateCursorColor = (): string => {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

export const setupWebSocket = (wss: WebSocketServer): void => {
  const roomSubscriptions = new Map<string, () => void>();

  wss.on('connection', (ws: ExtendedWebSocket, req: IncomingMessage) => {
    ws.isAlive = true;

    // Parse token from query string
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    const token = url.searchParams.get('token');

    if (!token) {
      ws.close(4001, 'No token provided');
      return;
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
      ws.userId = decoded.userId;
      ws.username = decoded.username;
      ws.cursorColor = generateCursorColor();
    } catch {
      ws.close(4002, 'Invalid token');
      return;
    }

    ws.on('pong', () => {
      ws.isAlive = true;
    });

    ws.on('message', async (data) => {
      try {
        const message: PresenceMessage = JSON.parse(data.toString());

        switch (message.type) {
          case 'join': {
            if (message.roomId && ws.userId && ws.username) {
              ws.roomId = message.roomId;

              // Set presence in Redis
              await setUserPresence(message.roomId, ws.userId, {
                username: ws.username,
                cursorColor: ws.cursorColor!,
              });

              // Subscribe to room updates if not already
              if (!roomSubscriptions.has(message.roomId)) {
                const unsubscribe = subscribeToRoom(message.roomId, (event) => {
                  // Broadcast to all clients in this room
                  wss.clients.forEach((client) => {
                    const extClient = client as ExtendedWebSocket;
                    if (extClient.roomId === message.roomId && extClient.readyState === WebSocket.OPEN) {
                      extClient.send(JSON.stringify(event));
                    }
                  });
                });
                roomSubscriptions.set(message.roomId, unsubscribe);
              }

              // Broadcast join event
              await publishToRoom(message.roomId, 'user_joined', {
                userId: ws.userId,
                username: ws.username,
                cursorColor: ws.cursorColor,
              });

              // Send current participants
              const presence = await getRoomPresence(message.roomId);
              ws.send(JSON.stringify({ event: 'room_state', data: { participants: presence } }));
            }
            break;
          }

          case 'leave': {
            if (ws.roomId && ws.userId) {
              await removeUserPresence(ws.roomId, ws.userId);
              await publishToRoom(ws.roomId, 'user_left', {
                userId: ws.userId,
                username: ws.username,
              });
            }
            break;
          }

          case 'cursor_move': {
            if (ws.roomId && ws.userId) {
              await publishToRoom(ws.roomId, 'cursor_update', {
                userId: ws.userId,
                username: ws.username,
                cursorColor: ws.cursorColor,
                position: message.data,
              });
            }
            break;
          }

          case 'selection_change': {
            if (ws.roomId && ws.userId) {
              await publishToRoom(ws.roomId, 'selection_update', {
                userId: ws.userId,
                username: ws.username,
                cursorColor: ws.cursorColor,
                selection: message.data,
              });
            }
            break;
          }

          case 'ping': {
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
          }
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      if (ws.roomId && ws.userId) {
        await removeUserPresence(ws.roomId, ws.userId);
        await publishToRoom(ws.roomId, 'user_left', {
          userId: ws.userId,
          username: ws.username,
        });
      }
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  });

  // Heartbeat to detect stale connections
  const interval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        return ws.terminate();
      }
      extWs.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on('close', () => {
    clearInterval(interval);
    roomSubscriptions.forEach((unsubscribe) => unsubscribe());
  });
};
