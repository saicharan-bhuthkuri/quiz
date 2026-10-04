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

    console.log('[Turso DB] Database tables initialized successfully in Backend');
    await seedUsersIfEmpty();
    await seedEventsIfEmpty();
  } catch (error) {
    console.error('[Turso DB] Failed to initialize Turso database:', error);
  }
}

export async function seedUsersIfEmpty(force = false) {
  try {
    const adminEmail = (process.env.ADMIN_EMAIL || '').trim().toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || 'Super Administrator';

    // 1. Ensure master admin is configured in admins and users table
    if (adminEmail && adminPassword) {
      const hashedAdminPassword = await bcrypt.hash(adminPassword, 10);

      await db.execute({
        sql: `INSERT OR REPLACE INTO admins (id, name, email, password, role, created_at)
              VALUES (?, ?, ?, ?, 'SUPERADMIN', datetime('now'));`,
        args: ['adm_primary_super', adminName, adminEmail, hashedAdminPassword]
      });

      await db.execute({
        sql: `INSERT OR REPLACE INTO users (id, name, email, mobile, branch, year, password, avatar, streak, xp, badge, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, 50, 99999, ?, datetime('now'));`,
        args: [
          'usr_primary_super',
          adminName,
          adminEmail,
          '+91 99999 99999',
          'Computer Systems & AI',
          'Staff Principal',
          hashedAdminPassword,
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
          'SUPERADMIN • Principal Systems Architect'
        ]
      });
    }

    const countRes = await db.execute('SELECT COUNT(*) as c FROM users;');
    const count = Number(countRes.rows[0]?.c || 0);

    // If users already exist and force is false, no need to add demo participants
    if (count > 1 && !force) {
      return { seeded: false, count };
    }

    // 2. Generate dynamic starter participants if table only has admin or is empty
    const disciplines = [
      { name: 'Computer Science (CSE)', badge: 'Grandmaster Engineer', xp: 48920, streak: 42 },
      { name: 'Electronics & Communication (ECE)', badge: 'Silicon Architect', xp: 46150, streak: 29 },
      { name: 'AI & Data Science (AI/DS)', badge: 'Neural Pioneer', xp: 43800, streak: 35 },
      { name: 'Mechanical Engineering (ME)', badge: 'Robotics Savant', xp: 41200, streak: 18 },
      { name: 'Information Technology (IT)', badge: 'Cloud Principal', xp: 39950, streak: 24 },
      { name: 'Aerospace Engineering', badge: 'Aerodynamic Ace', xp: 28400, streak: 14 },
      { name: 'Electrical & Electronics (EEE)', badge: 'Energy Specialist', xp: 19800, streak: 9 },
      { name: 'Civil Engineering (CE)', badge: 'Structural Virtuoso', xp: 22100, streak: 11 }
    ];

    const starterAvatars = [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80'
    ];

    const names = [
      'Elena Rostova',
      'Devon Vance',
      'Aisha Patel',
      'Marcus Chen',
      'Sofia Al-Mansoor',
      'Liam O’Connor',
      'Priya Sharma',
      'Alex Rivera'
    ];

    for (let i = 0; i < disciplines.length; i++) {
      const disc = disciplines[i];
      const personName = names[i];
      const handle = personName.toLowerCase().replace(/[^a-z0-9]/g, '.');
      const email = `${handle}@engineer.engiverse.io`;
      const id = `usr_demo_${i + 1}`;
      const randomSecret = await bcrypt.hash(crypto.randomBytes(16).toString('hex'), 10);

      await db.execute({
        sql: `INSERT OR IGNORE INTO users (id, name, email, mobile, branch, year, password, avatar, streak, xp, badge, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
        args: [
          id,
          personName,
          email,
          `+1 (555) 010-${(1000 + i * 111).toString()}`,
          disc.name,
          `${(i % 4) + 1}th Year`,
          randomSecret,
          starterAvatars[i % starterAvatars.length],
          disc.streak,
          disc.xp,
          disc.badge
        ]
      });
    }

    console.log(`[Turso DB] Synchronized dynamic users in Turso DB`);
    return { seeded: true };
  } catch (err) {
    console.error('Failed to synchronize users and admins:', err);
    return { seeded: false, error: String(err) };
  }
}

export async function seedEventsIfEmpty(force: boolean = false) {
  try {
    const eventCountRes = await db.execute('SELECT COUNT(*) as c FROM events;');
    const count = Number(eventCountRes.rows[0]?.c || 0);

    if (count > 0 && !force) {
      return { seeded: false, message: 'Events already populated' };
    }

    const event1 = {
      id: 'evt_eng_championship_2026',
      title: 'All-India Engineering Grand Championship 2026',
      description: 'The premier live engineering quiz testing Computer Systems, Distributed Systems, VLSI, and Deep Learning with synchronized real-time competition.',
      domain: 'Computer Science & AI',
      status: 'UPCOMING',
      timer_seconds: 30,
      current_question_index: -1
    };

    await db.execute({
      sql: `INSERT OR REPLACE INTO events (id, title, description, domain, status, timer_seconds, current_question_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
      args: [event1.id, event1.title, event1.description, event1.domain, event1.status, event1.timer_seconds, event1.current_question_index]
    });

    const event1Questions = [
      {
        id: 'q_evt1_1',
        event_id: event1.id,
        question_text: 'What is the time complexity of finding a cycle in a directed graph using Kahn’s Algorithm (Topological Sort)?',
        options_json: JSON.stringify(['O(V · E)', 'O(V + E)', 'O(V log V)', 'O(E²)']),
        correct_option: 1,
        explanation: 'Kahn\'s algorithm visits every vertex once and decrements in-degrees for every edge once, achieving linear O(V + E) time complexity.',
        points: 100,
        timer_seconds: 30,
        question_order: 1
      },
      {
        id: 'q_evt1_2',
        event_id: event1.id,
        question_text: 'In Transformer architectures, what is the primary computational bottleneck when scaling sequence length L in standard multi-head self-attention?',
        options_json: JSON.stringify([
          'Linear O(L · d_k) memory bottleneck',
          'Quadratic O(L²) memory & compute cost',
          'Exponential O(2^L) token projection cost',
          'Logarithmic O(log L) cache lookups'
        ]),
        correct_option: 1,
        explanation: 'Computing the product (Q · K^T) creates an L × L attention matrix, resulting in quadratic O(L²) compute and memory scaling with sequence length.',
        points: 100,
        timer_seconds: 30,
        question_order: 2
      },
      {
        id: 'q_evt1_3',
        event_id: event1.id,
        question_text: 'In distributed consensus algorithms (like Raft or Multi-Paxos), what is the minimum number of nodes required to survive F crash-recovery node failures without losing liveness?',
        options_json: JSON.stringify(['F + 1 nodes', '2F + 1 nodes', '3F + 1 nodes', '2F nodes']),
        correct_option: 1,
        explanation: 'Crash-fault tolerant consensus requires a majority quorum Q = floor(N/2) + 1. To survive F failures, N must be at least 2F + 1 nodes.',
        points: 120,
        timer_seconds: 30,
        question_order: 3
      },
      {
        id: 'q_evt1_4',
        event_id: event1.id,
        question_text: 'In modern superscalar CPU microarchitectures, what is the primary role of the Branch Target Buffer (BTB)?',
        options_json: JSON.stringify([
          'Predicting and caching the target address of taken branch instructions',
          'Buffering dirty cache lines before writeback to L3 cache',
          'Storing vector register states during hardware interrupts',
          'Eliminating raw data hazards between arithmetic pipelines'
        ]),
        correct_option: 0,
        explanation: 'The Branch Target Buffer caches target jump addresses so the instruction fetch unit can steer fetching ahead of instruction decode.',
        points: 110,
        timer_seconds: 30,
        question_order: 4
      },
      {
        id: 'q_evt1_5',
        event_id: event1.id,
        question_text: 'Which memory cache replacement policy guarantees the theoretically minimum cache misses (Belady\'s optimal bound) if future memory accesses are known?',
        options_json: JSON.stringify([
          'Least Recently Used (LRU)',
          'OPT / MIN (Belady\'s Algorithm)',
          'First In First Out (FIFO)',
          'Clock with Adaptive Replacement (ARC)'
        ]),
        correct_option: 1,
        explanation: 'Belady\'s OPT/MIN algorithm replaces the page/line that will not be used for the longest period in the future, providing the mathematical lower bound for misses.',
        points: 150,
        timer_seconds: 30,
        question_order: 5
      }
    ];

    for (const q of event1Questions) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO event_questions (id, event_id, question_text, options_json, correct_option, explanation, points, timer_seconds, question_order, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
        args: [q.id, q.event_id, q.question_text, q.options_json, q.correct_option, q.explanation, q.points, q.timer_seconds, q.question_order]
      });
    }

    const event2 = {
      id: 'evt_silicon_circuits_live',
      title: 'National Semiconductor & VLSI Blitz',
      description: 'Fast-paced live competition covering RISC-V pipelining, CMOS dynamic power dissipation, and RTOS real-time guarantees.',
      domain: 'Embedded Systems & VLSI',
      status: 'UPCOMING',
      timer_seconds: 25,
      current_question_index: -1
    };

    await db.execute({
      sql: `INSERT OR REPLACE INTO events (id, title, description, domain, status, timer_seconds, current_question_index, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
      args: [event2.id, event2.title, event2.description, event2.domain, event2.status, event2.timer_seconds, event2.current_question_index]
    });

    const event2Questions = [
      {
        id: 'q_evt2_1',
        event_id: event2.id,
        question_text: 'In a CMOS logic inverter, what causes short-circuit dynamic power dissipation during logic transitions?',
        options_json: JSON.stringify([
          'Parasitic capacitance leakage to silicon substrate',
          'Simultaneous conduction of both NMOS and PMOS transistors during input ramp',
          'Sub-threshold drain-source punch-through breakdown',
          'Bond-wire parasitic inductance kickback'
        ]),
        correct_option: 1,
        explanation: 'When the input voltage transitions between V_IL and V_IH, both PMOS and NMOS conduct simultaneously for a brief duration, creating a direct path from VDD to GND.',
        points: 100,
        timer_seconds: 25,
        question_order: 1
      },
      {
        id: 'q_evt2_2',
        event_id: event2.id,
        question_text: 'What is the primary objective of inserting pipeline registers in a high-performance RISC-V CPU datapath?',
        options_json: JSON.stringify([
          'Decreasing overall latency of an individual instruction',
          'Shortening the critical path clock period, enabling higher operating frequency',
          'Eliminating all hazard detection logic',
          'Doubling the width of the integer register file'
        ]),
        correct_option: 1,
        explanation: 'Pipelining divides combinational logic delays into shorter clock cycles, increasing clock frequency and overall instruction throughput (CPI ~ 1).',
        points: 100,
        timer_seconds: 25,
        question_order: 2
      },
      {
        id: 'q_evt2_3',
        event_id: event2.id,
        question_text: 'In synchronous digital design and STA (Static Timing Analysis), what does a Setup Time (Tsu) violation indicate?',
        options_json: JSON.stringify([
          'Data arrived and stabilized too late before the active clock edge',
          'Data did not remain stable for sufficient duration after the clock edge',
          'Clock distribution network skew is strictly zero',
          'The power supply rail voltage is excessively high'
        ]),
        correct_option: 0,
        explanation: 'Setup time requires data to remain stable for a minimum duration BEFORE the sampling clock edge. Arriving too late causes metastability and setup violations.',
        points: 120,
        timer_seconds: 25,
        question_order: 3
      }
    ];

    for (const q of event2Questions) {
      await db.execute({
        sql: `INSERT OR REPLACE INTO event_questions (id, event_id, question_text, options_json, correct_option, explanation, points, timer_seconds, question_order, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
        args: [q.id, q.event_id, q.question_text, q.options_json, q.correct_option, q.explanation, q.points, q.timer_seconds, q.question_order]
      });
    }

    console.log('[Turso DB] Seeded Real-Time Events with Questions');
    return { seeded: true, events: 2 };
  } catch (err) {
    console.error('Failed to seed events:', err);
    return { seeded: false, error: String(err) };
  }
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
