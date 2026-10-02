# ⚡ Engiverse — Competitive Engineering Quiz & Live Multiplayer Arena

> A state-of-the-art competitive quiz and live arena platform built for engineering students and professionals across Computer Science, Electronics, AI & Data Science, Mechanical, Civil, Aerospace, and Electrical disciplines.

---

## 🌟 Overview

**Engiverse** connects engineering students and practitioners with daily challenges, real-time multiplayer competitions, synchronized exam broadcasts, and platform rankings powered by **Turso Cloud Database (LibSQL)** and high-frequency **WebSockets**.

### Key Highlights
- 🏆 **Synchronized Live Arena**: Real-time multi-participant competitive quiz sessions driven by a WebSocket orchestrator.
- ⚡ **Real-Time Exam Control Room**: Admin host console to launch events, broadcast questions in lockstep, enforce countdown timers, and pause/resume exams.
- 📊 **Dynamic Live Scoreboard & Podium**: Instant leaderboard rankings with streak multipliers, XP tracking, and CSV export.
- 🛡️ **Comprehensive Admin Portal**:
  - **Slide Bar Navigation**: Collapsible responsive navigation drawer for desktop and mobile.
  - **Users Directory**: Search, branch/year filters, streak, and XP analytics.
  - **Admin & Superadmin Management**: Role-based access control with secure bcrypt authentication.
  - **Integrated Event Operations**: Unified **Add & Remove Events** hub with live preview and permanent deletion safety controls.
  - **Participant Management & Question Sets**: Per-event question ordering, points, custom timers, and direct participant enrollment.
- 📚 **Daily Engineering Quizzes**: Rapid self-assessment quizzes across all engineering branches with instant scorecards and Turso DB attempt logging.
- 💎 **Cyber-Glassmorphism UI**: High-fidelity modern interface built with Vanilla CSS design tokens, smooth animations, and sound effects.

---

## 🛠️ Tech Stack

### Frontend
- **Language & Runtime**: TypeScript, Vite 5
- **Styling**: Vanilla CSS (Tailored Design Tokens, Glassmorphism, Micro-animations)
- **Icons**: Lucide Icons
- **Audio Engine**: Web Audio API Sound Effects Synthesizer
- **Database Client**: `@libsql/client/web` (Direct Turso Cloud DB client fallback)
- **Real-Time**: Native WebSocket client (`wsClient`)

### Backend
- **Runtime**: Node.js, TypeScript, TSX Watcher
- **Server Framework**: Express 4
- **Real-Time Engine**: WebSocket (`ws`) Server (`/ws`)
- **Database**: Turso Cloud Database (`@libsql/client`)
- **Security**: Bcrypt password hashing, CORS, environment isolation

---

## 📂 Project Architecture

```
quiz/
├── backend/
│   ├── src/
│   │   ├── db.ts               # Turso database initialization, schema & seeders
│   │   ├── realtime.ts         # WebSocket multiplayer engine & room broadcaster
│   │   └── server.ts           # REST API endpoints & HTTP/WebSocket server
│   ├── .env.example            # Backend environment template
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── api/
│   │   │   └── client.ts       # Typed REST API client & response interfaces
│   │   ├── components/         # Reusable UI components & modals
│   │   │   ├── AudioEffects.ts # Procedural sound engine
│   │   │   ├── Icons.ts        # Dynamic SVG icons
│   │   │   ├── Modal.ts        # Dialogs & modals
│   │   │   └── Toast.ts        # Notification system
│   │   ├── db/
│   │   │   └── turso.ts        # Direct LibSQL web client & fallbacks
│   │   ├── services/
│   │   │   └── wsClient.ts     # WebSocket client with auto-reconnection
│   │   ├── styles/
│   │   │   ├── auth.css        # Authentication styling
│   │   │   ├── components.css  # Component tokens & slide bar layout
│   │   │   └── main.css        # Global CSS variables & reset
│   │   ├── views/              # View controllers
│   │   │   ├── AdminDashboardView.ts  # Unified Admin management portal
│   │   │   ├── AdminLoginView.ts      # Secure admin gateway
│   │   │   ├── DailyQuizView.ts       # Daily challenge quizzes
│   │   │   ├── EventsListView.ts      # Live competition listings
│   │   │   ├── LandingView.ts         # Engiverse homepage
│   │   │   ├── LiveEventQuizView.ts   # Participant exam room
│   │   │   ├── LoginView.ts           # Engineer login
│   │   │   ├── ParticipantPortalView.ts
│   │   │   └── RegisterView.ts        # Engineer onboarding
│   │   ├── main.ts             # Application bootstrapping
│   │   └── router.ts           # Client-side hash router
│   ├── .env.example            # Frontend environment template
│   ├── index.html
│   ├── package.json
│   └── vite.config.ts
│
├── .gitignore                  # Git ignore rules for node_modules, .env & builds
└── README.md                   # Project documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [npm](https://www.npmjs.com/)
- A free [Turso Database](https://turso.tech/) account (or use the configured demo database)

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

# Admin Credentials
ADMIN_EMAIL=saicharanbhuthkuri468@gmail.com
ADMIN_PASSWORD=your_secure_password
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
> The backend server and WebSocket broadcaster will be active at `http://localhost:5000`.

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
   - `TURSO_AUTH_TOKEN`: Your Turso Cloud database auth token
   - `ADMIN_PASSWORD`: Your admin password
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
   - `TURSO_DATABASE_URL`: `https://engiverse-rushanth.aws-ap-south-1.turso.io`
   - `TURSO_AUTH_TOKEN`: `<your_turso_token>`
   - `ADMIN_EMAIL`: `saicharanbhuthkuri468@gmail.com`
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
# 1. Login to Firebase (opens browser for Google authentication)
firebase login

# 2. Select or create project "engiverse"
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

## 📡 API Endpoints

### Health & Analytics
- `GET /api/health` — Service health check
- `GET /api/admin/stats` — Total registered engineers, platform XP, and top branches

### Authentication & Users
- `POST /api/auth/register` — Register a new student or engineer
- `POST /api/auth/login` — User authentication with bcrypt
- `POST /api/admin/login` — Secure admin gateway
- `GET /api/admin/users` — List registered engineers from Turso DB
- `DELETE /api/admin/users/:id` — Delete user account
- `POST /api/admin/seed` — Seed sample engineering records

### Events & Multiplayer
- `GET /api/events` — Retrieve all competitive events
- `POST /api/events` — Create a new competitive event
- `PUT /api/events/:id` — Update event configuration
- `DELETE /api/events/:id` — Permanently delete an event
- `GET /api/events/:id/questions` — List questions for an event
- `POST /api/events/:id/questions` — Add question with points & timer
- `POST /api/events/:id/register` — Register participant for an event
- `GET /api/events/:id/leaderboard` — Live synchronized scoreboard

---

## 🔒 Security Best Practices
- Environment credentials (`.env`) are strictly excluded via `.gitignore`.
- Admin endpoints verify tokens and credentials securely.
- Sensitive superadministrator accounts are protected from accidental deletion.

---

## 👤 Author

Developed by **Sai Charan Bhuthkuri**  
- Email: [saicharanbhuthkuri468@gmail.com](mailto:saicharanbhuthkuri468@gmail.com)  
- GitHub: [@saicharan-bhuthkuri](https://github.com/saicharan-bhuthkuri)

---

## 📄 License
This project is open-source and available under the [MIT License](LICENSE).
