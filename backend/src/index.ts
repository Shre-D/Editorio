import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import codeRoutes from './routes/code.js';
import { setupWebSocket } from './websocket/presence.js';
import { connect as connectRabbitMQ, consumeMessages, QUEUES } from './services/rabbitmq.js';
import { query } from './db/index.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/code', codeRoutes);

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Create HTTP server
const server = createServer(app);

// Setup WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });
setupWebSocket(wss);

// Start server
const start = async (): Promise<void> => {
  try {
    // Connect to RabbitMQ
    await connectRabbitMQ();

    // Setup document save consumer
    await consumeMessages<{ roomId: string; content: Buffer; timestamp: number }>(
      QUEUES.DOCUMENT_SAVE,
      async (message) => {
        try {
          await query(
            `INSERT INTO documents (room_id, content, version, updated_at)
             VALUES ($1, $2, 1, NOW())
             ON CONFLICT (room_id)
             DO UPDATE SET content = $2, version = documents.version + 1, updated_at = NOW()`,
            [message.roomId, message.content]
          );
          console.log(`Document saved for room ${message.roomId}`);
        } catch (error) {
          console.error('Error saving document:', error);
        }
      }
    );

    server.listen(PORT, () => {
      console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   🚀 Editorio Backend Server                          ║
║                                                       ║
║   HTTP:      http://localhost:${PORT}                   ║
║   WebSocket: ws://localhost:${PORT}/ws                  ║
║   Health:    http://localhost:${PORT}/health            ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
      `);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

start();
