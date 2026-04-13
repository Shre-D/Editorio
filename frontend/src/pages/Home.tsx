"use client";
import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Code2,
  Plus,
  LogOut,
  Copy,
  Trash2,
  Users,
  ExternalLink,
  Search,
} from 'lucide-react';
import { roomsApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { GlowingOrbs, BorderBeam, ShimmerButton } from '@/components/ui/retro-effects';

interface Room {
  id: string;
  name: string;
  code: string;
  language: string;
  createdAt: string;
}

export default function Home() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [newRoomName, setNewRoomName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    loadRooms();
  }, []);

  const loadRooms = async () => {
    const { data } = await roomsApi.list();
    if (data) {
      setRooms(data);
    }
    setLoading(false);
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) return;
    setCreating(true);

    const { data, error: _error } = await roomsApi.create(newRoomName);
    if (data) {
      navigate(`/room/${data.code}`);
    }
    setCreating(false);
  };

  const handleJoinRoom = () => {
    if (joinCode.trim().length === 8) {
      navigate(`/room/${joinCode.toUpperCase()}`);
    }
  };

  const handleDeleteRoom = async (id: string) => {
    await roomsApi.delete(id);
    loadRooms();
  };

  const copyRoomLink = (code: string) => {
    navigator.clipboard.writeText(`${window.location.origin}/room/${code}`);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="relative min-h-screen bg-background">
      <GlowingOrbs />

      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-lg">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-retro-pink to-retro-purple">
              <Code2 className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">Editorio</span>
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback className="bg-gradient-to-br from-retro-pink to-retro-purple text-white">
                  {user?.username?.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <div className="text-sm font-medium">{user?.username}</div>
                <div className="text-xs text-muted-foreground">{user?.email}</div>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container relative z-10 mx-auto px-4 py-8">
        {/* Actions */}
        <div className="mb-8 grid gap-4 md:grid-cols-2">
          {/* Create Room */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="relative overflow-hidden">
              <BorderBeam size={150} duration={12} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-primary" />
                  Create New Room
                </CardTitle>
                <CardDescription>
                  Start a new coding session and invite your team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="roomName">Room Name</Label>
                    <Input
                      id="roomName"
                      placeholder="My Awesome Project"
                      value={newRoomName}
                      onChange={(e) => setNewRoomName(e.target.value)}
                    />
                  </div>
                  <ShimmerButton
                    onClick={handleCreateRoom}
                    disabled={creating || !newRoomName.trim()}
                    className="w-full"
                  >
                    {creating ? 'Creating...' : 'Create Room'}
                  </ShimmerButton>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Join Room */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Join Existing Room
                </CardTitle>
                <CardDescription>
                  Enter a room code to join your teammates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="joinCode">Room Code</Label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="joinCode"
                        placeholder="ABCD1234"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        className="pl-10 uppercase"
                        maxLength={8}
                      />
                    </div>
                  </div>
                  <Button
                    onClick={handleJoinRoom}
                    disabled={joinCode.length !== 8}
                    variant="outline"
                    className="w-full"
                  >
                    Join Room
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* My Rooms */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <h2 className="mb-4 text-xl font-semibold">My Rooms</h2>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-4 w-3/4 rounded bg-muted" />
                    <div className="mt-2 h-3 w-1/2 rounded bg-muted" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : rooms.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                <Code2 className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-medium">No rooms yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Create your first room to start coding together
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {rooms.map((room, i) => (
                <motion.div
                  key={room.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                >
                  <Card className="group transition-all duration-200 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10">
                    <CardContent className="p-6">
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{room.name}</h3>
                          <p className="text-xs text-muted-foreground">
                            Code: {room.code}
                          </p>
                        </div>
                        <span className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          {room.language}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          onClick={() => navigate(`/room/${room.code}`)}
                          className="flex-1"
                        >
                          <ExternalLink className="mr-2 h-3 w-3" />
                          Open
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyRoomLink(room.code)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDeleteRoom(room.id)}
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}
