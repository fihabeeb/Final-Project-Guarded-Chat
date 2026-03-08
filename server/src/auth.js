import bcrypt from 'bcrypt';
import pool from './db.js';

const SALT_ROUNDS = 12;

// In-memory cache so getUserById stays synchronous throughout the codebase.
// Populated on startup and updated whenever a user registers or logs in.
const usersCache = new Map();

export async function loadUsersFromDB() {
  const { rows } = await pool.query('SELECT id, username, name FROM users');
  rows.forEach(row => usersCache.set(row.id, { id: row.id, username: row.username, name: row.name }));
  console.log(`[Auth] Loaded ${rows.length} users from database`);
}

export async function authenticateUser(usernameIn, passwordIn) {
  const { rows } = await pool.query(
    'SELECT id, username, name, password_hash FROM users WHERE username = $1',
    [usernameIn]
  );
  if (rows.length === 0) return null;

  const user = rows[0];
  const match = await bcrypt.compare(passwordIn, user.password_hash);
  if (!match) return null;

  const cached = { id: user.id, username: user.username, name: user.name };
  usersCache.set(user.id, cached);
  return cached;
}

export async function registerUser(username, name, password) {
  if (!username || !name || !password) {
    return { success: false, message: 'All fields are required' };
  }
  if (username.length < 3) {
    return { success: false, message: 'Username must be at least 3 characters' };
  }
  if (password.length < 6) {
    return { success: false, message: 'Password must be at least 6 characters' };
  }

  const existing = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
  if (existing.rows.length > 0) {
    return { success: false, message: 'Username already taken' };
  }

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const { rows } = await pool.query(
    'INSERT INTO users (username, name, password_hash) VALUES ($1, $2, $3) RETURNING id, username, name',
    [username, name, hash]
  );

  const user = rows[0];
  usersCache.set(user.id, { id: user.id, username: user.username, name: user.name });
  return { success: true, user: { id: user.id, username: user.username, name: user.name } };
}

// Synchronous — uses cache. Any user who has ever logged in or registered will be present.
export function getUserById(userId) {
  return usersCache.get(userId) || null;
}

export function getUsersByIds(userIds) {
  return userIds.map(id => getUserById(id)).filter(Boolean);
}

export async function searchUsers(query) {
  if (!query || query.trim().length === 0) return [];
  const pattern = `%${query.toLowerCase().trim()}%`;
  const { rows } = await pool.query(
    `SELECT id, username, name FROM users
     WHERE LOWER(username) LIKE $1 OR LOWER(name) LIKE $1
     LIMIT 20`,
    [pattern]
  );
  return rows;
}
