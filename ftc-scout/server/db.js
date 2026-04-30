import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS events (
      id SERIAL PRIMARY KEY,
      type VARCHAR(50) NOT NULL,
      data JSONB,
      ip VARCHAR(50),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('[db] tables ready');
}

export async function logEvent(type, data, ip) {
  try {
    await pool.query(
      'INSERT INTO events (type, data, ip) VALUES ($1, $2, $3)',
      [type, JSON.stringify(data), ip]
    );
  } catch (e) {
    console.error('[db] logEvent error:', e.message);
  }
}

export async function getMetrics() {
  const result = await pool.query(`
    SELECT
      type,
      COUNT(*) as count,
      DATE_TRUNC('day', created_at) as day
    FROM events
    GROUP BY type, day
    ORDER BY day DESC
  `);
  return result.rows;
}

export async function getTopTeams() {
  const result = await pool.query(`
    SELECT
      data->>'team_number' as team_number,
      data->>'team_name' as team_name,
      COUNT(*) as searches
    FROM events
    WHERE type = 'team_search'
    GROUP BY team_number, team_name
    ORDER BY searches DESC
    LIMIT 10
  `);
  return result.rows;
}

export async function getSimulationCount() {
  const result = await pool.query(`
    SELECT COUNT(*) as total FROM events WHERE type = 'simulate'
  `);
  return result.rows[0].total;
}

export default pool;