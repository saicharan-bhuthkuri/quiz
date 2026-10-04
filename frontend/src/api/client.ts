const rawEnvApiUrl = (import.meta as unknown as { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL;
export const API_BASE = rawEnvApiUrl
  ? (rawEnvApiUrl.endsWith('/api') ? rawEnvApiUrl : `${rawEnvApiUrl.replace(/\/+$/, '')}/api`)
  : 'http://localhost:5000/api';

export interface AdminUserRecord {
  id: string;
  name: string;
  email: string;
  mobile: string;
  branch: string;
  year: string;
  avatar: string;
  streak: number;
  xp: number;
  badge: string;
  createdAt: string;
}

export interface AdminRecord {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalXp: number;
  totalAttempts: number;
  topBranch: string;
}

export async function apiRegister(data: {
  name: string;
  email: string;
  mobile: string;
  branch: string;
  year: string;
  password: string;
  avatar: string;
}) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function apiAdminLogin(email: string, password: string) {
  const res = await fetch(`${API_BASE}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  return res.json();
}

export async function apiGetAdminUsers(): Promise<{ success: boolean; users: AdminUserRecord[]; count: number }> {
  const res = await fetch(`${API_BASE}/admin/users`);
  return res.json();
}

export async function apiGetAdminStats(): Promise<{ success: boolean; stats: AdminStats }> {
  const res = await fetch(`${API_BASE}/admin/stats`);
  return res.json();
}

export async function apiDeleteUser(id: string): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/users/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function apiSeedUsers(): Promise<{ success: boolean; message?: string }> {
  const res = await fetch(`${API_BASE}/admin/seed`, {
    method: 'POST',
  });
  return res.json();
}

export async function apiGetAdminList(): Promise<{ success: boolean; admins: AdminRecord[]; count: number }> {
  const res = await fetch(`${API_BASE}/admin/list`);
  return res.json();
}

export async function apiAddAdmin(data: {
  name: string;
  email: string;
  password: string;
  role: string;
}): Promise<{ success: boolean; message?: string; error?: string; admin?: AdminRecord }> {
  const res = await fetch(`${API_BASE}/admin/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiRemoveAdmin(id: string): Promise<{ success: boolean; message?: string; error?: string }> {
  const res = await fetch(`${API_BASE}/admin/remove/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function apiRecordQuizAttempt(attempt: {
  userEmail: string;
  userName: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  rankTitle: string;
}) {
  try {
    const res = await fetch(`${API_BASE}/quiz/attempt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(attempt),
    });
    return res.json();
  } catch (err) {
    console.warn('Backend quiz attempt error:', err);
  }
}

/* ==========================================================================
   REAL-TIME EVENTS & COMPETITIONS APIS
   ========================================================================== */

export interface QuizEvent {
  id: string;
  title: string;
  description: string;
  domain: string;
  status: 'UPCOMING' | 'LOBBY' | 'LIVE_NOW' | 'QUESTION_ACTIVE' | 'COMPLETED';
  timerSeconds: number;
  currentQuestionIndex: number;
  questionCount: number;
  registrationCount: number;
  isRegistered?: boolean;
  createdAt: string;
}

export interface EventQuestion {
  id: string;
  eventId: string;
  questionText: string;
  options: string[];
  correctOption?: number;
  explanation?: string;
  points: number;
  timerSeconds: number;
  questionOrder: number;
}

export interface EventParticipant {
  userId: string;
  userName: string;
  userEmail: string;
  registeredAt: string;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  userName: string;
  score: number;
  correctCount: number;
  totalTimeSeconds: number;
}

export async function apiGetEvents(userId?: string): Promise<{ success: boolean; count: number; events: QuizEvent[] }> {
  const url = userId ? `${API_BASE}/events?userId=${encodeURIComponent(userId)}` : `${API_BASE}/events`;
  const res = await fetch(url);
  return res.json();
}

export async function apiGetEventDetail(id: string, userId?: string): Promise<{ success: boolean; event: QuizEvent }> {
  const url = userId ? `${API_BASE}/events/${id}?userId=${encodeURIComponent(userId)}` : `${API_BASE}/events/${id}`;
  const res = await fetch(url);
  return res.json();
}

export async function apiCreateEvent(data: {
  title: string;
  description?: string;
  domain?: string;
  timerSeconds?: number;
}): Promise<{ success: boolean; event: QuizEvent }> {
  const res = await fetch(`${API_BASE}/events`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiUpdateEvent(id: string, data: Partial<QuizEvent>): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiDeleteEvent(id: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/events/${id}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function apiGetEventQuestions(eventId: string, role?: string): Promise<{ success: boolean; count: number; questions: EventQuestion[] }> {
  const url = role ? `${API_BASE}/events/${eventId}/questions?role=${role}` : `${API_BASE}/events/${eventId}/questions`;
  const res = await fetch(url);
  return res.json();
}

export async function apiAddEventQuestion(eventId: string, data: {
  questionText: string;
  options: string[];
  correctOption: number;
  explanation?: string;
  points?: number;
  timerSeconds?: number;
  questionOrder?: number;
}): Promise<{ success: boolean; question?: EventQuestion; message?: string }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiDeleteEventQuestion(eventId: string, qId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/questions/${qId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function apiUpdateEventQuestion(eventId: string, qId: string, data: Partial<EventQuestion>): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/questions/${qId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiRegisterForEvent(eventId: string, user: {
  userId: string;
  userName: string;
  userEmail: string;
}): Promise<{ success: boolean; message: string; totalRegistered: number }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(user),
  });
  return res.json();
}

export async function apiGetEventParticipants(eventId: string): Promise<{ success: boolean; count: number; participants: EventParticipant[] }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/participants`);
  return res.json();
}

export async function apiUnregisterEventParticipant(eventId: string, userId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/participants/${userId}`, {
    method: 'DELETE',
  });
  return res.json();
}

export async function apiGetEventLeaderboard(eventId: string): Promise<{ success: boolean; leaderboard: LeaderboardEntry[] }> {
  const res = await fetch(`${API_BASE}/events/${eventId}/leaderboard`);
  return res.json();
}

export async function apiSubmitDailyQuiz(data: {
  userId: string;
  userName: string;
  userEmail: string;
  quizTopic: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  accuracy: number;
  timeTakenSeconds: number;
}): Promise<{ success: boolean; attemptId: string; xpEarned: number }> {
  const res = await fetch(`${API_BASE}/daily-quiz/submit`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return res.json();
}

export async function apiGetDailyQuizHistory(userEmail: string): Promise<{ success: boolean; count: number; attempts: any[] }> {
  const res = await fetch(`${API_BASE}/daily-quiz/history/${encodeURIComponent(userEmail)}`);
  return res.json();
}

export interface DailyDashboardMetrics {
  totalAttempts: number;
  todayAttempts: number;
  totalXpDistributed: number;
  averageAccuracy: number;
  activeStreaksCount: number;
  totalUsers: number;
}

export interface DailyTopicStat {
  topic: string;
  attempts: number;
  avgAccuracy: number;
  totalXp: number;
}

export interface DailyAttemptRecord {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  quizTopic: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  accuracy: number;
  timeTakenSeconds: number;
  createdAt: string;
}

export interface DailyStreakLeader {
  id: string;
  name: string;
  email: string;
  streak: number;
  xp: number;
  branch: string;
  year: string;
}

export interface DailyDashboardData {
  success: boolean;
  metrics: DailyDashboardMetrics;
  topics: DailyTopicStat[];
  recentAttempts: DailyAttemptRecord[];
  streakLeaders: DailyStreakLeader[];
}

export interface EventDashboardData {
  success: boolean;
  event: QuizEvent;
  metrics: {
    registeredCount: number;
    connectedAttendanceCount: number;
    questionCount: number;
    totalAnswers: number;
    activeParticipants: number;
  };
  registrations: Array<{
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    registeredAt: string;
  }>;
  attendance: Array<{
    userId: string;
    userName: string;
    role?: string;
  }>;
  questions: Array<{
    id: string;
    questionText: string;
    points: number;
    timerSeconds: number;
    order: number;
  }>;
  leaderboard: LeaderboardEntry[];
}

export async function apiGetDailyDashboard(): Promise<DailyDashboardData> {
  const res = await fetch(`${API_BASE}/admin/daily-dashboard`);
  return res.json();
}

export async function apiGetEventDashboard(eventId: string): Promise<EventDashboardData> {
  const res = await fetch(`${API_BASE}/admin/event-dashboard/${eventId}`);
  return res.json();
}

