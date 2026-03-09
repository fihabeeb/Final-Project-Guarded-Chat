import pool from './db.js';

export async function queueKeyExchange(userId, friendId, publicKey) {
  await pool.query(
    `INSERT INTO pending_key_exchanges (user_id, friend_id, public_key)
     VALUES ($1, $2, $3) ON CONFLICT (user_id, friend_id) DO UPDATE SET public_key = $3`,
    [userId, friendId, publicKey]
  );
}

export async function getPendingKeyExchanges(userId) {
  const { rows } = await pool.query(
    `DELETE FROM pending_key_exchanges WHERE user_id = $1
     RETURNING friend_id AS "friendId", public_key AS "publicKey"`,
    [userId]
  );
  return rows;
}
