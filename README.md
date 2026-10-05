# ⚡ Engiverse — Competitive Engineering Quiz & Live Multiplayer Arena

> A state-of-the-art competitive quiz and live arena platform built for engineering students and professionals across Computer Science, AI & Machine Learning, Embedded Systems & VLSI, Robotics, Cloud Systems, and Frontier Quantum Technologies.

---

## 🌟 Overview

**Engiverse** connects engineering students and practitioners with daily challenges, real-time multiplayer competitions, synchronized exam broadcasts, and platform rankings powered by **Turso Cloud Database (LibSQL)** and high-frequency **WebSockets**.

### Key Highlights
- 🏆 **Synchronized Live Arena**: Real-time multi-participant competitive quiz sessions driven by a WebSocket orchestrator with millisecond timer accuracy.
- ⚡ **Real-Time Exam Control Room**: Admin host console to launch events, broadcast questions in lockstep, enforce countdown timers, and pause/resume exams.
- 📊 **Dynamic Live Scoreboard & Podium**: Instant leaderboard rankings with streak multipliers, XP tracking, and CSV export.
- 🛡️ **Role-Based Access Control (RBAC) Admin Portal**:
  - **Strict Multi-Tier Authorization**: Only verified **Admin** and **Super Admin** accounts can access the dashboard. Unauthorized roles and participants are denied and redirected.
  - **Cryptographic Security**: HMAC-SHA256 session tokens with constant-time verification, active database validation, and server-side RBAC middleware.
  - **Dynamic Branch Management**: Dedicated UI allowing Admins and Super Admins to create, edit, and safely delete engineering disciplines with automatic student reassignment.
  - **Dynamic Event & Question Bank**: Zero hard-coded events or questions — all content is dynamically authored, stored in Turso DB, and updated live without server restarts.
  - **Slide Bar Navigation**: Collapsible responsive navigation drawer for desktop and mobile.
  - **Users & Admin Management**: Search, discipline/year filters, streak, and XP analytics. Super Admins provision and revoke admin privileges.
- 📡 **24/7 Platform Uptime & Observability**: Integrated UptimeRobot monitor console with live latency charts, heartbeat diagnostics, and monitor controls.
- 📚 **Dynamic Daily Engineering Quizzes**: Self-assessment challenges across engineering realms with instant scorecards and persistent attempt tracking.
- 💎 **Cyber-Glassmorphism UI**: High-fidelity modern interface built with Vanilla CSS design tokens, smooth animations, procedural sound synthesis, and celebratory confetti.

---

## 🛠️ Tech Stack

### Frontend
- **Language & Runtime**: TypeScript, Vite 5
- **Styling**: Vanilla CSS (Tailored Design Tokens, Cyber-Glassmorphism, Micro-animations)
- **Icons**: Lucide Icons
- **Audio Engine**: Web Audio API Procedural Sound Synthesizer
- **Database Client**: `@libsql/client/web` (Direct Turso Cloud DB client fallback)
- **Real-Time**: Native WebSocket client (`wsClient`) with automatic reconnection and state syncing

### Backend
- **Runtime**: Node.js, TypeScript, TSX Watcher
- **Server Framework**: Express 4
- **Security & RBAC**: HMAC-SHA256 signed admin tokens, Zod schema validation, Bcrypt password hashing, sliding-window rate limiters, centralized error handler
- **Real-Time Engine**: WebSocket (`ws`) Server (`/ws`) with admin command authorization
- **Database**: Turso Cloud Database (`@libsql/client` with LibSQL SQLite engine)
- **Monitoring**: UptimeRobot REST API integration for 24/7 ping and service health observability

---

## 📂 Project Architecture

```
quiz/
├── backend/
│   ├── src/
│   │   ├── middleware/
│   │   │   ├── adminAuth.ts       # Cryptographic RBAC middleware (Admin vs Superadmin)
│   │   │   ├── errorHandler.ts    # Centralized error handler & Request ID tracing
│   │   │   ├── rateLimiter.ts     # IP-based sliding window rate limiter
│   │   │   └── validate.ts        # Zod body & query parameter validator
│   │   ├── schemas/
│   │   │   └── index.ts           # Strict Zod schemas for all API payloads
│   │   ├── utils/
│   │   │   ├── adminToken.ts      # HMAC-SHA256 signing & constant-time token verification
│   │   │   └── fileUpload.ts      # Base64 avatar processing & sanitization
│   │   ├── db.ts                  # Turso DB initialization, schema migrations & dynamic helpers
│   │   ├── realtime.ts            # WebSocket quiz engine, room orchestrator & host RBAC gate
│   │   └── server.ts              # REST API routes & HTTP/WebSocket server
│   ├── .env.example               # Backend environment template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts          # Typed REST API client & authenticated request headers
│   │   ├── components/            # Reusable UI components
│   │   │   ├── AudioEffects.ts    # Web Audio API sound synthesizer
│   │   │   ├── Confetti.ts        # Particle physics canvas confetti
│   │   │   ├── ConfirmDialog.ts   # Glassmorphic modal confirmation dialogs
│   │   │   ├── DomainExplorer.ts  # Engineering realms & topic browser
│   │   │   ├── Icons.ts           # Dynamic SVG icons
│   │   │   ├── InteractiveQuiz.ts # Interactive quiz modal runner
│   │   │   ├── Modal.ts           # Accessible modal controller
│   │   │   └── Toast.ts           # Toast notifications system
│   │   ├── db/
│   │   │   └── turso.ts           # LibSQL web client & user session queries
│   │   ├── services/
│   │   │   └── wsClient.ts        # WebSocket client with reconnection & host token handshake
│   │   ├── styles/
│   │   │   ├── auth.css           # Authentication styling
│   │   │   ├── components.css     # Component tokens & slide bar layout
│   │   │   ├── main.css           # Global CSS variables & responsive grid
│   │   │   └── tokens.css         # Color palette, shadows & typography tokens
│   │   ├── views/                 # View controllers
│   │   │   ├── AdminDashboardView.ts  # Unified RBAC Admin management portal
│   │   │   ├── AdminLoginView.ts      # Secure admin gateway
│   │   │   ├── DailyQuizView.ts       # Dynamic daily quiz challenge tracks
│   │   │   ├── EventsListView.ts      # Live competition listings
│   │   │   ├── LandingView.ts         # Engiverse homepage & domain showcase
│   │   │   ├── LiveEventQuizView.ts   # Synchronized participant exam room
│   │   │   ├── LoginView.ts           # Engineer login
│   │   │   ├── ParticipantPortalView.ts # Participant hub (Daily Quiz vs Live Events)
│   │   │   └── RegisterView.ts        # Dynamic branch engineer registration
│   │   ├── auth.ts                # User session management
│   │   ├── main.ts                # Application bootstrapping
│   │   └── router.ts              # Client-side hash router with RBAC route protection
│   ├── .env.example               # Frontend environment template
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore                     # Git ignore rules for node_modules, .env & builds
└── README.md                      # Project documentation
```

---

## 🔐 Role-Based Access Control (RBAC) Architecture

Engiverse implements end-to-end authorization enforced at the routing, WebSocket, and database layers:

| Role | Access Level | Permissions |
| :--- | :--- | :--- |
| **Super Admin** | Full Cloud Access | Provision & revoke administrators, seed database, manage branches, author events/questions, view metrics, configure UptimeRobot, access Admin Dashboard. |
| **Admin** | Dashboard Operations | Manage branches, author & delete events, manage questions, view student rosters, inspect real-time metrics, monitor UptimeRobot, access Admin Dashboard. *(Cannot add or remove other administrators).* |
| **Participant** | Engineer Portal | Participate in live events, take daily quizzes, earn XP & streaks, update profile. **Strictly denied from Admin Dashboard and admin APIs.** |

### Security Guarantees:
- **Zero Frontend Rely-Only**: All admin endpoints are protected server-side with `requireAdminAuth`. Directly calling `/api/admin/*` without an HMAC-signed token returns `401 Unauthorized`.
- **Anti-Bypass Protection**: Directly accessing `/#admin` or `/#admin-dashboard` in the browser URL bar triggers both client-side route guards and an asynchronous backend verification call (`/api/admin/verify-session`). Forged or tampered tokens are rejected, session storage is purged, and unauthorized users are immediately redirected.
- **WebSocket Handshake Validation**: Administrative commands (`ADMIN_*`) sent through WebSockets require valid admin credentials; unauthorized connections are automatically downgraded to `PARTICIPANT`.

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- A free [Turso Database](https://turso.tech/) account (or use the configured cloud database)

---

### 1. Clone & Setup Workspace

```bash
git clone https://github.com/saicharan-bhuthkuri/quiz.git
cd quiz
```

---

### 2. Configure Environment Variables

#### Backend (`backend/.env`)
Copy `backend/.env.example` to `backend/.env` and update credentials:
```env
PORT=5000
TURSO_DATABASE_URL=https://your-turso-database.turso.io
TURSO_AUTH_TOKEN=your_turso_auth_token

# Master Admin Credentials
ADMIN_EMAIL=saicharanbhuthkuri468@gmail.com
ADMIN_PASSWORD=your_secure_password

# UptimeRobot 24/7 Monitoring API (Optional)
UPTIMEROBOT_API_KEY=your_uptimerobot_key
UPTIMEROBOT_MONITOR_ID=your_monitor_id
```

#### Frontend (`frontend/.env`)
Copy `frontend/.env.example` to `frontend/.env`:
```env
VITE_API_URL=http://localhost:5000/api
VITE_TURSO_DATABASE_URL=https://your-turso-database.turso.io
VITE_TURSO_AUTH_TOKEN=your_turso_auth_token
```

---

### 3. Install Dependencies & Run

#### Start Backend (Port 5000)
```bash
cd backend
npm install
npm run dev
```
> The backend REST API and WebSocket server will run at `http://localhost:5000`.

#### Start Frontend (Port 5173)
```bash
cd ../frontend
npm install
npm run dev
```
> The frontend application will be live at `http://localhost:5173/`.

---

## 🌐 Production Deployment Guide

**Engiverse** is architected for decoupled cloud hosting:
- **Frontend**: Hosted on **Firebase Hosting** (High-speed CDN, SPA rewrites, global edge SSL)
- **Backend**: Hosted on **Render** (Node.js Express API + Real-Time WebSocket Server + Turso Cloud DB)

### 1. Deploy Backend to Render

#### Option A: One-Click Blueprint Deployment (Recommended)
1. Navigate to the [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** &rarr; **Blueprint**.
3. Connect your repository: `saicharan-bhuthkuri/quiz`.
4. Render automatically parses [`render.yaml`](render.yaml) and pre-configures:
   - **Service Name**: `engiverse-backend`
   - **Environment**: Node
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Health Check Path**: `/api/health`
5. Supply your secure credentials when prompted:
   - `TURSO_DATABASE_URL`: Your Turso Cloud database URL
   - `TURSO_AUTH_TOKEN`: Your Turso Cloud database auth token
   - `ADMIN_EMAIL`: Your primary superadmin email
   - `ADMIN_PASSWORD`: Your primary admin password
6. Click **Apply**. Render will automatically build, deploy, and provision your live backend.
7. Copy your assigned service URL (e.g., `https://engiverse-backend.onrender.com`).

#### Option B: Manual Web Service Setup
1. In Render, click **New +** &rarr; **Web Service**.
2. Select repository `saicharan-bhuthkuri/quiz`.
3. Set **Root Directory** to `backend`.
4. Set **Build Command** to `npm install && npm run build`.
5. Set **Start Command** to `npm run start`.
6. Add Environment Variables:
   - `PORT`: `10000`
   - `NODE_ENV`: `production`
   - `TURSO_DATABASE_URL`: `<your_turso_url>`
   - `TURSO_AUTH_TOKEN`: `<your_turso_token>`
   - `ADMIN_EMAIL`: `<your_admin_email>`
   - `ADMIN_PASSWORD`: `<your_admin_password>`
   - `CORS_ORIGIN`: `*`
7. Click **Create Web Service**.

---

### 2. Deploy Frontend to Firebase Hosting

#### Step 1: Configure Backend Target URL
In [`frontend/.env.production`](frontend/.env.production), configure your Render backend URL:
```env
VITE_API_URL=https://engiverse-backend.onrender.com/api
VITE_WS_URL=wss://engiverse-backend.onrender.com/ws
```

#### Step 2: Build Frontend Production Assets
```bash
cd frontend
npm run build
```
This generates the optimized production bundle inside `frontend/dist/`.

#### Step 3: Deploy to Firebase Hosting
```bash
# 1. Login to Firebase
firebase login

# 2. Select project
firebase use engiverse

# 3. Deploy
firebase deploy --only hosting
```
> Or directly run from `frontend`:
> ```bash
> npm run deploy:firebase
> ```

Your frontend is now live at:
- `https://engiverse.web.app`
- `https://engiverse.firebaseapp.com`

---

## 📡 API Reference

### Health & Observability
- `GET /api/health` — Service health & uptime status
- `GET /api/uptimerobot/monitor` — UptimeRobot real-time latency & monitor status
- `POST /api/uptimerobot/ping` — Live endpoint connectivity test
- `GET /api/uptimerobot/config` — `[Admin]` Retrieve monitor configuration
- `POST /api/uptimerobot/config` — `[Admin]` Update UptimeRobot API key & monitor ID
- `POST /api/uptimerobot/action` — `[Admin]` Pause or resume uptime monitor

### Authentication & RBAC
- `POST /api/auth/register` — Register a new student or engineer
- `POST /api/auth/login` — Student authentication with bcrypt
- `POST /api/auth/social` — GitHub / Google social authentication
- `POST /api/admin/login` — Secure admin login; returns signed HMAC JWT
- `GET /api/admin/verify-session` — `[Admin]` Validate token signature, expiry, and active DB role
- `GET /api/admin/list` — `[Admin]` List all administrators
- `POST /api/admin/add` — `[Super Admin Only]` Provision a new Admin or Super Admin
- `DELETE /api/admin/remove/:id` — `[Super Admin Only]` Revoke administrator access

### Branch / Discipline Management
- `GET /api/branches` — Retrieve all active engineering branches
- `POST /api/admin/branches` — `[Admin]` Add a new branch dynamically
- `PUT /api/admin/branches/:id` — `[Admin]` Update branch name, code, or description
- `DELETE /api/admin/branches/:id` — `[Admin]` Delete branch with automatic engineer reassignment

### User Directory & Metrics
- `GET /api/admin/users` — `[Admin]` List registered engineers with branch, streak, and XP
- `DELETE /api/admin/users/:id` — `[Admin]` Remove user account
- `GET /api/admin/stats` — `[Admin]` Aggregate platform statistics & branch distribution
- `GET /api/admin/daily-dashboard` — `[Admin]` Daily quiz attempts & activity breakdown
- `GET /api/admin/event-dashboard/:eventId` — `[Admin]` Live event statistics & participant scores

### Dynamic Events & Questions
- `GET /api/events` — Retrieve all active competitive events
- `GET /api/events/:id` — Retrieve event metadata
- `POST /api/events` — `[Admin]` Create a new dynamic event
- `PUT /api/events/:id` — `[Admin]` Update event details
- `DELETE /api/events/:id` — `[Admin]` Permanently delete an event
- `GET /api/events/:id/questions` — List questions for an event
- `POST /api/events/:id/questions` — `[Admin]` Add a question with options, correct answer, points & timer
- `PUT /api/events/:id/questions/:qId` — `[Admin]` Update question content & explanations
- `DELETE /api/events/:id/questions/:qId` — `[Admin]` Remove a question
- `POST /api/events/:id/register` — Register participant for an event
- `GET /api/events/:id/participants` — List registered participants
- `DELETE /api/events/:id/participants/:userId` — `[Admin]` Unregister participant
- `GET /api/events/:id/leaderboard` — Synchronized event leaderboard

### Dynamic Quizzes & Realms
- `GET /api/quiz/daily` — Retrieve dynamic daily quiz tracks loaded from database
- `POST /api/daily-quiz/submit` — Submit daily quiz attempt & record XP
- `GET /api/daily-quiz/history/:userEmail` — Retrieve user's quiz attempt history
- `GET /api/domains` — Retrieve engineering realms, topic lists, and live question counts
- `GET /api/leaderboard` — Platform-wide global XP leaderboard

---

## 🔒 Security Summary

1. **Defense-in-Depth RBAC**: Route guards on the frontend combined with mandatory HMAC-SHA256 signature verification and active database checking on every administrative API endpoint.
2. **Strict Principle of Least Privilege**: Privileged actions like provisioning other administrators are restricted solely to the `SUPERADMIN` role.
3. **Bcrypt & Timing Safety**: Sensitive credentials hashed with salted Bcrypt (10 rounds); token comparisons use `crypto.timingSafeEqual`.
4. **Environment Isolation**: Production tokens, database URIs, and master keys are managed via environment variables and excluded from source control.

---

## 👤 Author

Developed by **Sai Charan Bhuthkuri**  
- Email: [saicharanbhuthkuri468@gmail.com](mailto:saicharanbhuthkuri468@gmail.com)  
- GitHub: [@saicharan-bhuthkuri](https://github.com/saicharan-bhuthkuri)

---

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
