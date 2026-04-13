import { create } from 'zustand';

interface Participant {
  userId: string;
  username: string;
  cursorColor: string;
  avatarUrl?: string;
}

interface Room {
  id: string;
  name: string;
  code: string;
  language: string;
  ownerId: string;
}

interface RoomState {
  room: Room | null;
  participants: Participant[];
  isConnected: boolean;
  livekitToken: string | null;
  setRoom: (room: Room) => void;
  setParticipants: (participants: Participant[]) => void;
  addParticipant: (participant: Participant) => void;
  removeParticipant: (userId: string) => void;
  setConnected: (connected: boolean) => void;
  setLivekitToken: (token: string) => void;
  reset: () => void;
}

export const useRoomStore = create<RoomState>((set) => ({
  room: null,
  participants: [],
  isConnected: false,
  livekitToken: null,
  setRoom: (room) => set({ room }),
  setParticipants: (participants) => set({ participants }),
  addParticipant: (participant) =>
    set((state) => ({
      participants: [...state.participants.filter((p) => p.userId !== participant.userId), participant],
    })),
  removeParticipant: (userId) =>
    set((state) => ({
      participants: state.participants.filter((p) => p.userId !== userId),
    })),
  setConnected: (isConnected) => set({ isConnected }),
  setLivekitToken: (livekitToken) => set({ livekitToken }),
  reset: () =>
    set({ room: null, participants: [], isConnected: false, livekitToken: null }),
}));
