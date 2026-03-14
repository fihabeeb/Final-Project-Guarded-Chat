import pool from './db.js';

export async function sendFriendRequest(fromUserId, toUserId, senderPublicKey) {
  if (fromUserId === toUserId) {
    return { success: false, message: 'Cannot send friend request to yourself' };
  }
  try {
    await pool.query(
      `INSERT INTO friend_requests (from_user_id, to_user_id, sender_public_key)
       VALUES ($1, $2, $3)
       ON CONFLICT DO NOTHING`,
      [fromUserId, toUserId, senderPublicKey || null]
    );
    return { success: true, message: 'Friend request sent' };
  } catch (e) {
    return { success: false, message: 'Friend request already sent' };
  }
}

export async function getFriendRequests(userId) {
  const { rows } = await pool.query(
    `SELECT from_user_id AS "from", sender_public_key AS "senderPublicKey", created_at AS "timestamp"
     FROM friend_requests WHERE to_user_id = $1`,
    [userId]
  );
  return rows;
}

export async function acceptFriendRequest(userId, fromUserId) {
  const { rows } = await pool.query(
    `DELETE FROM friend_requests
     WHERE to_user_id = $1 AND from_user_id = $2
     RETURNING sender_public_key AS "senderPublicKey"`,
    [userId, fromUserId]
  );
  if (rows.length === 0) {
    return { success: false, message: 'Friend request not found' };
  }
  const raw = rows[0].senderPublicKey;
  return { success: true, fromUserId, senderPublicKey: raw ? JSON.parse(raw) : null };
}

export async function rejectFriendRequest(userId, fromUserId) {
  const { rowCount } = await pool.query(
    `DELETE FROM friend_requests WHERE to_user_id = $1 AND from_user_id = $2`,
    [userId, fromUserId]
  );
  return rowCount > 0 ? { success: true } : { success: false, message: 'Friend request not found' };
}

export async function hasFriendRequest(fromUserId, toUserId) {
  const { rowCount } = await pool.query(
    `SELECT 1 FROM friend_requests WHERE from_user_id = $1 AND to_user_id = $2`,
    [fromUserId, toUserId]
  );
  return rowCount > 0;
}

export async function addPendingFriendAddition(userId, friendId) {
  await pool.query(
    `INSERT INTO pending_friend_additions (user_id, friend_id)
     VALUES ($1, $2) ON CONFLICT DO NOTHING`,
    [userId, friendId]
  );
}

export async function getPendingFriendAdditions(userId) {
  const { rows } = await pool.query(
    `DELETE FROM pending_friend_additions WHERE user_id = $1 RETURNING friend_id`,
    [userId]
  );
  return rows.map(r => r.friend_id);
}
