import pool from './db.js';

export async function queueMessage(recipientId, senderId, senderName, message) {
  await pool.query(
    `INSERT INTO message_queue (recipient_id, sender_id, sender_name, message)
     VALUES ($1, $2, $3, $4)`,
    [recipientId, senderId, senderName, message]
  );
}

export async function getPendingMessages(userId) {
  const { rows } = await pool.query(
    `SELECT sender_id AS "from", sender_name AS "fromName", message, timestamp
     FROM message_queue WHERE recipient_id = $1 ORDER BY timestamp ASC`,
    [userId]
  );
  return rows;
}

export async function clearPendingMessages(userId) {
  const { rowCount } = await pool.query(
    `DELETE FROM message_queue WHERE recipient_id = $1`,
    [userId]
  );
  return rowCount;
}

export async function getPendingMessageCount(userId) {
  const { rows } = await pool.query(
    `SELECT COUNT(*) AS count FROM message_queue WHERE recipient_id = $1`,
    [userId]
  );
  return parseInt(rows[0].count, 10);
}
