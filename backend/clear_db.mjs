import { createClient } from '@libsql/client';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env' });

const url = process.env.TURSO_DATABASE_URL || 'https://engiverse-rushanth.aws-ap-south-1.turso.io';
const authToken = process.env.TURSO_AUTH_TOKEN || '';

const db = createClient({ url, authToken });

async function clearDatabase() {
  console.log('🚀 Connecting to Turso Cloud DB at:', url);

  try {
    // 1. Clear all test event answers / live quiz responses
    console.log('🧹 Clearing event_answers...');
    await db.execute('DELETE FROM event_answers;');

    // 2. Clear all daily quiz attempts and general quiz attempts
    console.log('🧹 Clearing daily_quiz_attempts and quiz_attempts...');
    await db.execute('DELETE FROM daily_quiz_attempts;');
    await db.execute('DELETE FROM quiz_attempts;');

    // 3. Clear all event registrations
    console.log('🧹 Clearing event_registrations...');
    await db.execute('DELETE FROM event_registrations;');

    // 4. Delete test events created during testing
    console.log('🧹 Deleting temporary test events and their questions...');
    await db.execute(`
      DELETE FROM event_questions 
      WHERE event_id NOT IN ('evt_eng_championship_2026', 'evt_silicon_circuits_live');
    `);
    await db.execute(`
      DELETE FROM events 
      WHERE id NOT IN ('evt_eng_championship_2026', 'evt_silicon_circuits_live');
    `);

    // 5. Reset official events back to clean UPCOMING state
    console.log('🔄 Resetting official events to UPCOMING with clean question index...');
    await db.execute(`
      UPDATE events 
      SET status = 'UPCOMING', current_question_index = -1;
    `);

    // 6. Reset user stats to clean defaults while keeping login credentials
    console.log('🔄 Resetting user streaks and XP to clean baseline...');
    await db.execute(`
      UPDATE users 
      SET streak = 1, xp = 250 
      WHERE email != 'saicharanbhuthkuri468@gmail.com';
    `);

    // 7. Verify all tables after reset
    console.log('\n📊 DATABASE SUMMARY AFTER CLEANUP:');
    const tables = ['events', 'event_questions', 'event_registrations', 'event_answers', 'daily_quiz_attempts', 'quiz_attempts', 'users', 'admins'];
    for (const t of tables) {
      const res = await db.execute(`SELECT COUNT(*) as c FROM ${t};`);
      console.log(`  - ${t}: ${res.rows[0].c} records`);
    }

    const eventsRes = await db.execute('SELECT id, title, status, current_question_index FROM events;');
    console.log('\n🏆 Clean Official Events:');
    console.table(eventsRes.rows);

    console.log('\n✅ Database has been successfully cleared of all testing data!');
  } catch (error) {
    console.error('❌ Error clearing database:', error);
    process.exit(1);
  }
}

clearDatabase();
