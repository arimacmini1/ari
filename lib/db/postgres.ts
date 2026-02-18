/**
 * PostgreSQL Database Connection
 * F07-MH-01: Audit Log Storage Layer
 * 
 * Initializes and manages PostgreSQL connection for audit logging.
 * Uses node-postgres (pg) for connection pooling and query execution.
 */

import { Pool, PoolClient } from 'pg';

// Hardcoded config - override with env vars if properly set
const pool = new Pool({
  user: process.env.DB_USER || 'aei_user',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.PG_DATABASE || 'aei_app',
  password: process.env.DB_PASSWORD || 'aei_pass',
  port: parseInt(process.env.DB_PORT || '5432'),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

const LOG_QUERIES = process.env.DB_LOG_QUERIES === 'true';

// Handle pool errors
pool.on('error', (err: unknown) => {
  console.error('Unexpected error on idle client', err);
});

/**
 * Execute a query on the pool
 */
export async function query<T = any>(
  text: string,
  params?: any[]
): Promise<{ rows: T[]; rowCount: number | null }> {
  const start = Date.now();
  try {
    const result = await pool.query(text, params);
    const duration = Date.now() - start;
    if (LOG_QUERIES) {
      console.log('Executed query', { text, duration, rows: result.rowCount });
    }
    return {
      rows: result.rows as T[],
      rowCount: result.rowCount,
    };
  } catch (error) {
    console.error('Database query error:', { text, error });
    throw error;
  }
}

/**
 * Get a client from the pool for transactions
 */
export async function getClient(): Promise<PoolClient> {
  return pool.connect();
}

/**
 * Close all connections
 */
export async function closePool(): Promise<void> {
  await pool.end();
}

export default pool;
