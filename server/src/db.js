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
      id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      username    VARCHAR(50)  UNIQUE NOT NULL,
      name        VARCHAR(100) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at  TIMESTAMPTZ  DEFAULT NOW()
    )
  `);
  console.log('[DB] Tables ready');
}

export default pool;
