import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { db, initDatabase, seedUsersIfEmpty } from './db.js';
import { realtimeEngine } from './realtime.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Initialize DB schema & WebSocket server
initDatabase();
realtimeEngine.init(server);

/* ==========================================================================
   HEALTH CHECKS
   ========================================================================== */
app.get('/', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'Engiverse Backend API & Realtime Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      realtimeWebSocket: '/ws'
    }
  });
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: 'Engiverse Backend API', timestamp: new Date() });
});

/* ==========================================================================
   USER AUTHENTICATION (TURSO DB)
   ========================================================================== */
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, mobile, branch, year, password, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const checkRes = await db.execute({
      sql: 'SELECT id FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;',
      args: [email.trim()]
    });

    if (checkRes.rows.length > 0) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    const badge = `${branch || 'Engineering'} Engineer`;
    const userAvatar = avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80';
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `INSERT INTO users (id, name, email, mobile, branch, year, password, avatar, streak, xp, badge, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 250, ?, datetime('now'));`,
      args: [
        userId,
        name.trim(),
        email.trim(),
        mobile ? mobile.trim() : null,
        branch || 'Engineering',
        year || '',
        hashedPassword,
        userAvatar,
        badge
      ]
    });

    const user = {
      id: userId,
      name: name.trim(),
      email: email.trim(),
      mobile: mobile ? mobile.trim() : '',
      branch: branch || 'Engineering',
      year: year || '',
      discipline: branch || 'Engineering',
      avatar: userAvatar,
      streak: 1,
      xp: 250,
      badge,
      joinedAt: new Date().toLocaleDateString()
    };

    return res.status(201).json({ success: true, user });
  } catch (error: any) {
    console.error('Registration API Error:', error);
    return res.status(500).json({ error: error.message || 'Failed to register user' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let result = await db.execute({
      sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;',
      args: [email.trim()]
    });

    if (result.rows.length === 0) {
      // Check if this is an administrator or superadmin logging in
      const adminEmail = (process.env.ADMIN_EMAIL || 'saicharanbhuthkuri468@gmail.com').trim().toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || 'Charan@468';

      const adminRes = await db.execute({
        sql: 'SELECT id, name, email, password, role FROM admins WHERE LOWER(email) = LOWER(?) LIMIT 1;',
        args: [email.trim()]
      });

      const isEnvAdmin = email.trim().toLowerCase() === adminEmail && password === adminPassword;
      let matchedAdmin: any = null;

      if (adminRes.rows.length > 0) {
        const aRow = adminRes.rows[0];
        const aHash = String(aRow.password || '');
        const aMatch = await bcrypt.compare(password, aHash);
        if (aMatch || aHash === password || isEnvAdmin) {
          matchedAdmin = aRow;
        }
      } else if (isEnvAdmin) {
        matchedAdmin = {
          id: 'usr_saicharan_super',
          name: 'Sai Charan Bhuthkuri',
          email: adminEmail,
          role: 'SUPERADMIN'
        };
      }

      if (matchedAdmin) {
        // Automatically insert into users table so admin has full engineer access
        const newHash = await bcrypt.hash(password, 10);
        await db.execute({
          sql: `INSERT OR REPLACE INTO users (id, name, email, mobile, branch, year, password, avatar, streak, xp, badge, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, 50, 99999, ?, datetime('now'));`,
          args: [
            matchedAdmin.id || 'usr_saicharan_super',
            matchedAdmin.name || 'Sai Charan Bhuthkuri',
            email.trim(),
            '+91 99999 99999',
            'Computer Systems & AI',
            'Staff Principal',
            newHash,
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
            `${matchedAdmin.role || 'SUPERADMIN'} • Principal Systems Architect`
          ]
        });

        result = await db.execute({
          sql: 'SELECT * FROM users WHERE LOWER(email) = LOWER(?) LIMIT 1;',
          args: [email.trim()]
        });
      } else {
        return res.status(404).json({ error: 'No account found with this email' });
      }
    }

    const row = result.rows[0];
    const storedHash = String(row.password || '');
    const isMatch = await bcrypt.compare(password, storedHash);
    const legacyMatch = storedHash === password;

    if (!isMatch && !legacyMatch) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Transparently upgrade legacy plain text password to secure bcrypt hash
    if (legacyMatch && !isMatch) {
      const newHash = await bcrypt.hash(password, 10);
      await db.execute({
        sql: 'UPDATE users SET password = ? WHERE id = ?;',
        args: [newHash, String(row.id)]
      });
    }

    const user = {
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      mobile: String(row.mobile || ''),
      branch: String(row.branch || 'Engineering'),
      year: String(row.year || ''),
      discipline: String(row.branch || 'Engineering'),
      avatar: String(row.avatar || ''),
      streak: Number(row.streak || 1),
      xp: Number(row.xp || 250),
      badge: String(row.badge || 'Verified Engineer'),
      joinedAt: String(row.created_at || new Date().toLocaleDateString())
    };

    return res.json({ success: true, user });
  } catch (error: any) {
    console.error('Login API Error:', error);
    return res.status(500).json({ error: error.message || 'Login failed' });
  }
});

/* ==========================================================================
   ADMIN AUTHENTICATION & DASHBOARD APIS
   ========================================================================== */
app.post('/api/admin/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const adminEmail = (process.env.ADMIN_EMAIL || 'saicharanbhuthkuri468@gmail.com').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'Charan@468';

    // First check admins database table
    const dbAdmin = await db.execute({
      sql: 'SELECT id, name, email, password, role FROM admins WHERE LOWER(email) = LOWER(?) LIMIT 1;',
      args: [email ? email.trim() : '']
    });

    if (dbAdmin.rows.length > 0) {
      const row = dbAdmin.rows[0];
      const storedHash = String(row.password || '');
      const isMatch = await bcrypt.compare(password, storedHash);
      const legacyMatch = storedHash === password;

      if (isMatch || legacyMatch) {
        if (legacyMatch && !isMatch) {
          const newHash = await bcrypt.hash(password, 10);
          await db.execute({
            sql: 'UPDATE admins SET password = ? WHERE id = ?;',
            args: [newHash, String(row.id)]
          });
        }

        return res.json({
          success: true,
          admin: {
            id: String(row.id),
            email: String(row.email),
            name: String(row.name),
            role: String(row.role || 'ADMIN'),
            token: 'adm_jwt_' + Buffer.from(Date.now().toString()).toString('base64')
          }
        });
      }
    }

    // Fallback check against env credentials
    if (email && email.trim().toLowerCase() === adminEmail && password === adminPassword) {
      return res.json({
        success: true,
        admin: {
          id: 'adm_saicharan_super',
          email: adminEmail,
          name: 'Sai Charan Bhuthkuri',
          role: 'SUPERADMIN',
          token: 'adm_jwt_' + Buffer.from(Date.now().toString()).toString('base64')
        }
      });
    }

    return res.status(401).json({ error: 'Invalid admin email or security key' });
  } catch (error: any) {
    console.error('Admin login error:', error);
    return res.status(500).json({ error: error.message || 'Internal login error' });
  }
});

// List all administrators
app.get('/api/admin/list', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT id, name, email, role, created_at
      FROM admins
      ORDER BY created_at ASC;
    `);

    const admins = result.rows.map(row => ({
      id: String(row.id),
      name: String(row.name),
      email: String(row.email),
      role: String(row.role || 'ADMIN'),
      createdAt: String(row.created_at || '')
    }));

    return res.json({ success: true, count: admins.length, admins });
  } catch (error: any) {
    console.error('Fetch admins error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch admin list' });
  }
});

// Add new administrator
app.post('/api/admin/add', async (req: Request, res: Response) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and security password are required' });
    }

    // Check if email already exists
    const check = await db.execute({
      sql: 'SELECT id FROM admins WHERE LOWER(email) = LOWER(?) LIMIT 1;',
      args: [email.trim()]
    });

    if (check.rows.length > 0) {
      return res.status(409).json({ error: 'An admin with this email address already exists' });
    }

    const adminId = 'adm_' + Math.random().toString(36).substring(2, 10);
    const adminRole = role === 'SUPERADMIN' ? 'SUPERADMIN' : 'ADMIN';
    const hashedPassword = await bcrypt.hash(password, 10);

    await db.execute({
      sql: `INSERT INTO admins (id, name, email, password, role, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'));`,
      args: [adminId, name.trim(), email.trim(), hashedPassword, adminRole]
    });

    return res.status(201).json({
      success: true,
      message: `Admin ${name} created successfully`,
      admin: {
        id: adminId,
        name: name.trim(),
        email: email.trim(),
        role: adminRole,
        createdAt: new Date().toISOString()
      }
    });
  } catch (error: any) {
    console.error('Add admin error:', error);
    return res.status(500).json({ error: error.message || 'Failed to add administrator' });
  }
});

// Remove administrator
app.delete('/api/admin/remove/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if target is primary superadmin
    const target = await db.execute({
      sql: 'SELECT email, role FROM admins WHERE id = ? LIMIT 1;',
      args: [id]
    });

    if (target.rows.length > 0) {
      const email = String(target.rows[0].email).toLowerCase();
      if (email === 'saicharanbhuthkuri468@gmail.com') {
        return res.status(403).json({ error: 'The Primary Superadministrator cannot be deleted.' });
      }
    }

    await db.execute({
      sql: 'DELETE FROM admins WHERE id = ?;',
      args: [id]
    });

    return res.json({ success: true, message: `Admin ${id} successfully removed from Turso DB` });
  } catch (error: any) {
    console.error('Delete admin error:', error);
    return res.status(500).json({ error: error.message || 'Failed to remove administrator' });
  }
});

// Seed sample users into Turso DB
app.post('/api/admin/seed', async (_req: Request, res: Response) => {
  try {
    const result = await seedUsersIfEmpty(true);
    res.json({ success: true, message: 'Sample engineering users populated into Turso DB', result });
  } catch (error: any) {
    console.error('Seed users error:', error);
    res.status(500).json({ error: error.message || 'Failed to seed users' });
  }
});

// Get all registered users from Turso DB
app.get('/api/admin/users', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT id, name, email, mobile, branch, year, avatar, streak, xp, badge, created_at
      FROM users
      ORDER BY created_at DESC;
    `);

    const users = result.rows.map(row => ({
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

    res.json({ success: true, count: users.length, users });
  } catch (error: any) {
    console.error('Admin users fetch error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch users from database' });
  }
});

// Delete user by ID from Turso DB
app.delete('/api/admin/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.execute({
      sql: 'DELETE FROM users WHERE id = ?;',
      args: [id]
    });

    res.json({ success: true, message: `User ${id} successfully removed from Turso DB` });
  } catch (error: any) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

// Get aggregate platform analytics for the Admin Dashboard
app.get('/api/admin/stats', async (_req: Request, res: Response) => {
  try {
    const usersCountRes = await db.execute('SELECT COUNT(*) as total_users FROM users;');
    const totalXpRes = await db.execute('SELECT SUM(xp) as total_xp FROM users;');
    const attemptsCountRes = await db.execute('SELECT COUNT(*) as total_attempts FROM quiz_attempts;');
    const branchRes = await db.execute(`
      SELECT branch, COUNT(*) as count 
      FROM users 
      WHERE branch IS NOT NULL AND branch != ''
      GROUP BY branch 
      ORDER BY count DESC 
      LIMIT 1;
    `);

    const totalUsers = Number(usersCountRes.rows[0]?.total_users || 0);
    const totalXp = Number(totalXpRes.rows[0]?.total_xp || 0);
    const totalAttempts = Number(attemptsCountRes.rows[0]?.total_attempts || 0);
    const topBranch = branchRes.rows[0]?.branch ? String(branchRes.rows[0]?.branch) : 'Computer Science (CSE)';

    res.json({
      success: true,
      stats: {
        totalUsers,
        totalXp,
        totalAttempts,
        topBranch
      }
    });
  } catch (error: any) {
    console.error('Admin stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch stats' });
  }
});

/* ==========================================================================
   QUIZ ATTEMPTS & LEADERBOARD
   ========================================================================== */
app.post('/api/quiz/attempt', async (req: Request, res: Response) => {
  try {
    const { userEmail, userName, score, totalQuestions, xpEarned, rankTitle } = req.body;
    const attemptId = 'att_' + Math.random().toString(36).substring(2, 11);
    const accuracy = Math.round((Number(score) / Number(totalQuestions)) * 100);

    await db.execute({
      sql: `INSERT INTO quiz_attempts (id, user_email, user_name, score, total_questions, xp_earned, accuracy, rank_title, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
      args: [attemptId, userEmail, userName, score, totalQuestions, xpEarned, accuracy, rankTitle]
    });

    if (userEmail) {
      await db.execute({
        sql: 'UPDATE users SET xp = xp + ?, streak = streak + 1 WHERE LOWER(email) = LOWER(?);',
        args: [xpEarned, userEmail.trim()]
      });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Quiz attempt save error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/leaderboard', async (_req: Request, res: Response) => {
  try {
    const result = await db.execute(`
      SELECT name, email, branch, avatar, streak, xp, badge
      FROM users
      ORDER BY xp DESC
      LIMIT 10;
    `);

    res.json({ success: true, leaderboard: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/* ==========================================================================
   REAL-TIME EVENTS & COMPETITIONS APIS
   ========================================================================== */

// 1. Get all events
app.get('/api/events', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId ? String(req.query.userId).trim() : null;

    const result = await db.execute(`
      SELECT e.*,
        (SELECT COUNT(*) FROM event_questions eq WHERE eq.event_id = e.id) as question_count,
        (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as registration_count
      FROM events e
      ORDER BY e.created_at DESC;
    `);

    let userRegistrations = new Set<string>();
    if (userId) {
      const userRegs = await db.execute({
        sql: 'SELECT event_id FROM event_registrations WHERE user_id = ?;',
        args: [userId]
      });
      for (const r of userRegs.rows) {
        userRegistrations.add(String(r.event_id));
      }
    }

    const events = result.rows.map(row => {
      const evId = String(row.id);
      return {
        id: evId,
        title: String(row.title),
        description: String(row.description || ''),
        domain: String(row.domain || 'General Engineering'),
        status: String(row.status || 'UPCOMING'),
        timerSeconds: Number(row.timer_seconds || 30),
        currentQuestionIndex: Number(row.current_question_index ?? -1),
        questionCount: Number(row.question_count || 0),
        registrationCount: Number(row.registration_count || 0),
        isRegistered: userRegistrations.has(evId),
        createdAt: String(row.created_at || '')
      };
    });

    return res.json({ success: true, count: events.length, events });
  } catch (error: any) {
    console.error('Fetch events error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch events' });
  }
});

// 2. Get single event
app.get('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.query.userId ? String(req.query.userId).trim() : null;

    const result = await db.execute({
      sql: `SELECT e.*,
              (SELECT COUNT(*) FROM event_questions eq WHERE eq.event_id = e.id) as question_count,
              (SELECT COUNT(*) FROM event_registrations er WHERE er.event_id = e.id) as registration_count
            FROM events e
            WHERE e.id = ? LIMIT 1;`,
      args: [id]
    });

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const row = result.rows[0];
    let isRegistered = false;

    if (userId) {
      const regCheck = await db.execute({
        sql: 'SELECT id FROM event_registrations WHERE event_id = ? AND user_id = ? LIMIT 1;',
        args: [id, userId]
      });
      isRegistered = regCheck.rows.length > 0;
    }

    return res.json({
      success: true,
      event: {
        id: String(row.id),
        title: String(row.title),
        description: String(row.description || ''),
        domain: String(row.domain || 'General Engineering'),
        status: String(row.status || 'UPCOMING'),
        timerSeconds: Number(row.timer_seconds || 30),
        currentQuestionIndex: Number(row.current_question_index ?? -1),
        questionCount: Number(row.question_count || 0),
        registrationCount: Number(row.registration_count || 0),
        isRegistered,
        createdAt: String(row.created_at || '')
      }
    });
  } catch (error: any) {
    console.error('Fetch event detail error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch event detail' });
  }
});

// 3. Create Event (Admin)
app.post('/api/events', async (req: Request, res: Response) => {
  try {
    const { title, description, domain, timerSeconds } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Event title is required' });
    }

    const eventId = 'evt_' + Math.random().toString(36).substring(2, 10);
    const duration = Math.max(10, Math.min(180, Number(timerSeconds || 30)));

    await db.execute({
      sql: `INSERT INTO events (id, title, description, domain, status, timer_seconds, current_question_index, created_at)
            VALUES (?, ?, ?, ?, 'UPCOMING', ?, -1, datetime('now'));`,
      args: [eventId, title.trim(), description ? description.trim() : '', domain || 'Computer Science & AI', duration]
    });

    const newEvent = {
      id: eventId,
      title: title.trim(),
      description: description ? description.trim() : '',
      domain: domain || 'Computer Science & AI',
      status: 'UPCOMING',
      timerSeconds: duration,
      currentQuestionIndex: -1,
      questionCount: 0,
      registrationCount: 0,
      createdAt: new Date().toISOString()
    };

    // Broadcast in real-time to all participants & admins
    realtimeEngine.broadcastEventListingUpdate('EVENT_CREATED', newEvent);

    return res.status(201).json({ success: true, event: newEvent });
  } catch (error: any) {
    console.error('Create event error:', error);
    return res.status(500).json({ error: error.message || 'Failed to create event' });
  }
});

// 4. Update Event (Admin)
app.put('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, description, domain, status, timerSeconds } = req.body;

    await db.execute({
      sql: `UPDATE events
            SET title = COALESCE(?, title),
                description = COALESCE(?, description),
                domain = COALESCE(?, domain),
                status = COALESCE(?, status),
                timer_seconds = COALESCE(?, timer_seconds)
            WHERE id = ?;`,
      args: [title || null, description !== undefined ? description : null, domain || null, status || null, timerSeconds || null, id]
    });

    const state = await realtimeEngine.getOrLoadEventState(id);
    if (state) {
      if (title) state.title = title;
      if (description !== undefined) state.description = description;
      if (domain) state.domain = domain;
      if (status) state.status = status;
      if (timerSeconds) state.questionRemainingSeconds = Number(timerSeconds);
    }

    realtimeEngine.broadcastEventListingUpdate('EVENT_UPDATED', { id, title, description, domain, status, timerSeconds });

    return res.json({ success: true, message: 'Event updated successfully' });
  } catch (error: any) {
    console.error('Update event error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update event' });
  }
});

// 5. Delete Event (Admin)
app.delete('/api/events/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.execute({ sql: 'DELETE FROM event_answers WHERE event_id = ?;', args: [id] });
    await db.execute({ sql: 'DELETE FROM event_registrations WHERE event_id = ?;', args: [id] });
    await db.execute({ sql: 'DELETE FROM event_questions WHERE event_id = ?;', args: [id] });
    await db.execute({ sql: 'DELETE FROM events WHERE id = ?;', args: [id] });

    realtimeEngine.broadcastEventListingUpdate('EVENT_DELETED', { id });

    return res.json({ success: true, message: 'Event deleted successfully' });
  } catch (error: any) {
    console.error('Delete event error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete event' });
  }
});

// 6. Get questions for an event
app.get('/api/events/:id/questions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const role = String(req.query.role || '').toUpperCase();
    const isAdmin = role === 'ADMIN' || role === 'SUPERADMIN';

    const result = await db.execute({
      sql: 'SELECT * FROM event_questions WHERE event_id = ? ORDER BY question_order ASC;',
      args: [id]
    });

    const questions = result.rows.map(row => {
      let opts: string[] = [];
      try {
        opts = JSON.parse(String(row.options_json || '[]'));
      } catch {
        opts = [];
      }

      return {
        id: String(row.id),
        eventId: String(row.event_id),
        questionText: String(row.question_text),
        options: opts,
        points: Number(row.points || 100),
        timerSeconds: Number(row.timer_seconds || 30),
        questionOrder: Number(row.question_order || 1),
        // Reveal correct answer only to authorized admin staff
        ...(isAdmin ? { correctOption: Number(row.correct_option || 0), explanation: String(row.explanation || '') } : {})
      };
    });

    return res.json({ success: true, count: questions.length, questions });
  } catch (error: any) {
    console.error('Fetch questions error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch questions' });
  }
});

// 7. Add question to event (Admin)
app.post('/api/events/:id/questions', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { questionText, options, correctOption, explanation, points, timerSeconds, questionOrder } = req.body;

    if (!questionText || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Question text and at least 2 options are required' });
    }

    const questionId = 'q_' + Math.random().toString(36).substring(2, 10);
    const optsJson = JSON.stringify(options);
    const correctIdx = Number(correctOption || 0);
    const pts = Number(points || 100);
    const timer = Number(timerSeconds || 30);
    const order = Number(questionOrder || 1);

    await db.execute({
      sql: `INSERT INTO event_questions (id, event_id, question_text, options_json, correct_option, explanation, points, timer_seconds, question_order, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
      args: [questionId, id, questionText.trim(), optsJson, correctIdx, explanation || '', pts, timer, order]
    });

    // Reload active event state
    await realtimeEngine.reloadEventQuestions(id);
    realtimeEngine.broadcastEventListingUpdate('EVENT_UPDATED', { id });

    return res.status(201).json({
      success: true,
      question: {
        id: questionId,
        eventId: id,
        questionText: questionText.trim(),
        options,
        correctOption: correctIdx,
        explanation: explanation || '',
        points: pts,
        timerSeconds: timer,
        questionOrder: order
      }
    });
  } catch (error: any) {
    console.error('Add question error:', error);
    return res.status(500).json({ error: error.message || 'Failed to add question' });
  }
});

// 8. Delete question (Admin)
app.delete('/api/events/:id/questions/:qId', async (req: Request, res: Response) => {
  try {
    const { id, qId } = req.params;
    await db.execute({
      sql: 'DELETE FROM event_questions WHERE id = ? AND event_id = ?;',
      args: [qId, id]
    });

    await realtimeEngine.reloadEventQuestions(id);
    return res.json({ success: true, message: 'Question deleted' });
  } catch (error: any) {
    console.error('Delete question error:', error);
    return res.status(500).json({ error: error.message || 'Failed to delete question' });
  }
});

// Update question (Admin)
app.put('/api/events/:id/questions/:qId', async (req: Request, res: Response) => {
  try {
    const { id, qId } = req.params;
    const { questionText, options, correctOption, explanation, points, timerSeconds, questionOrder } = req.body;

    const optsJson = options ? JSON.stringify(options) : null;

    await db.execute({
      sql: `UPDATE event_questions
            SET question_text = COALESCE(?, question_text),
                options_json = COALESCE(?, options_json),
                correct_option = COALESCE(?, correct_option),
                explanation = COALESCE(?, explanation),
                points = COALESCE(?, points),
                timer_seconds = COALESCE(?, timer_seconds),
                question_order = COALESCE(?, question_order)
            WHERE id = ? AND event_id = ?;`,
      args: [
        questionText !== undefined ? questionText.trim() : null,
        optsJson,
        correctOption !== undefined ? Number(correctOption) : null,
        explanation !== undefined ? explanation : null,
        points !== undefined ? Number(points) : null,
        timerSeconds !== undefined ? Number(timerSeconds) : null,
        questionOrder !== undefined ? Number(questionOrder) : null,
        qId,
        id
      ]
    });

    await realtimeEngine.reloadEventQuestions(id);
    return res.json({ success: true, message: 'Question updated successfully' });
  } catch (error: any) {
    console.error('Update question error:', error);
    return res.status(500).json({ error: error.message || 'Failed to update question' });
  }
});

// 9. Register participant for event
app.post('/api/events/:id/register', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, userName, userEmail } = req.body;

    if (!userId || !userEmail) {
      return res.status(400).json({ error: 'User ID and email are required to register' });
    }

    if (userId.startsWith('adm_')) {
      return res.status(400).json({ error: 'Admin host accounts cannot register as participants. Please use an engineer account.' });
    }

    const regId = 'reg_' + Math.random().toString(36).substring(2, 10);
    await db.execute({
      sql: `INSERT OR IGNORE INTO event_registrations (id, event_id, user_id, user_name, user_email, registered_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'));`,
      args: [regId, id, userId, userName || 'Engineer', userEmail]
    });

    const state = await realtimeEngine.getOrLoadEventState(id);
    if (state) {
      state.registeredUsers.add(userId);
      if (!state.scores.has(userId)) {
        state.scores.set(userId, {
          userId,
          userName: userName || 'Engineer',
          score: 0,
          correctCount: 0,
          totalTimeSeconds: 0,
          answers: new Map()
        });
      }
    }

    // Broadcast in real-time without needing page refresh!
    realtimeEngine.broadcastAll({
      type: 'EVENT_REGISTERED',
      payload: {
        eventId: id,
        userId,
        userName,
        totalRegistered: state ? state.registeredUsers.size : 1
      }
    });

    return res.json({
      success: true,
      message: 'Successfully registered for event',
      totalRegistered: state ? state.registeredUsers.size : 1
    });
  } catch (error: any) {
    console.error('Event registration error:', error);
    return res.status(500).json({ error: error.message || 'Failed to register for event' });
  }
});

// 10. Get participants list for event
app.get('/api/events/:id/participants', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await db.execute({
      sql: `SELECT user_id, user_name, user_email, registered_at 
            FROM event_registrations 
            WHERE event_id = ? 
              AND user_id NOT LIKE 'adm_%' 
            ORDER BY registered_at ASC;`,
      args: [id]
    });

    const participants = result.rows.map(r => ({
      userId: String(r.user_id),
      userName: String(r.user_name),
      userEmail: String(r.user_email),
      registeredAt: String(r.registered_at)
    }));

    return res.json({ success: true, count: participants.length, participants });
  } catch (error: any) {
    console.error('Fetch participants error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch participants' });
  }
});

// Unregister participant (Admin)
app.delete('/api/events/:id/participants/:userId', async (req: Request, res: Response) => {
  try {
    const { id, userId } = req.params;
    await db.execute({
      sql: 'DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?;',
      args: [id, userId]
    });

    const state = await realtimeEngine.getOrLoadEventState(id);
    if (state) {
      state.registeredUsers.delete(userId);
    }

    realtimeEngine.broadcastAll({
      type: 'EVENT_REGISTERED',
      payload: {
        eventId: id,
        userId,
        userName: '',
        totalRegistered: state ? state.registeredUsers.size : 0
      }
    });

    return res.json({ success: true, message: 'Participant unregistered' });
  } catch (error: any) {
    console.error('Unregister participant error:', error);
    return res.status(500).json({ error: error.message || 'Failed to unregister participant' });
  }
});

// 11. Get leaderboard for event
app.get('/api/events/:id/leaderboard', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const state = await realtimeEngine.getOrLoadEventState(id);
    if (!state) {
      return res.status(404).json({ error: 'Event not found' });
    }

    const leaderboard = realtimeEngine.getLeaderboard(state);
    return res.json({ success: true, leaderboard });
  } catch (error: any) {
    console.error('Fetch leaderboard error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch leaderboard' });
  }
});

// 12. Submit Daily Quiz Attempt (separate from events)
app.post('/api/daily-quiz/submit', async (req: Request, res: Response) => {
  try {
    const { userId, userName, userEmail, quizTopic, score, totalQuestions, xpEarned, accuracy, timeTakenSeconds } = req.body;

    if (!userEmail) {
      return res.status(400).json({ error: 'User email is required' });
    }

    const attemptId = 'dq_' + Math.random().toString(36).substring(2, 11);
    const pts = Number(xpEarned || 100);

    await db.execute({
      sql: `INSERT INTO daily_quiz_attempts (id, user_id, user_name, user_email, quiz_topic, score, total_questions, xp_earned, accuracy, time_taken_seconds, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
      args: [
        attemptId,
        userId || 'anon',
        userName || 'Engineer',
        userEmail.trim(),
        quizTopic || 'General Engineering',
        Number(score || 0),
        Number(totalQuestions || 5),
        pts,
        Number(accuracy || 100),
        Number(timeTakenSeconds || 60)
      ]
    });

    // Update user's persistent XP & streak in Turso DB
    await db.execute({
      sql: 'UPDATE users SET xp = xp + ?, streak = streak + 1 WHERE LOWER(email) = LOWER(?);',
      args: [pts, userEmail.trim()]
    });

    return res.json({ success: true, attemptId, xpEarned: pts });
  } catch (error: any) {
    console.error('Daily quiz submit error:', error);
    return res.status(500).json({ error: error.message || 'Failed to record daily quiz attempt' });
  }
});

// 13. Get Daily Quiz Attempts History
app.get('/api/daily-quiz/history/:userEmail', async (req: Request, res: Response) => {
  try {
    const { userEmail } = req.params;
    const result = await db.execute({
      sql: 'SELECT * FROM daily_quiz_attempts WHERE LOWER(user_email) = LOWER(?) ORDER BY created_at DESC LIMIT 20;',
      args: [userEmail.trim()]
    });

    return res.json({ success: true, count: result.rows.length, attempts: result.rows });
  } catch (error: any) {
    console.error('Fetch daily quiz history error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch history' });
  }
});

// 14. Dedicated Daily Dashboard API (Completely independent of events)
app.get('/api/admin/daily-dashboard', async (_req: Request, res: Response) => {
  try {
    const totalAttemptsRes = await db.execute('SELECT COUNT(*) as total_attempts FROM daily_quiz_attempts;');
    const totalXpRes = await db.execute('SELECT SUM(xp_earned) as total_xp FROM daily_quiz_attempts;');
    const avgAccuracyRes = await db.execute('SELECT AVG(accuracy) as avg_accuracy FROM daily_quiz_attempts;');
    const todayAttemptsRes = await db.execute("SELECT COUNT(*) as today_attempts FROM daily_quiz_attempts WHERE date(created_at) = date('now');");
    
    const activeStreaksRes = await db.execute('SELECT COUNT(*) as streak_users FROM users WHERE streak > 0;');
    const totalUsersRes = await db.execute('SELECT COUNT(*) as total_users FROM users;');

    const topicRes = await db.execute(`
      SELECT 
        quiz_topic, 
        COUNT(*) as attempts, 
        ROUND(AVG(accuracy), 1) as avg_accuracy, 
        SUM(xp_earned) as total_xp 
      FROM daily_quiz_attempts 
      GROUP BY quiz_topic 
      ORDER BY attempts DESC;
    `);

    const recentRes = await db.execute(`
      SELECT id, user_id, user_name, user_email, quiz_topic, score, total_questions, xp_earned, accuracy, time_taken_seconds, created_at
      FROM daily_quiz_attempts
      ORDER BY created_at DESC
      LIMIT 50;
    `);

    const streakLeadersRes = await db.execute(`
      SELECT id, name, email, streak, xp, branch, year
      FROM users
      WHERE streak > 0
      ORDER BY streak DESC, xp DESC
      LIMIT 10;
    `);

    return res.json({
      success: true,
      metrics: {
        totalAttempts: Number(totalAttemptsRes.rows[0]?.total_attempts || 0),
        todayAttempts: Number(todayAttemptsRes.rows[0]?.today_attempts || 0),
        totalXpDistributed: Number(totalXpRes.rows[0]?.total_xp || 0),
        averageAccuracy: Math.round(Number(avgAccuracyRes.rows[0]?.avg_accuracy || 0)),
        activeStreaksCount: Number(activeStreaksRes.rows[0]?.streak_users || 0),
        totalUsers: Number(totalUsersRes.rows[0]?.total_users || 0)
      },
      topics: topicRes.rows.map(r => ({
        topic: String(r.quiz_topic),
        attempts: Number(r.attempts),
        avgAccuracy: Number(r.avg_accuracy),
        totalXp: Number(r.total_xp)
      })),
      recentAttempts: recentRes.rows.map(r => ({
        id: String(r.id),
        userId: String(r.user_id),
        userName: String(r.user_name || 'Engineer'),
        userEmail: String(r.user_email),
        quizTopic: String(r.quiz_topic),
        score: Number(r.score),
        totalQuestions: Number(r.total_questions),
        xpEarned: Number(r.xp_earned),
        accuracy: Number(r.accuracy),
        timeTakenSeconds: Number(r.time_taken_seconds || 0),
        createdAt: String(r.created_at)
      })),
      streakLeaders: streakLeadersRes.rows.map(r => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email),
        streak: Number(r.streak),
        xp: Number(r.xp),
        branch: String(r.branch || 'Engineering'),
        year: String(r.year || '—')
      }))
    });
  } catch (error: any) {
    console.error('Daily dashboard fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch daily dashboard data' });
  }
});

// 15. Dedicated Event Dashboard API (Strictly limited to the selected event only)
app.get('/api/admin/event-dashboard/:eventId', async (req: Request, res: Response) => {
  try {
    const { eventId } = req.params;

    const evRes = await db.execute({
      sql: 'SELECT * FROM events WHERE id = ? LIMIT 1;',
      args: [eventId]
    });

    if (evRes.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    const ev = evRes.rows[0];

    const regRes = await db.execute({
      sql: `SELECT id, user_id, user_name, user_email, registered_at
            FROM event_registrations
            WHERE event_id = ? AND user_id NOT LIKE 'adm_%'
            ORDER BY registered_at DESC;`,
      args: [eventId]
    });

    const registeredUsers = regRes.rows.map(r => ({
      id: String(r.id),
      userId: String(r.user_id),
      userName: String(r.user_name),
      userEmail: String(r.user_email),
      registeredAt: String(r.registered_at)
    }));

    const liveAttendance = realtimeEngine.getRoomAttendance(eventId);

    const qRes = await db.execute({
      sql: 'SELECT id, question_text, points, timer_seconds, question_order FROM event_questions WHERE event_id = ? ORDER BY question_order ASC;',
      args: [eventId]
    });

    const answersRes = await db.execute({
      sql: 'SELECT COUNT(*) as total_answers, COUNT(DISTINCT user_id) as distinct_responders FROM event_answers WHERE event_id = ?;',
      args: [eventId]
    });

    const state = await realtimeEngine.getOrLoadEventState(eventId);
    const leaderboard = state ? realtimeEngine.getLeaderboard(state) : [];

    return res.json({
      success: true,
      event: {
        id: String(ev.id),
        title: String(ev.title),
        description: String(ev.description || ''),
        domain: String(ev.domain || 'General Engineering'),
        status: String(ev.status || 'UPCOMING'),
        timerSeconds: Number(ev.timer_seconds || 30),
        currentQuestionIndex: Number(ev.current_question_index ?? -1),
        createdAt: String(ev.created_at || '')
      },
      metrics: {
        registeredCount: registeredUsers.length,
        connectedAttendanceCount: liveAttendance.length,
        questionCount: qRes.rows.length,
        totalAnswers: Number(answersRes.rows[0]?.total_answers || 0),
        activeParticipants: Number(answersRes.rows[0]?.distinct_responders || 0)
      },
      registrations: registeredUsers,
      attendance: liveAttendance,
      questions: qRes.rows.map(q => ({
        id: String(q.id),
        questionText: String(q.question_text),
        points: Number(q.points),
        timerSeconds: Number(q.timer_seconds),
        order: Number(q.question_order)
      })),
      leaderboard
    });
  } catch (error: any) {
    console.error('Event dashboard fetch error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch event dashboard data' });
  }
});

// Start HTTP + WebSocket Server
server.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`[Server] Engiverse Backend API & WebSocket Server running on port ${PORT}`);
});
