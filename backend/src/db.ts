import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || '';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

export const db = createClient({
  url,
  authToken,
});

export async function initDatabase() {
  try {
    await db.execute(`
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

    await db.execute(`
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

    await db.execute(`
      CREATE TABLE IF NOT EXISTS admins (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'ADMIN',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        description TEXT,
        domain TEXT,
        status TEXT DEFAULT 'UPCOMING',
        timer_seconds INTEGER DEFAULT 30,
        current_question_index INTEGER DEFAULT -1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS event_questions (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        question_text TEXT NOT NULL,
        options_json TEXT NOT NULL,
        correct_option INTEGER NOT NULL,
        explanation TEXT,
        points INTEGER DEFAULT 100,
        timer_seconds INTEGER DEFAULT 30,
        question_order INTEGER DEFAULT 1,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        user_email TEXT NOT NULL,
        registered_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, user_id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS event_answers (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        question_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_name TEXT NOT NULL,
        selected_option INTEGER NOT NULL,
        is_correct INTEGER NOT NULL,
        points_earned INTEGER DEFAULT 0,
        time_taken_seconds REAL DEFAULT 0,
        submitted_at TEXT DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(event_id, question_id, user_id)
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS daily_quiz_attempts (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        user_name TEXT,
        user_email TEXT NOT NULL,
        quiz_topic TEXT NOT NULL,
        score INTEGER NOT NULL,
        total_questions INTEGER NOT NULL,
        xp_earned INTEGER NOT NULL,
        accuracy INTEGER NOT NULL,
        time_taken_seconds INTEGER DEFAULT 0,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await db.execute(`
      CREATE TABLE IF NOT EXISTS branches (
        id TEXT PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        code TEXT,
        description TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('[Turso DB] Database tables initialized successfully in Backend');
    await ensureSuperAdminExists();
    await seedInitialBranchesIfEmpty();
  } catch (error) {
    console.error('[Turso DB] Failed to initialize Turso database:', error);
  }
}

export async function seedInitialBranchesIfEmpty() {
  try {
    const existing = await db.execute('SELECT COUNT(*) as count FROM branches;');
    const count = Number(existing.rows[0]?.count || 0);
    if (count === 0) {
      console.log('[Turso DB] Seeding initial engineering branches...');
      const initialBranches = [
        { id: 'br_cse', name: 'Computer Science and Engineering', code: 'CSE', description: 'Core Computing, Software Systems, Web Development & Algorithms' },
        { id: 'br_it', name: 'Information Technology', code: 'IT', description: 'Information Systems, Cloud Infrastructure & Network Architecture' },
        { id: 'br_aids', name: 'Artificial Intelligence & Data Science', code: 'AI/DS', description: 'Machine Learning, Deep Neural Networks & Big Data Analytics' },
        { id: 'br_ece', name: 'Electronics and Communication Engineering', code: 'ECE', description: 'VLSI, Digital Signal Processing, Microcontrollers & Telecommunication' },
        { id: 'br_eee', name: 'Electrical and Electronics Engineering', code: 'EEE', description: 'Power Electronics, Electrical Drives, Renewable Energy & Control Systems' },
        { id: 'br_me', name: 'Mechanical Engineering', code: 'ME', description: 'Thermodynamics, Robotics, CAD/CAM, Manufacturing & Mechatronics' },
        { id: 'br_ce', name: 'Civil Engineering', code: 'CE', description: 'Structural Engineering, Geo-technical, Construction & Urban Planning' },
        { id: 'br_aero', name: 'Aeronautical Engineering', code: 'AERO', description: 'Aerodynamics, Avionics, Propulsion & Spaceflight Engineering' },
        { id: 'br_other', name: 'Other Engineering Disciplines', code: 'OTHER', description: 'Biotechnology, Chemical, Materials & Interdisciplinary Engineering' }
      ];

      for (const br of initialBranches) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO branches (id, name, code, description, created_at)
                VALUES (?, ?, ?, ?, datetime('now'));`,
          args: [br.id, br.name, br.code, br.description]
        });
      }
      console.log('[Turso DB] Initial engineering branches seeded successfully.');
    }
  } catch (error) {
    console.error('[Turso DB] Error checking or seeding branches:', error);
  }
}

export async function ensureSuperAdminExists() {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Super Administrator';

    // Ensure master admin is configured in admins table only (NOT in users table)
    if (adminEmail && adminPassword) {
      const existing = await db.execute({
        sql: 'SELECT id FROM admins WHERE LOWER(email) = LOWER(?) LIMIT 1;',
        args: [adminEmail]
      });

      if (existing.rows.length === 0) {
        const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);
        await db.execute({
          sql: `INSERT INTO admins (id, name, email, password, role, created_at)
                VALUES (?, ?, ?, ?, 'SUPERADMIN', datetime('now'));`,
          args: ['adm_primary_super', adminName, adminEmail, hashedAdminPassword]
        });
        console.log('[Turso DB] Initialized Superadmin in admins table');
      }
    }
  } catch (err) {
    console.error('[Turso DB] Failed to initialize superadmin:', err);
  }
}

export async function seedUsersIfEmpty(_force = false) {
  // Hardcoded demo user auto-seeding is permanently removed.
  // Real users only - dynamically added via user registration.
  return { seeded: false, message: 'Automatic user seeding has been disabled' };
}

export async function seedEventsIfEmpty(_force: boolean = false) {
  // Hardcoded event and question auto-seeding is permanently removed.
  // Events and questions are managed dynamically by administrators via the Admin Dashboard.
  return { seeded: false, message: 'Event auto-seeding disabled. All events and questions are loaded dynamically from Turso DB.' };
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    const res = await db.execute({
      sql: 'SELECT value FROM system_settings WHERE key = ?',
      args: [key]
    });
    if (res.rows.length > 0) {
      return String(res.rows[0].value);
    }
    return null;
  } catch (err) {
    console.error(`[DB] Failed to get system setting ${key}:`, err);
    return null;
  }
}

export async function setSystemSetting(key: string, value: string): Promise<boolean> {
  try {
    await db.execute({
      sql: `INSERT OR REPLACE INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP);`,
      args: [key, value]
    });
    return true;
  } catch (err) {
    console.error(`[DB] Failed to set system setting ${key}:`, err);
    return false;
  }
}
