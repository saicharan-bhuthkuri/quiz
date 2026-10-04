import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config();

const url = process.env.TURSO_DATABASE_URL || 'https://engiverse-rushanth.aws-ap-south-1.turso.io';
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

    console.log('[Turso DB] Database initialized successfully in Backend (including Events and Real-Time Quiz tables)');
    await seedUsersIfEmpty();
    await seedEventsIfEmpty();
  } catch (error) {
    console.error('[Turso DB] Failed to initialize Turso database:', error);
  }
}

export const INITIAL_SEEDED_USERS = [
  {
    id: 'usr_saicharan_super',
    name: 'Sai Charan Bhuthkuri',
    email: process.env.ADMIN_EMAIL || 'saicharanbhuthkuri468@gmail.com',
    mobile: '+91 99999 99999',
    branch: 'Computer Systems & AI',
    year: 'Staff Principal',
    password: process.env.ADMIN_PASSWORD ? bcrypt.hashSync(process.env.ADMIN_PASSWORD, 10) : '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    streak: 50,
    xp: 99999,
    badge: 'SUPERADMIN • Principal Systems Architect'
  },
  {
    id: 'usr_elena_quantum',
    name: 'Elena Rostova',
    email: 'elena.rostova@quantum.eng',
    mobile: '+1 (555) 438-9201',
    branch: 'Computer Science (CSE)',
    year: '4th Year',
    password: 'QuantumCore#2026',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&q=80',
    streak: 42,
    xp: 48920,
    badge: 'Grandmaster Engineer'
  },
  {
    id: 'usr_devon_silicon',
    name: 'Devon Vance',
    email: 'devon.vance@silicon.io',
    mobile: '+1 (555) 891-2304',
    branch: 'Electronics & Communication (ECE)',
    year: '3rd Year',
    password: 'Silicon#Gate2026',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
    streak: 29,
    xp: 46150,
    badge: 'Silicon Architect'
  },
  {
    id: 'usr_aisha_neural',
    name: 'Aisha Patel',
    email: 'aisha.patel@neural.tech',
    mobile: '+91 98201 45672',
    branch: 'AI & Data Science (AI/DS)',
    year: 'Graduate',
    password: 'TensorFlow#2026',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&q=80',
    streak: 35,
    xp: 43800,
    badge: 'Neural Pioneer'
  },
  {
    id: 'usr_marcus_robot',
    name: 'Marcus Chen',
    email: 'marcus.chen@robotics.mit',
    mobile: '+1 (555) 302-8819',
    branch: 'Mechanical Engineering (ME)',
    year: '4th Year',
    password: 'Kinematics#2026',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
    streak: 18,
    xp: 41200,
    badge: 'Robotics Savant'
  },
  {
    id: 'usr_sofia_cloud',
    name: 'Sofia Al-Mansoor',
    email: 'sofia.mansoor@cloud.dev',
    mobile: '+971 50 123 4567',
    branch: 'Information Technology (IT)',
    year: 'Graduate',
    password: 'Kubernetes#2026',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80',
    streak: 24,
    xp: 39950,
    badge: 'Cloud Principal'
  },
  {
    id: 'usr_liam_aero',
    name: 'Liam O’Connor',
    email: 'liam.oc@aerospace.eu',
    mobile: '+44 7700 900123',
    branch: 'Aerospace Engineering',
    year: '2nd Year',
    password: 'Hypersonic#2026',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=120&q=80',
    streak: 14,
    xp: 28400,
    badge: 'Aerodynamic Ace'
  },
  {
    id: 'usr_priya_power',
    name: 'Priya Sharma',
    email: 'priya.sharma@renewable.in',
    mobile: '+91 94451 98765',
    branch: 'Electrical & Electronics (EEE)',
    year: '1st Year',
    password: 'SmartGrid#2026',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=120&q=80',
    streak: 9,
    xp: 19800,
    badge: 'Energy Specialist'
  },
  {
    id: 'usr_alex_struct',
    name: 'Alex Rivera',
    email: 'alex.rivera@struct.org',
    mobile: '+1 (555) 773-4412',
    branch: 'Civil Engineering (CE)',
    year: '3rd Year',
    password: 'Autocad#2026',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=120&q=80',
    streak: 11,
    xp: 22100,
    badge: 'Structural Virtuoso'
  }
];

export async function seedUsersIfEmpty(force = false) {
  try {
    const countRes = await db.execute('SELECT COUNT(*) as c FROM users;');
    const count = Number(countRes.rows[0]?.c || 0);

    if (count > 0 && !force) {
      return { seeded: false, count };
    }

    for (const u of INITIAL_SEEDED_USERS) {
      const hashedPassword = bcrypt.hashSync(u.password, 10);
      await db.execute({
        sql: `INSERT OR IGNORE INTO users (id, name, email, mobile, branch, year, password, avatar, streak, xp, badge, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
        args: [u.id, u.name, u.email, u.mobile, u.branch, u.year, hashedPassword, u.avatar, u.streak, u.xp, u.badge]
      });
    }

    // Seed quiz attempts if empty
    const attCountRes = await db.execute('SELECT COUNT(*) as c FROM quiz_attempts;');
    const attCount = Number(attCountRes.rows[0]?.c || 0);
    if (attCount === 0 || force) {
      const attempts = [
        { id: 'att_seed_1', user_email: 'elena.rostova@quantum.eng', user_name: 'Elena Rostova', score: 10, total_questions: 10, xp_earned: 1200, accuracy: 100, rank_title: 'Quantum Master' },
        { id: 'att_seed_2', user_email: 'devon.vance@silicon.io', user_name: 'Devon Vance', score: 9, total_questions: 10, xp_earned: 950, accuracy: 90, rank_title: 'Silicon Grandmaster' },
        { id: 'att_seed_3', user_email: 'aisha.patel@neural.tech', user_name: 'Aisha Patel', score: 10, total_questions: 10, xp_earned: 1100, accuracy: 100, rank_title: 'Deep Learning Lead' },
        { id: 'att_seed_4', user_email: 'marcus.chen@robotics.mit', user_name: 'Marcus Chen', score: 8, total_questions: 10, xp_earned: 800, accuracy: 80, rank_title: 'Robotics Specialist' },
        { id: 'att_seed_5', user_email: 'sofia.mansoor@cloud.dev', user_name: 'Sofia Al-Mansoor', score: 9, total_questions: 10, xp_earned: 900, accuracy: 90, rank_title: 'DevOps Architect' },
      ];
      for (const a of attempts) {
        await db.execute({
          sql: `INSERT OR IGNORE INTO quiz_attempts (id, user_email, user_name, score, total_questions, xp_earned, accuracy, rank_title, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'));`,
          args: [a.id, a.user_email, a.user_name, a.score, a.total_questions, a.xp_earned, a.accuracy, a.rank_title]
        });
      }
    }

    // Seed admins table if empty
    const adminCountRes = await db.execute('SELECT COUNT(*) as c FROM admins;');
    const adminCount = Number(adminCountRes.rows[0]?.c || 0);
    const configuredAdminEmail = (process.env.ADMIN_EMAIL || 'saicharanbhuthkuri468@gmail.com').trim().toLowerCase();
    const configuredAdminPassword = process.env.ADMIN_PASSWORD;

    if ((adminCount === 0 || force) && configuredAdminPassword) {
      const defaultAdmins = [
        {
          id: 'adm_saicharan_super',
          name: 'Sai Charan Bhuthkuri',
          email: configuredAdminEmail,
          password: configuredAdminPassword,
          role: 'SUPERADMIN'
        }
      ];
      for (const a of defaultAdmins) {
        const hashedAdminPassword = bcrypt.hashSync(a.password, 10);
        await db.execute({
          sql: `INSERT OR IGNORE INTO admins (id, name, email, password, role, created_at)
                VALUES (?, ?, ?, ?, ?, datetime('now'));`,
          args: [a.id, a.name, a.email, hashedAdminPassword, a.role]
        });
      }
    }

    console.log(`[Turso DB] Seeded ${INITIAL_SEEDED_USERS.length} realistic engineers into Turso DB`);
    return { seeded: true, count: INITIAL_SEEDED_USERS.length };
  } catch (err) {
    console.error('Failed to seed users and admins:', err);
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

    // Default Event 1: All-India Engineering Grand Championship 2026
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

    // Default Event 2: National Semiconductor & VLSI Blitz
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

    // Seed sample registrations so live events already feel populated
    const sampleRegistrations = [
      { id: 'reg_1', event_id: event1.id, user_id: 'usr_elena_quantum', user_name: 'Elena Rostova', user_email: 'elena.rostova@quantum.eng' },
      { id: 'reg_2', event_id: event1.id, user_id: 'usr_devon_silicon', user_name: 'Devon Vance', user_email: 'devon.vance@silicon.io' },
      { id: 'reg_3', event_id: event1.id, user_id: 'usr_aisha_neural', user_name: 'Aisha Patel', user_email: 'aisha.patel@neural.tech' },
      { id: 'reg_4', event_id: event2.id, user_id: 'usr_devon_silicon', user_name: 'Devon Vance', user_email: 'devon.vance@silicon.io' },
      { id: 'reg_5', event_id: event2.id, user_id: 'usr_marcus_robot', user_name: 'Marcus Chen', user_email: 'marcus.chen@robotics.mit' }
    ];

    for (const r of sampleRegistrations) {
      await db.execute({
        sql: `INSERT OR IGNORE INTO event_registrations (id, event_id, user_id, user_name, user_email, registered_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'));`,
        args: [r.id, r.event_id, r.user_id, r.user_name, r.user_email]
      });
    }

    console.log('[Turso DB] Seeded 2 Real-Time Events with Questions and Registrations');
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
