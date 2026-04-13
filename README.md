# Editorio

A real-time collaborative code editor with built-in voice/video chat and multi-language code execution. Think Google Docs for code, with a Discord call running on the side and a "Run" button that executes in a sandbox.

> **Status:** Pre-release. Working end-to-end locally via Docker Compose. Not yet hardened for production — see [Production Checklist](#production-checklist).

## Features

- **Live collaborative editing** — Yjs CRDT over WebSocket with per-user cursors, selections, and presence (Monaco editor on the frontend).
- **Voice & video rooms** — LiveKit-powered audio/video calls scoped per room (up to 50 participants).
- **In-browser code execution** — Run JavaScript, TypeScript, Python, Java, C/C++, Go, and Rust via a sandboxed Piston engine.
- **Rooms & invites** — Public/private rooms with 8-character invite codes and configurable participant limits.
- **Auth** — JWT + bcrypt with username/email registration.
- **Multi-server ready** — Redis pub/sub for cross-instance Yjs sync; document state persisted in Postgres.

## Architecture

```
                ┌──────────────────────┐
                │  Frontend (Vite/React)│
                │  Monaco · LiveKit UI  │
                └──────────┬───────────┘
                           │
       ┌───────────────────┼────────────────────┐
       │                   │                    │
   REST/WS            Yjs WebSocket       LiveKit WebRTC
       │                   │                    │
┌──────▼──────┐    ┌───────▼────────┐    ┌─────▼─────┐
│   Backend   │    │   YJS Server   │    │  LiveKit  │
│  Express    │    │  CRDT sync     │    │   SFU     │
│  Auth/Rooms │    │  Persistence   │    └─────┬─────┘
└──┬───┬───┬──┘    └──────┬─────────┘          │
   │   │   │              │                    │
   │   │   ▼              ▼                    ▼
   │   │  ┌────────┐  ┌────────┐         ┌────────┐
   │   └─►│ Redis  │◄─┤Postgres│         │ Redis  │
   │      └────────┘  └────────┘         └────────┘
   ▼
┌────────┐   ┌────────────┐
│RabbitMQ│   │   Piston   │
│ queues │   │ code exec  │
└────────┘   └────────────┘
```

| Service       | Tech                                    | Port    | Purpose                                |
| ------------- | --------------------------------------- | ------- | -------------------------------------- |
| `frontend`    | Vite, React 18, TypeScript, Tailwind    | 5173    | UI (editor, rooms, calls)              |
| `backend`     | Node 20, Express, TypeScript            | 3000    | REST API, auth, room/LiveKit tokens    |
| `yjs-server`  | Node 20, `ws`, Yjs, y-protocols         | 1234    | CRDT sync + document persistence       |
| `postgres`    | PostgreSQL 16                           | 5432    | Users, rooms, document snapshots       |
| `redis`       | Redis 7                                 | 6379    | Presence, pub/sub, LiveKit state       |
| `rabbitmq`    | RabbitMQ 3                              | 5672    | Async document save queue              |
| `piston`      | engineer-man/piston                     | 2000    | Sandboxed code execution               |
| `livekit`     | livekit/livekit-server                  | 7880+   | WebRTC SFU                             |

## Repository Layout

```
.
├── backend/                  # Express API + WebSocket presence
│   └── src/{routes,services,middleware,websocket,db,schemas}
├── yjs-server/               # Yjs WebSocket sync server
│   └── src/index.ts
├── frontend/                 # Vite + React app
│   └── src/{pages,components,hooks,stores,services}
├── scripts/
│   └── install-piston-packages.js   # Bootstrap Piston language runtimes
├── .github/workflows/        # CI pipelines
├── docker-compose.yml        # Full local stack
├── livekit.yaml              # LiveKit server config
└── .env.example              # Required environment variables
```

## Quick Start

### Prerequisites

- Docker + Docker Compose
- Node 20+ (only needed for the Piston bootstrap script)

### 1. Configure environment

```bash
cp .env.example .env
# Edit .env — at minimum, change JWT_SECRET, LIVEKIT_API_SECRET, and DB/RabbitMQ passwords.
```

### 2. Start the stack

```bash
docker compose up -d --build
```

Wait for all health checks to pass (~30s).

### 3. Install Piston language runtimes (one-time)

```bash
node scripts/install-piston-packages.js
```

This pulls Node, Python, Java, GCC, Go, Rust, and TypeScript runtimes into the running Piston container.

### 4. Open the app

- Frontend: <http://localhost:5173>
- Backend health: <http://localhost:3000>
- RabbitMQ UI: <http://localhost:15672> (creds from `.env`)

## Development

Each service can be run locally without Docker (the rest of the stack still needs to be up):

```bash
# Backend
cd backend && pnpm install && pnpm dev

# YJS server
cd yjs-server && pnpm install && pnpm dev

# Frontend
cd frontend && pnpm install && pnpm dev
```

### Build

```bash
# Per service
cd backend     && pnpm build
cd yjs-server  && pnpm build
cd frontend    && pnpm build
```

### Database

The schema in [backend/src/db/init.sql](backend/src/db/init.sql) is auto-applied by the `postgres` container on first boot. Drop the `postgres_data` volume to re-seed:

```bash
docker compose down -v
```

## Environment Variables

| Variable               | Required | Default                  | Notes                                       |
| ---------------------- | -------- | ------------------------ | ------------------------------------------- |
| `POSTGRES_USER`        | yes      | `editorio`               |                                             |
| `POSTGRES_PASSWORD`    | yes      | —                        | **Change in production**                    |
| `POSTGRES_DB`          | yes      | `editorio`               |                                             |
| `RABBITMQ_USER`        | yes      | `editorio`               |                                             |
| `RABBITMQ_PASSWORD`    | yes      | —                        | **Change in production**                    |
| `JWT_SECRET`           | yes      | —                        | **Must** be a high-entropy random string    |
| `LIVEKIT_API_KEY`      | yes      | `devkey`                 | Match against `livekit.yaml` `keys:` block  |
| `LIVEKIT_API_SECRET`   | yes      | `secret`                 | **Change in production**                    |
| `NODE_ENV`             | no       | `development`            |                                             |

## API (high level)

| Method | Path                            | Description                          |
| ------ | ------------------------------- | ------------------------------------ |
| POST   | `/api/auth/register`            | Create account                       |
| POST   | `/api/auth/login`               | Issue JWT                            |
| GET    | `/api/auth/me`                  | Current user (JWT required)          |
| POST   | `/api/rooms`                    | Create a room                        |
| GET    | `/api/rooms/:code`              | Fetch room + LiveKit token           |
| DELETE | `/api/rooms/:code`              | Delete room (owner only)             |
| POST   | `/api/code/run`                 | Execute code via Piston              |

## Production Checklist

This project ships in a runnable state but **needs the following before any non-local deployment**:

- [ ] Replace **all** default passwords/secrets in `.env`, `livekit.yaml`, and `docker-compose.yml`.
- [ ] Front the backend/yjs/livekit ports with TLS (e.g. Caddy, Traefik, or nginx).
- [ ] Add rate limiting on `/api/auth/*` and `/api/code/run`.
- [ ] Lock down CORS to known origins.
- [ ] Move the frontend off the Vite dev server — build it and serve via nginx or a CDN.
- [ ] Switch backend/yjs Dockerfiles to a multi-stage production build (currently use `pnpm dev`).
- [ ] Add resource limits (`mem_limit`, `cpus`) to compose services, especially `piston`.
- [ ] Add monitoring/log aggregation; the services emit to stdout but nothing collects them.
- [ ] Write tests — there are currently none.
- [ ] Set up a database migration tool (Drizzle, Prisma, or node-pg-migrate). The current `init.sql` only runs on first volume init.

## Known Limitations

- No automated tests yet.
- Document persistence relies on a 30-second debounced `setTimeout` per room — fine for a single backend instance, fragile under restarts.
- No RBAC beyond room ownership.
- Code execution input is forwarded to Piston without size limits.

## Contributing

1. Fork & clone.
2. `cp .env.example .env` and fill in dev values.
3. `docker compose up -d` and run the Piston bootstrap.
4. Open a PR with a clear description and screenshots/recordings for UI changes.

## License

[MIT](LICENSE)
