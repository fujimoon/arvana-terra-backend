# Arvana-Terra Backend

Real estate and land management platform backend server for the Arvana-Terra application.

## Overview

Arvana-Terra is a comprehensive property management platform for landlords and homeowners in Japan. It provides:
- Land (土地) and Property (物件) management
- Room and tenant management
- Payment tracking
- Equipment and smart device monitoring
- Contract management (NDA, rental, purchase)
- Real-time chat between owners, tenants, and employees
- AI-powered task suggestions and asset valuation
- Business opportunity tracking
- SNS community for real estate professionals
- Vendor (業者) directory managed by admin

## Tech Stack

| Category | Technology |
|---|---|
| Runtime | Node.js 20.x LTS |
| Language | TypeScript 5.x |
| Framework | Express.js 4.x |
| Database | PostgreSQL 16.x |
| ORM | Prisma 5.x |
| Cache | Redis 7.x |
| WebSocket | Socket.io 4.x |
| Auth | JWT (jsonwebtoken 9.x) + bcryptjs |
| Validation | Zod 3.x |
| Logging | Winston 3.x |
| Security | Helmet 7.x + express-rate-limit 7.x |
| AI | OpenAI SDK 4.x |
| File Upload | Multer |
| Encryption | AES-256-GCM (for mynumber) |

## Architecture Overview

```
Client (Web/Mobile)
      |
      | HTTP/REST
      v
Express.js App (src/app.ts)
      |
      +-- Middleware (Helmet, CORS, Rate Limit, Morgan)
      +-- Routes (/api/v1/*)
      |     +-- Auth, Lands, Properties, Rooms
      |     +-- Equipment, SmartDevices, Contracts
      |     +-- Chats, Tasks, Employees, Vendors
      |     +-- Opportunities, Valuation, SNS
      |     +-- Notifications, Preferences, Admin
      +-- Services (business logic)
      +-- Prisma (PostgreSQL)
      +-- Redis (caching/sessions)
      |
      | WebSocket
      v
Socket.io Server
      +-- /chat namespace
      +-- /notification namespace
```

## Database Schema Overview

### Core Models
- **User** - landlord, homeowner, employer, admin, super_admin roles
- **RefreshToken** - JWT refresh token management
- **UserPreference** - preferred regions, notification settings

### Real Estate
- **Land** - land parcels with area, zoning, valuation
- **Property** - buildings linked to land
- **Room** - individual units within properties
- **Tenant** - occupant records per room
- **Payment** - rent payment tracking

### Asset Management
- **Equipment** - property equipment (HVAC, cameras, etc.)
- **SmartDeviceData** - IoT meters and cameras
- **Contract** - NDA, rental, purchase agreements
- **ContractTemplate** - reusable contract templates

### Communication
- **ChatRoom** - property/land/employee/direct channels
- **ChatParticipant** - room membership
- **ChatMessage** - message history
- **Notification** - system notifications

### Business
- **Task** - management tasks (manual + AI-suggested)
- **Employee** - hired staff records (mynumber encrypted)
- **Vendor** - approved business vendors
- **UserVendor** - owner-vendor connections
- **BusinessOpportunity** - investment/sale opportunities
- **AssetValuation** - AI-calculated portfolio values

### Community
- **SnsPost** - community posts (advice, events, knowledge)
- **SnsLike** - post likes
- **SnsComment** - post comments
- **SnsEvent** - event listings

## API Endpoints Summary

### Auth (`/api/v1/auth`)
| Method | Path | Description |
|---|---|---|
| POST | /register | Register new user |
| POST | /login | Login |
| POST | /refresh | Refresh access token |
| POST | /logout | Logout |
| GET | /me | Get current user |
| PUT | /me | Update current user |

### Land (`/api/v1/lands`)
| Method | Path | Description |
|---|---|---|
| GET | / | Public land listing |
| GET | /:id | Public land detail |
| GET | /my | Owner's land list |
| GET | /my/:id | Owner's land detail |
| POST | / | Create land |
| PUT | /:id | Update land |
| DELETE | /:id | Delete land |

### Property (`/api/v1/properties`)
Same pattern as Land endpoints.

### Rooms (`/api/v1/properties/:propertyId/rooms`)
CRUD + Tenant management sub-routes.

### Equipment (`/api/v1/properties/:propertyId/equipment`)
CRUD + `/floor/:floor` for common area equipment.

### Smart Devices (`/api/v1/properties/:propertyId/smart-devices`)
CRUD with camera alert integration.

### Contracts (`/api/v1/contracts`)
CRUD for contracts + `/api/v1/contract-templates` for templates.

### Chat (`/api/v1/chats`)
Chat room management + messages + participants.

### Tasks (`/api/v1/tasks`)
Task CRUD + `/ai-suggest` for AI-generated tasks.

### Vendors (`/api/v1/vendors`)
Public vendor listing + connect/disconnect + admin management.

### SNS (`/api/v1/sns`)
Posts, likes, comments, events, member search.

### Notifications (`/api/v1/notifications`)
Get + mark read + mark all read.

## Socket.io Events

### `/chat` Namespace
| Direction | Event | Payload |
|---|---|---|
| Client→Server | `join_chat` | `chatRoomId: string` |
| Client→Server | `leave_chat` | `chatRoomId: string` |
| Client→Server | `send_message` | `{ chatRoomId, content, messageType? }` |
| Client→Server | `typing` | `{ chatRoomId: string }` |
| Server→Client | `new_message` | Message object |
| Server→Client | `user_typing` | `{ userId, chatRoomId }` |
| Server→Client | `user_joined` | `{ chatRoomId, userId }` |
| Server→Client | `user_left` | `{ chatRoomId, userId }` |

### `/notification` Namespace
| Direction | Event | Payload |
|---|---|---|
| Server→Client | `new_notification` | Notification object |
| Server→Client | `camera_alert` | `{ deviceId, message, notificationId }` |

### Socket.io Authentication
Connect with token in handshake auth:
```javascript
const socket = io('http://localhost:3001/chat', {
  auth: { token: 'your-access-token' }
});
```

## Setup & Startup Instructions

### Prerequisites
- Node.js 20.x
- PostgreSQL 16.x (or Docker)
- Redis 7.x (or Docker)
- npm 10.x

### 1. Clone and navigate
```bash
cd /path/to/arvana-terra-backend
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://terra:terrapass@localhost:5433/arvana_terra
REDIS_URL=redis://localhost:6380
JWT_SECRET=your-super-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
ENCRYPTION_KEY=<64 hex characters - 32 bytes>
OPENAI_API_KEY=sk-your-openai-key
ALLOWED_ORIGINS=http://localhost:5174
```

Generate a secure ENCRYPTION_KEY:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 4. Run Prisma migration
```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Start in development mode
```bash
npm run dev
```

### 6. Start with Docker
```bash
# Set required env vars in .env or shell
export JWT_SECRET=your-secret
export JWT_REFRESH_SECRET=your-refresh-secret
export ENCRYPTION_KEY=your-64-char-hex-key
export OPENAI_API_KEY=sk-your-key

docker-compose up --build
```

The server will be available at `http://localhost:3001`.

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `NODE_ENV` | No | `development` or `production` (default: development) |
| `PORT` | No | Server port (default: 3001) |
| `DATABASE_URL` | Yes | PostgreSQL connection URL |
| `REDIS_URL` | No | Redis URL (default: redis://localhost:6379) |
| `JWT_SECRET` | Yes | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | No | Secret for refresh tokens (falls back to JWT_SECRET) |
| `JWT_EXPIRES_IN` | No | Access token expiry (default: 15m) |
| `JWT_REFRESH_EXPIRES_IN` | No | Refresh token expiry (default: 30d) |
| `ENCRYPTION_KEY` | Yes | 32-byte hex key for AES-256-GCM mynumber encryption |
| `OPENAI_API_KEY` | Yes | OpenAI API key for AI features |
| `ALLOWED_ORIGINS` | No | Comma-separated CORS origins |
| `LOG_LEVEL` | No | Winston log level (default: info) |
| `UPLOAD_DIR` | No | File upload directory (default: ./uploads) |
| `MAX_FILE_SIZE` | No | Max upload size in bytes (default: 10485760 = 10MB) |

## User Roles

| Role | Description |
|---|---|
| `landlord` | 地主 - Land owner |
| `homeowner` | 家主 - Property/building owner |
| `employer` | 雇用者 - From Arvana Work, can join chats |
| `admin` | 管理者 - Can manage vendors |
| `super_admin` | Highest authority |
