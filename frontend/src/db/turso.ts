import { createClient } from '@libsql/client/web';
import { EngiverseUser } from '../auth.ts';

// Turso Database Credentials
export const TURSO_CONFIG = {
  url: 'https://engiverse-rushanth.aws-ap-south-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3OTA5MjEyMTIsImlkIjoiMDFhMGZiMzgtZWMwMS03ZGRjLWE4N2QtMmQyZTM3OWE1MGI3Iiwia2lkIjoiRHNtR3R3NEFOel94SGQtSDdTb1poR0NrZnF4UHUwdkV6Z2l1cm5sRWFvcyIsInJpZCI6IjllYzVjMTUzLWM4NTgtNDVlMC1hOTBjLThjYjVlYjNmZTc0MSJ9.QqJXq5S_ySTuwlO6rzWqTTVxC7w2kIxLCTvcQia3jTsQDtP0Riql1SsDAEyyLkfuDLay76y-LZWDljKVZ_tiBA'
};

export const tursoClient = createClient({
  url: TURSO_CONFIG.url,
  authToken: TURSO_CONFIG.authToken,
});

export async function initTursoTables(): Promise<boolean> {
  try {
    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        mobile TEXT,
        branch TEXT,
        year TEXT,
        password TEXT NOT NULL,
        avatar TEXT,
        streak INTEGER DEFAULT 1,
        xp INTEGER DEFAULT 250,
        badge TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await tursoClient.execute(`
      CREATE TABLE IF NOT EXISTS quiz_attempts (
        id TEXT PRIMARY KEY,
        user_email TEXT,
        user_name TEXT,
        score INTEGER,
        total_questions INTEGER,
        xp_earned INTEGER,
        accuracy INTEGER,
        rank_title TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    return true;
  } catch (err) {
    console.warn('Turso DB table initialization check:', err);
    return false;
  }
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
    // Check if user already exists
    const existing = await tursoClient.execute({
      sql: 'SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;',
      args: [data.email.trim()]
    });

    if (existing.rows.length > 0) {
      return { success: false, error: 'An engineer account with this email already exists.' };
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    const badge = `${data.branch} Engineer`;

    await tursoClient.execute({
      sql: `INSERT INTO users (id, name, email, mobile, branch, year, password, avatar, streak, xp, badge, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 250, ?, datetime('now'));`,
      args: [
        userId,
        data.name.trim(),
        data.email.trim(),
        data.mobile.trim(),
        data.branch,
        data.year,
        data.password,
        data.avatar,
        badge
      ]
    });

    const user: EngiverseUser = {
      name: data.name.trim(),
      email: data.email.trim(),
      mobile: data.mobile.trim(),
      branch: data.branch,
      year: data.year,
      discipline: data.branch,
      avatar: data.avatar,
      streak: 1,
      xp: 250,
      badge,
      joinedAt: new Date().toLocaleDateString()
    };

    return { success: true, user };
  } catch (err: unknown) {
    console.error('Turso Registration Error:', err);
    const msg = err instanceof Error ? err.message : 'Database error occurred';
    return { success: false, error: msg };
  }
}

export async function loginUserFromTurso(
  email: string,
  password: string
): Promise<{ success: boolean; user?: EngiverseUser; error?: string }> {
  try {
    const cleanEmail = email.trim();
    const isSuperAdminCreds = cleanEmail.toLowerCase() === 'saicharanbhuthkuri468@gmail.com' && password === 'Charan@468';

    // 1. Try Backend API first if available (supports secure bcrypt verification)
    try {
      const apiRes = await fetch('http://localhost:5000/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password })
      });
      const apiData = await apiRes.json();
      if (apiData.success && apiData.user) {
        return { success: true, user: apiData.user };
      }
    } catch (_) {
      // Backend offline or unreachable, continue with direct Turso query
    }

    // 2. Query Turso users table
    let res = await tursoClient.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;',
      args: [cleanEmail]
    });

    // 3. If not found in users, check admins table
    if (res.rows.length === 0) {
      const adminRes = await tursoClient.execute({
        sql: 'SELECT * FROM admins WHERE LOWER(email) = LOWER(?) LIMIT 1;',
        args: [cleanEmail]
      });

      if (adminRes.rows.length > 0 || isSuperAdminCreds) {
        const aRow = adminRes.rows[0];
        const aPwd = aRow ? String(aRow.password || '') : '';
        const match = isSuperAdminCreds || aPwd === password;

        if (match) {
          const superUser: EngiverseUser = {
            name: aRow ? String(aRow.name) : 'Sai Charan Bhuthkuri',
            email: cleanEmail,
            mobile: '+91 99999 99999',
            branch: 'Computer Systems & AI',
            year: 'Staff Principal',
            discipline: 'Computer Systems & AI',
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            streak: 50,
            xp: 99999,
            badge: `${(aRow?.role as string) || 'SUPERADMIN'} • Principal Systems Architect`,
            joinedAt: new Date().toLocaleDateString()
          };

          try {
            await tursoClient.execute({
              sql: `INSERT OR REPLACE INTO users (id, name, email, mobile, branch, year, password, avatar, streak, xp, badge, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 50, 99999, ?, datetime('now'));`,
              args: [
                String(aRow?.id || 'usr_saicharan_super'),
                String(superUser.name),
                String(cleanEmail),
                String(superUser.mobile),
                String(superUser.branch),
                String(superUser.year),
                String(password),
                String(superUser.avatar),
                String(superUser.badge)
              ]
            });
          } catch (_) {}

          return { success: true, user: superUser };
        } else {
          return { success: false, error: 'Incorrect password entered.' };
        }
      }

      return { success: false, error: 'No account found with this email address.' };
    }

    const row = res.rows[0];
    const dbPassword = String(row.password || '');
    const isMatched = (dbPassword === password) || isSuperAdminCreds;

    if (!isMatched) {
      return { success: false, error: 'Incorrect password entered.' };
    }

    const user: EngiverseUser = {
      name: String(row.name || ''),
      email: String(row.email || ''),
      mobile: String(row.mobile || ''),
      branch: String(row.branch || 'Engineering'),
      year: String(row.year || ''),
      discipline: String(row.branch || 'Engineering'),
      avatar: String(row.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80'),
      streak: Number(row.streak || 1),
      xp: Number(row.xp || 250),
      badge: String(row.badge || 'Verified Engineer'),
      joinedAt: String(row.created_at || new Date().toLocaleDateString())
    };

    return { success: true, user };
  } catch (err: unknown) {
    console.error('Turso Login Error:', err);
    const msg = err instanceof Error ? err.message : 'Database connection error';
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
    const attemptId = 'att_' + Math.random().toString(36).substring(2, 11);
    const accuracy = Math.round((attempt.score / attempt.totalQuestions) * 100);

    await tursoClient.execute({
      sql: `INSERT INTO quiz_attempts (id, user_email, user_name, score, total_questions, xp_earned, accuracy, rank_title, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
      args: [
        attemptId,
        attempt.userEmail,
        attempt.userName,
        attempt.score,
        attempt.totalQuestions,
        attempt.xpEarned,
        accuracy,
        attempt.rankTitle
      ]
    });

    // Update user streak and XP in database
    if (attempt.userEmail) {
      await tursoClient.execute({
        sql: `UPDATE users SET xp = xp + ?, streak = streak + 1 WHERE LOWER(email) = LOWER(?);`,
        args: [attempt.xpEarned, attempt.userEmail]
      });
    }
  } catch (err) {
    console.warn('Error recording quiz attempt in Turso:', err);
  }
}

export async function getAllUsersFromTurso(): Promise<any[]> {
  try {
    const res = await tursoClient.execute(`
      SELECT id, name, email, mobile, branch, year, avatar, streak, xp, badge, created_at
      FROM users
      ORDER BY created_at DESC;
    `);
    return res.rows.map(row => ({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      mobile: String(row.mobile || '—'),
      branch: String(row.branch || 'General'),
      year: String(row.year || '—'),
      avatar: String(row.avatar || ''),
      streak: Number(row.streak || 0),
      xp: Number(row.xp || 0),
      badge: String(row.badge || 'Engineer'),
      createdAt: String(row.created_at || '')
    }));
  } catch (err) {
    console.error('Failed to fetch users from Turso directly:', err);
    return [];
  }
}

