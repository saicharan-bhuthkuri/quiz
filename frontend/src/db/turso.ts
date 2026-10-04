import { EngiverseUser } from '../auth.ts';
import {
  apiRegister,
  apiLogin,
  apiRecordQuizAttempt,
  apiGetUsers
} from '../api/client.ts';

// ============================================================================
// CLIENT DATABASE INTERFACE (SECURE BACKEND DELEGATION - ZERO CLIENT SECRETS)
// ============================================================================
// Direct database credentials have been permanently removed from client-side code.
// All operations securely transit through authenticated backend API endpoints.

export async function initTursoTables(): Promise<boolean> {
  // Backend automatically initializes tables securely on startup
  return true;
}

export async function registerUserToTurso(data: {
  name: string;
  email: string;
  mobile: string;
  branch: string;
  year: string;
  password: string;
  avatar: string;
}): Promise<{ success: boolean; user?: EngiverseUser; error?: string }> {
  try {
    const res = await apiRegister(data);
    if (res.success && res.user) {
      const user: EngiverseUser = {
        name: res.user.name,
        email: res.user.email,
        mobile: res.user.mobile,
        branch: res.user.branch,
        year: res.user.year,
        discipline: res.user.branch,
        avatar: res.user.avatar,
        streak: res.user.streak || 1,
        xp: res.user.xp || 250,
        badge: res.user.badge || `${data.branch} Engineer`,
        joinedAt: res.user.joinedAt || new Date().toLocaleDateString()
      };
      return { success: true, user };
    }
    return { success: false, error: res.error || 'Failed to complete registration' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during registration';
    return { success: false, error: msg };
  }
}

export async function loginUserFromTurso(
  email: string,
  password: string
): Promise<{ success: boolean; user?: EngiverseUser; error?: string }> {
  try {
    const cleanEmail = email.trim();
    const res = await apiLogin(cleanEmail, password);

    if (res.success && res.user) {
      const user: EngiverseUser = {
        name: res.user.name,
        email: res.user.email,
        mobile: res.user.mobile || '',
        branch: res.user.branch || 'Engineering',
        year: res.user.year || '',
        discipline: res.user.branch || 'Engineering',
        avatar: res.user.avatar || '',
        streak: res.user.streak || 1,
        xp: res.user.xp || 250,
        badge: res.user.badge || 'Verified Engineer',
        joinedAt: res.user.joinedAt || new Date().toLocaleDateString()
      };
      return { success: true, user };
    }

    return { success: false, error: res.error || 'Invalid credentials' };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Network error during authentication';
    return { success: false, error: msg };
  }
}

export async function recordQuizAttemptToTurso(attempt: {
  userEmail: string;
  userName: string;
  score: number;
  totalQuestions: number;
  xpEarned: number;
  rankTitle: string;
}): Promise<void> {
  try {
    await apiRecordQuizAttempt({
      userEmail: attempt.userEmail,
      userName: attempt.userName,
      score: attempt.score,
      totalQuestions: attempt.totalQuestions,
      xpEarned: attempt.xpEarned,
      rankTitle: attempt.rankTitle
    });
  } catch (err) {
    console.warn('[QuizAttempt] Could not synchronize with backend:', err);
  }
}

export async function getAllUsersFromTurso(): Promise<any[]> {
  try {
    const users = await apiGetUsers();
    return users || [];
  } catch (err) {
    console.warn('[Users] Could not fetch users from backend:', err);
    return [];
  }
}
