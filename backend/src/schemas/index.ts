import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
  username: z
    .string()
    .min(3, 'Username must be at least 3 characters')
    .max(50, 'Username must be at most 50 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

// Room schemas
export const createRoomSchema = z.object({
  name: z
    .string()
    .min(1, 'Room name is required')
    .max(100, 'Room name must be at most 100 characters'),
  language: z.string().default('javascript'),
  isPrivate: z.boolean().default(false),
  maxParticipants: z.number().min(2).max(50).default(10),
});

export const joinRoomSchema = z.object({
  code: z
    .string()
    .length(8, 'Room code must be 8 characters')
    .regex(/^[A-Z0-9]+$/, 'Invalid room code format'),
});

export const updateRoomSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  language: z.string().optional(),
  isPrivate: z.boolean().optional(),
});

// User presence schema
export const userPresenceSchema = z.object({
  username: z.string(),
  avatarUrl: z.string().url().optional(),
  cursorColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format'),
});

// Types derived from schemas
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateRoomInput = z.infer<typeof createRoomSchema>;
export type JoinRoomInput = z.infer<typeof joinRoomSchema>;
export type UpdateRoomInput = z.infer<typeof updateRoomSchema>;
export type UserPresenceInput = z.infer<typeof userPresenceSchema>;

// Database types
export interface User {
  id: string;
  username: string;
  email: string;
  password_hash: string;
  avatar_url: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface Room {
  id: string;
  name: string;
  code: string;
  owner_id: string;
  language: string;
  is_private: boolean;
  max_participants: number;
  created_at: Date;
  updated_at: Date;
}

export interface RoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  joined_at: Date;
}

export interface Document {
  id: string;
  room_id: string;
  content: Buffer | null;
  version: number;
  created_at: Date;
  updated_at: Date;
}

// JWT payload
export interface JwtPayload {
  userId: string;
  email: string;
  username: string;
}
