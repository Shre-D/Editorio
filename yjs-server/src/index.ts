import { WebSocketServer, WebSocket } from 'ws';
import * as Y from 'yjs';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { Redis } from 'ioredis';
import pg from 'pg';

const { Pool } = pg;

const PORT = parseInt(process.env.PORT || '1234', 10);
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const DATABASE_URL = process.env.DATABASE_URL || 'postgres://localhost:5432/editorio';

// Message types
const messageSync = 0;
const messageAwareness = 1;

// Database connection
const pool = new Pool({ connectionString: DATABASE_URL });

// Redis connections
const redis = new Redis(REDIS_URL);
const publisher = new Redis(REDIS_URL);
const subscriber = new Redis(REDIS_URL);

interface ExtendedWebSocket extends WebSocket {
  roomId?: string;
  awarenessClientId?: number;
  isAlive?: boolean;
}

interface RoomConnection {
  doc: Y.Doc;
  awareness: awarenessProtocol.Awareness;
  conns: Set<ExtendedWebSocket>;
}

// Store for room documents
const rooms = new Map<string, RoomConnection>();

// Get or create room
const getRoom = async (roomId: string): Promise<RoomConnection> => {
  let room = rooms.get(roomId);
  
  if (!room) {
    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);
    
    // Try to load from database
    try {
      const result = await pool.query(
        'SELECT content FROM documents WHERE room_id = $1',
        [roomId]
      );
      
      if (result.rows.length > 0 && result.rows[0].content) {
        Y.applyUpdate(doc, result.rows[0].content);
        console.log(`📄 Loaded document for room ${roomId}`);
      }
    } catch (error) {
      console.error('Error loading document:', error);
    }
    
    room = { doc, awareness, conns: new Set() };
    rooms.set(roomId, room);
    
    // Subscribe to Redis for cross-server sync
    subscriber.subscribe(`yjs:${roomId}`);
    
    // Setup awareness change listener
    awareness.on('update', ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      const changedClients = [...added, ...updated, ...removed];
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageAwareness);
      encoding.writeVarUint8Array(
        encoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients)
      );
      const message = encoding.toUint8Array(encoder);
      
      room!.conns.forEach((conn) => {
        if (conn.readyState === WebSocket.OPEN) {
          conn.send(message);
        }
      });
    });
    
    // Setup document change listener
    doc.on('update', (update: Uint8Array, origin: unknown) => {
      const encoder = encoding.createEncoder();
      encoding.writeVarUint(encoder, messageSync);
      syncProtocol.writeUpdate(encoder, update);
      const message = encoding.toUint8Array(encoder);
      
      // Broadcast to local connections
      room!.conns.forEach((conn) => {
        if (conn.readyState === WebSocket.OPEN && origin !== conn) {
          conn.send(message);
        }
      });
      
      // Publish to Redis for other servers
      if (origin !== 'redis') {
        publisher.publish(`yjs:${roomId}`, Buffer.from(update).toString('base64'));
      }
    });
  }
  
  return room;
};

// Save document to database
const persistDocument = async (roomId: string): Promise<void> => {
  const room = rooms.get(roomId);
  if (!room) return;
  
  try {
    const state = Y.encodeStateAsUpdate(room.doc);
    await pool.query(
      `INSERT INTO documents (room_id, content, version, updated_at)
       VALUES ($1, $2, 1, NOW())
       ON CONFLICT (room_id)
       DO UPDATE SET content = $2, version = documents.version + 1, updated_at = NOW()`,
      [roomId, Buffer.from(state)]
    );
    console.log(`💾 Persisted document for room ${roomId}`);
  } catch (error) {
    console.error('Error persisting document:', error);
  }
};

// Handle Redis messages for cross-server sync
subscriber.on('message', (channel: string, message: string) => {
  const roomId = channel.replace('yjs:', '');
  const room = rooms.get(roomId);
  
  if (room) {
    const update = Buffer.from(message, 'base64');
    Y.applyUpdate(room.doc, update, 'redis');
  }
});

// WebSocket server
const wss = new WebSocketServer({ port: PORT });

wss.on('connection', async (ws: ExtendedWebSocket, req) => {
  ws.isAlive = true;
  
  // Extract room ID from URL
  const roomId = req.url?.slice(1) || 'default';
  ws.roomId = roomId;
  
  console.log(`🔌 Client connected to room: ${roomId}`);
  
  const room = await getRoom(roomId);
  room.conns.add(ws);
  
  // Send initial sync
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, messageSync);
  syncProtocol.writeSyncStep1(encoder, room.doc);
  ws.send(encoding.toUint8Array(encoder));
  
  // Send current awareness state
  const awarenessEncoder = encoding.createEncoder();
  encoding.writeVarUint(awarenessEncoder, messageAwareness);
  encoding.writeVarUint8Array(
    awarenessEncoder,
    awarenessProtocol.encodeAwarenessUpdate(
      room.awareness,
      Array.from(room.awareness.getStates().keys())
    )
  );
  ws.send(encoding.toUint8Array(awarenessEncoder));
  
  ws.on('pong', () => {
    ws.isAlive = true;
  });
  
  ws.on('message', (data: Buffer) => {
    try {
      const decoder = decoding.createDecoder(new Uint8Array(data));
      const messageType = decoding.readVarUint(decoder);
      
      switch (messageType) {
        case messageSync: {
          const encoder = encoding.createEncoder();
          encoding.writeVarUint(encoder, messageSync);
          const syncMessageType = syncProtocol.readSyncMessage(decoder, encoder, room.doc, ws);
          if (encoding.length(encoder) > 1) {
            ws.send(encoding.toUint8Array(encoder));
          }
          break;
        }
        case messageAwareness: {
          awarenessProtocol.applyAwarenessUpdate(
            room.awareness,
            decoding.readVarUint8Array(decoder),
            ws
          );
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log(`🔌 Client disconnected from room: ${roomId}`);
    room.conns.delete(ws);
    
    // Remove awareness state
    if (ws.awarenessClientId !== undefined) {
      awarenessProtocol.removeAwarenessStates(room.awareness, [ws.awarenessClientId], null);
    }
    
    // Persist and cleanup if room is empty
    if (room.conns.size === 0) {
      persistDocument(roomId);
      // Keep document in memory for quick reconnects, cleanup after delay
      setTimeout(() => {
        const currentRoom = rooms.get(roomId);
        if (currentRoom && currentRoom.conns.size === 0) {
          rooms.delete(roomId);
          subscriber.unsubscribe(`yjs:${roomId}`);
          console.log(`🧹 Cleaned up room: ${roomId}`);
        }
      }, 30000); // 30 second delay
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Heartbeat for stale connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    const extWs = ws as ExtendedWebSocket;
    if (extWs.isAlive === false) {
      return ws.terminate();
    }
    extWs.isAlive = false;
    ws.ping();
  });
}, 30000);

// Periodic persistence
const persistInterval = setInterval(() => {
  rooms.forEach((_, roomId) => {
    persistDocument(roomId);
  });
}, 60000); // Every minute

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down...');
  clearInterval(heartbeatInterval);
  clearInterval(persistInterval);
  
  // Persist all documents
  for (const [roomId] of rooms) {
    await persistDocument(roomId);
  }
  
  wss.close();
  await pool.end();
  await redis.quit();
  await publisher.quit();
  await subscriber.quit();
  process.exit(0);
});

console.log(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║   📝 Editorio YJS Server                              ║
║                                                       ║
║   WebSocket: ws://localhost:${PORT}                     ║
║                                                       ║
║   Connect: ws://localhost:${PORT}/{roomId}              ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`);
