import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Create tables if they don't exist
export async function initializeDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username      VARCHAR(50)  UNIQUE NOT NULL,
      name          VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at    TIMESTAMPTZ  DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS friend_requests (
      id              SERIAL PRIMARY KEY,
      from_user_id    UUID NOT NULL,
      to_user_id      UUID NOT NULL,
      sender_public_key TEXT,
      created_at      TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(from_user_id, to_user_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_friend_additions (
      user_id    UUID NOT NULL,
      friend_id  UUID NOT NULL,
      PRIMARY KEY(user_id, friend_id)
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS message_queue (
      id           SERIAL PRIMARY KEY,
      recipient_id UUID NOT NULL,
      sender_id    UUID NOT NULL,
      sender_name  VARCHAR(100) NOT NULL,
      message      TEXT NOT NULL,
      timestamp    TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS pending_key_exchanges (
      user_id    UUID NOT NULL,
      friend_id  UUID NOT NULL,
      public_key TEXT NOT NULL,
      PRIMARY KEY(user_id, friend_id)
    )
  `);

  console.log('[DB] Tables ready');
}

export default pool;
