import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AccessToken } from 'livekit-server-sdk';
import { query } from '../db/index.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  createRoomSchema,
  CreateRoomInput,
  Room,
  RoomParticipant,
} from '../schemas/index.js';
import { getRoomPresence } from '../services/redis.js';

const router: Router = Router();

// Generate a random 8-character room code
const generateRoomCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoiding confusing chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

// Create a new room
router.post(
  '/',
  authenticate,
  validate(createRoomSchema),
  async (req: Request<object, object, CreateRoomInput>, res: Response): Promise<void> => {
    try {
      const { name, language, isPrivate, maxParticipants } = req.body;
      const userId = req.user!.userId;

      // Generate unique room code
      let code = generateRoomCode();
      let attempts = 0;
      while (attempts < 10) {
        const existing = await query<Room>('SELECT id FROM rooms WHERE code = $1', [code]);
        if (existing.rows.length === 0) break;
        code = generateRoomCode();
        attempts++;
      }

      const result = await query<Room>(
        `INSERT INTO rooms (name, code, owner_id, language, is_private, max_participants)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, name, code, language, is_private, max_participants, created_at`,
        [name, code, userId, language, isPrivate, maxParticipants]
      );

      const room = result.rows[0];

      res.status(201).json({
        id: room.id,
        name: room.name,
        code: room.code,
        language: room.language,
        isPrivate: room.is_private,
        maxParticipants: room.max_participants,
        createdAt: room.created_at,
      });
    } catch (error) {
      console.error('Create room error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// Get room by code
router.get('/code/:code', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { code } = req.params;

    const result = await query<Room & { owner_username: string }>(
      `SELECT r.*, u.username as owner_username
       FROM rooms r
       JOIN users u ON r.owner_id = u.id
       WHERE r.code = $1`,
      [code.toUpperCase()]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const room = result.rows[0];
    const presence = await getRoomPresence(room.id);

    res.json({
      id: room.id,
      name: room.name,
      code: room.code,
      language: room.language,
      isPrivate: room.is_private,
      maxParticipants: room.max_participants,
      owner: {
        id: room.owner_id,
        username: room.owner_username,
      },
      participants: presence,
      createdAt: room.created_at,
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get room by ID
router.get('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const result = await query<Room & { owner_username: string }>(
      `SELECT r.*, u.username as owner_username
       FROM rooms r
       JOIN users u ON r.owner_id = u.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const room = result.rows[0];
    const presence = await getRoomPresence(room.id);

    res.json({
      id: room.id,
      name: room.name,
      code: room.code,
      language: room.language,
      isPrivate: room.is_private,
      maxParticipants: room.max_participants,
      owner: {
        id: room.owner_id,
        username: room.owner_username,
      },
      participants: presence,
      createdAt: room.created_at,
    });
  } catch (error) {
    console.error('Get room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get LiveKit access token for a room
router.get('/:id/token', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const user = req.user!;

    // Verify room exists
    const result = await query<Room>('SELECT id, name FROM rooms WHERE id = $1', [id]);

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found' });
      return;
    }

    const room = result.rows[0];

    // Generate LiveKit access token
    const apiKey = process.env.LIVEKIT_API_KEY || 'devkey';
    const apiSecret = process.env.LIVEKIT_API_SECRET || 'secret';

    const at = new AccessToken(apiKey, apiSecret, {
      identity: user.userId,
      name: user.username,
    });

    at.addGrant({
      room: room.id,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    const token = await at.toJwt();

    res.json({
      token,
      roomId: room.id,
      roomName: room.name,
    });
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get user's rooms
router.get('/', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.userId;

    const result = await query<Room>(
      `SELECT id, name, code, language, is_private, max_participants, created_at
       FROM rooms
       WHERE owner_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );

    res.json(
      result.rows.map((room) => ({
        id: room.id,
        name: room.name,
        code: room.code,
        language: room.language,
        isPrivate: room.is_private,
        maxParticipants: room.max_participants,
        createdAt: room.created_at,
      }))
    );
  } catch (error) {
    console.error('Get rooms error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a room
router.delete('/:id', authenticate, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;

    const result = await query<Room>(
      'DELETE FROM rooms WHERE id = $1 AND owner_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Room not found or not authorized' });
      return;
    }

    res.json({ message: 'Room deleted successfully' });
  } catch (error) {
    console.error('Delete room error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
