/**
 * PostgreSQL Database Connection
 * F07-MH-01: Audit Log Storage Layer
 * 
 * Initializes and manages PostgreSQL connection for audit logging.
 * Uses node-postgres (pg) for connection pooling and query execution.
 */

import { Pool, PoolClient } from 'pg';

// Initialize connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://localhost:5432/aei_app',
  max: 20, // maximum pool size
  idleTimeoutMillis: 30000, // idle client timeout
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
