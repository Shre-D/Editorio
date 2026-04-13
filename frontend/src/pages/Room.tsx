"use client";
import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Editor, { OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import {
  LiveKitRoom,
  RoomAudioRenderer,
  useTracks,
  useLocalParticipant,
  useParticipants,
  VideoTrack,
  AudioTrack,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Track } from 'livekit-client';
import {
  Code2,
  Users,
  Check,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Phone,
  ChevronLeft,
  ChevronRight,
  Terminal,
  Play,
  Share2,
  X,
  Maximize2,
  Loader2,
} from 'lucide-react';
import { roomsApi, codeApi } from '@/services/api';
import { useAuthStore } from '@/stores/authStore';
import { useRoomStore } from '@/stores/roomStore';
import { useYjs } from '@/hooks/useYjs';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';

const LIVEKIT_URL = import.meta.env.VITE_LIVEKIT_URL || 'ws://localhost:7880';

// Language options for Monaco
const LANGUAGES = [
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'cpp', label: 'C++' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'json', label: 'JSON' },
];

export default function Room() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { room, setRoom, participants, setParticipants, livekitToken, setLivekitToken } = useRoomStore();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editor, setEditor] = useState<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const [language, setLanguage] = useState('javascript');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  
  // Code execution state
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<{ type: 'stdout' | 'stderr' | 'info'; content: string }[]>([]);
  
  // Maximized video state
  const [maximizedParticipant, setMaximizedParticipant] = useState<string | null>(null);

  // Random cursor color for this session
  const cursorColor = useRef(
    ['#FF6B35', '#F72585', '#7209B7', '#4CC9F0', '#06D6A0'][Math.floor(Math.random() * 5)]
  ).current;

  // Initialize YJS
  useYjs({
    roomId: room?.id || '',
    editor,
    username: user?.username || 'Anonymous',
    cursorColor,
  });

  useEffect(() => {
    if (!roomCode) return;
    loadRoom();
  }, [roomCode]);

  // ESC key to close maximized video
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && maximizedParticipant) {
        setMaximizedParticipant(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [maximizedParticipant]);

  const loadRoom = async () => {
    setLoading(true);
    setError('');

    // Get room details
    const { data: roomData, error: roomError } = await roomsApi.getByCode(roomCode!);
    if (roomError) {
      setError('Room not found');
      setLoading(false);
      return;
    }

    setRoom(roomData);
    setParticipants(roomData.participants || []);
    setLanguage(roomData.language || 'javascript');

    // Get LiveKit token
    const { data: tokenData, error: tokenError } = await roomsApi.getToken(roomData.id);
    if (tokenError) {
      console.error('Failed to get LiveKit token:', tokenError);
    } else if (tokenData) {
      setLivekitToken(tokenData.token);
    }

    setLoading(false);
  };

  const handleEditorMount: OnMount = (editorInstance) => {
    setEditor(editorInstance);
    
    // Configure Monaco theme
    editorInstance.updateOptions({
      theme: 'vs-dark',
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
      minimap: { enabled: true },
      scrollBeyondLastLine: false,
      wordWrap: 'on',
      lineNumbers: 'on',
      renderLineHighlight: 'all',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: 'on',
      smoothScrolling: true,
      padding: { top: 16 },
    });
  };

  const copyRoomLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const runCode = async () => {
    if (!editor) return;
    
    const code = editor.getValue();
    if (!code.trim()) {
      setOutput([{ type: 'info', content: 'No code to run' }]);
      return;
    }

    setIsRunning(true);
    setOutput([{ type: 'info', content: `Running ${language}...` }]);

    try {
      const { data, error } = await codeApi.execute(language, code);
      
      if (error) {
        setOutput([{ type: 'stderr', content: error }]);
      } else if (data) {
        const results: { type: 'stdout' | 'stderr' | 'info'; content: string }[] = [];
        
        if (data.compile?.stderr) {
          results.push({ type: 'stderr', content: `Compile Error:\n${data.compile.stderr}` });
        }
        if (data.stdout) {
          results.push({ type: 'stdout', content: data.stdout });
        }
        if (data.stderr) {
          results.push({ type: 'stderr', content: data.stderr });
        }
        if (results.length === 0) {
          results.push({ type: 'info', content: `Program exited with code ${data.exitCode}` });
        } else {
          results.push({ type: 'info', content: `\nExit code: ${data.exitCode}` });
        }
        
        setOutput(results);
      }
    } catch (err) {
      setOutput([{ type: 'stderr', content: 'Failed to execute code. Make sure Piston is running.' }]);
    } finally {
      setIsRunning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          <p className="text-muted-foreground">Loading room...</p>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-background">
        <Code2 className="mb-4 h-16 w-16 text-muted-foreground" />
        <h1 className="mb-2 text-2xl font-bold">Room Not Found</h1>
        <p className="mb-6 text-muted-foreground">{error}</p>
        <Button onClick={() => navigate('/')}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-border/50 bg-card/50 px-4">
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-retro-pink to-retro-purple">
              <Code2 className="h-4 w-4 text-white" />
            </div>
          </Link>
          <div className="hidden md:block">
            <h1 className="font-semibold">{room?.name}</h1>
            <p className="text-xs text-muted-foreground">Room: {room?.code}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm focus:border-primary focus:outline-none"
          >
            {LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>

          {/* Share Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={copyRoomLink}
            className="gap-2"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Share2 className="h-4 w-4" />
                Share
              </>
            )}
          </Button>

          {/* Run Button */}
          <Button 
            size="sm" 
            className="gap-2 bg-retro-green hover:bg-retro-green/90"
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4" />
                Run
              </>
            )}
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={{ width: sidebarOpen ? 320 : 0 }}
          animate={{ width: sidebarOpen ? 320 : 0 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "flex-shrink-0 border-r border-border/50 bg-card/30 overflow-hidden"
          )}
        >
          <div className="flex h-full w-[320px] flex-col">
            {/* Participants */}
            <div className="flex-shrink-0 border-b border-border/50 p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Users className="h-4 w-4" />
                Participants ({participants.length + 1})
              </h3>
              <div className="space-y-2">
                {/* Current user */}
                <div className="flex items-center gap-3 rounded-lg bg-primary/10 p-2">
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback
                        style={{ backgroundColor: cursorColor }}
                        className="text-white text-xs"
                      >
                        {user?.username?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{user?.username} (You)</div>
                    <div className="text-xs text-muted-foreground">Host</div>
                  </div>
                </div>

                {/* Other participants */}
                {participants.map((p) => (
                  <div key={p.userId} className="flex items-center gap-3 rounded-lg p-2 hover:bg-muted/50">
                    <div className="relative">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback
                          style={{ backgroundColor: p.cursorColor }}
                          className="text-white text-xs"
                        >
                          {p.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{p.username}</div>
                      <div className="text-xs text-muted-foreground">Editing</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Video Area */}
            <div className="flex-1 overflow-y-auto p-4">
              {livekitToken ? (
                <LiveKitRoom
                  serverUrl={LIVEKIT_URL}
                  token={livekitToken}
                  connect={true}
                  video={true}
                  audio={true}
                  options={{
                    publishDefaults: {
                      videoCodec: 'vp8',
                    },
                    adaptiveStream: true,
                    dynacast: true,
                  }}
                  className="h-full"
                >
                  <RoomAudioRenderer />
                  <VideoTiles 
                    onMaximize={setMaximizedParticipant} 
                    maximizedParticipant={maximizedParticipant}
                  />
                  <MediaControls />
                </LiveKitRoom>
              ) : (
                <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-dashed border-border/50 text-center">
                  <Video className="h-8 w-8 text-muted-foreground mb-2" />
                  <p className="text-sm text-muted-foreground">Connecting to video...</p>
                </div>
              )}
            </div>
          </div>
        </motion.aside>

        {/* Sidebar Toggle */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex h-full w-4 flex-shrink-0 items-center justify-center border-r border-border/50 bg-card/30 hover:bg-muted/50 transition-colors"
        >
          {sidebarOpen ? (
            <ChevronLeft className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {/* Editor Area */}
        <main className="flex flex-1 flex-col overflow-hidden">
          {/* Monaco Editor */}
          <div className="flex-1">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              defaultValue="// Welcome to Editorio!\n// Start coding together in real-time.\n\nfunction hello() {\n  console.log('Hello, World!');\n}\n\nhello();"
              onMount={handleEditorMount}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: true },
                wordWrap: 'on',
                padding: { top: 16 },
              }}
            />
          </div>

          {/* Console/Output Area */}
          <div className="h-40 flex-shrink-0 border-t border-border/50 bg-card/30">
            <div className="flex h-8 items-center gap-2 border-b border-border/50 px-4">
              <Terminal className="h-4 w-4 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground">Output</span>
              {output.length > 0 && (
                <button 
                  onClick={() => setOutput([])}
                  className="ml-auto text-xs text-muted-foreground hover:text-foreground"
                >
                  Clear
                </button>
              )}
            </div>
            <div className="p-4 font-mono text-sm overflow-auto h-[calc(100%-2rem)]">
              {output.length === 0 ? (
                <span className="text-muted-foreground">
                  <span className="text-green-500">{'>'}</span> Ready to run...
                </span>
              ) : (
                output.map((line, i) => (
                  <div 
                    key={i} 
                    className={cn(
                      "whitespace-pre-wrap",
                      line.type === 'stderr' && "text-red-400",
                      line.type === 'stdout' && "text-green-400",
                      line.type === 'info' && "text-muted-foreground"
                    )}
                  >
                    {line.content}
                  </div>
                ))
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Maximized Video Modal */}
      <AnimatePresence>
        {maximizedParticipant && livekitToken && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
            onClick={() => setMaximizedParticipant(null)}
          >
            <button
              onClick={() => setMaximizedParticipant(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            >
              <X className="h-6 w-6 text-white" />
            </button>
            <LiveKitRoom
              serverUrl={LIVEKIT_URL}
              token={livekitToken}
              connect={true}
              audio={false}
              video={false}
              className="w-full h-full max-w-5xl max-h-[80vh]"
            >
              <MaximizedVideoView participantIdentity={maximizedParticipant} />
            </LiveKitRoom>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Media controls component using LiveKit hooks
function MediaControls() {
  const { localParticipant } = useLocalParticipant();
  const navigate = useNavigate();
  
  const [isMicEnabled, setIsMicEnabled] = useState(false);
  const [isCameraEnabled, setIsCameraEnabled] = useState(false);

  useEffect(() => {
    if (localParticipant) {
      setIsMicEnabled(localParticipant.isMicrophoneEnabled);
      setIsCameraEnabled(localParticipant.isCameraEnabled);
    }
  }, [localParticipant?.isMicrophoneEnabled, localParticipant?.isCameraEnabled]);

  const toggleMic = async () => {
    if (!localParticipant) return;
    await localParticipant.setMicrophoneEnabled(!isMicEnabled);
    setIsMicEnabled(!isMicEnabled);
  };

  const toggleCamera = async () => {
    if (!localParticipant) return;
    await localParticipant.setCameraEnabled(!isCameraEnabled);
    setIsCameraEnabled(!isCameraEnabled);
  };

  return (
    <div className="flex-shrink-0 border-t border-border/50 p-4 mt-auto">
      <div className="flex items-center justify-center gap-2">
        <Button
          variant={isMicEnabled ? "default" : "outline"}
          size="icon"
          onClick={toggleMic}
          className={cn(
            "h-10 w-10 rounded-full",
            isMicEnabled && "bg-primary"
          )}
        >
          {isMicEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
        </Button>
        <Button
          variant={isCameraEnabled ? "default" : "outline"}
          size="icon"
          onClick={toggleCamera}
          className={cn(
            "h-10 w-10 rounded-full",
            isCameraEnabled && "bg-primary"
          )}
        >
          {isCameraEnabled ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
        </Button>
        <Button
          variant="destructive"
          size="icon"
          className="h-10 w-10 rounded-full"
          onClick={() => navigate('/')}
        >
          <Phone className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// Video tiles component for LiveKit
interface VideoTilesProps {
  onMaximize: (identity: string | null) => void;
  maximizedParticipant: string | null;
}

function VideoTiles({ onMaximize }: VideoTilesProps) {
  const videoTracks = useTracks([Track.Source.Camera]);
  const audioTracks = useTracks([Track.Source.Microphone]);
  const participants = useParticipants();

  return (
    <div className="grid gap-3 mb-4">
      {participants.map((participant) => {
        const videoTrack = videoTracks.find(t => t.participant.identity === participant.identity);
        const audioTrack = audioTracks.find(t => t.participant.identity === participant.identity);
        
        return (
          <div
            key={participant.identity}
            className={cn(
              "relative aspect-video rounded-xl overflow-hidden bg-muted/50 group cursor-pointer transition-all",
              "hover:ring-2 hover:ring-primary/50"
            )}
            onClick={() => onMaximize(participant.identity)}
          >
            {videoTrack ? (
              <VideoTrack
                trackRef={videoTrack}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="bg-gradient-to-br from-retro-pink to-retro-purple text-white text-xl">
                    {participant.identity.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
            )}
            
            {/* Audio track (hidden but processing) */}
            {audioTrack && (
              <AudioTrack trackRef={audioTrack} />
            )}
            
            {/* Overlay with name and maximize button */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="absolute bottom-0 left-0 right-0 p-3 flex items-center justify-between">
                <span className="text-white text-sm font-medium truncate">
                  {participant.identity}
                  {participant.isLocal && ' (You)'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onMaximize(participant.identity);
                  }}
                  className="p-1.5 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <Maximize2 className="h-4 w-4 text-white" />
                </button>
              </div>
            </div>
            
            {/* Mic indicator */}
            {!participant.isMicrophoneEnabled && (
              <div className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500/80">
                <MicOff className="h-3 w-3 text-white" />
              </div>
            )}
          </div>
        );
      })}
      
      {participants.length === 0 && (
        <div className="aspect-video rounded-xl border border-dashed border-border/50 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">No participants yet</p>
        </div>
      )}
    </div>
  );
}

// Maximized video view
function MaximizedVideoView({ participantIdentity }: { participantIdentity: string }) {
  const videoTracks = useTracks([Track.Source.Camera]);
  const participants = useParticipants();
  
  const participant = participants.find(p => p.identity === participantIdentity);
  const videoTrack = videoTracks.find(t => t.participant.identity === participantIdentity);

  if (!participant) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white">
        Participant not found
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-2xl overflow-hidden bg-black" onClick={(e) => e.stopPropagation()}>
      {videoTrack ? (
        <VideoTrack
          trackRef={videoTrack}
          className="w-full h-full object-contain"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          <Avatar className="h-32 w-32">
            <AvatarFallback className="bg-gradient-to-br from-retro-pink to-retro-purple text-white text-5xl">
              {participant.identity.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </div>
      )}
      
      {/* Name badge */}
      <div className="absolute bottom-4 left-4 px-4 py-2 rounded-lg bg-black/50 backdrop-blur">
        <span className="text-white font-medium">
          {participant.identity}
          {participant.isLocal && ' (You)'}
        </span>
      </div>
    </div>
  );
}
