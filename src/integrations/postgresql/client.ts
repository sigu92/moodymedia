import { Pool, PoolClient, QueryResult } from 'pg';
import { config } from 'dotenv';

// Ladda miljövariabler
config();

// Skapa en connection pool för bättre prestanda
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: 20, // Maximum antal anslutningar i poolen
  idleTimeoutMillis: 30000, // Stäng inaktiva anslutningar efter 30 sekunder
  connectionTimeoutMillis: 2000, // Timeout för att få en anslutning
});

// Testa anslutningen vid start
pool.on('connect', () => {
  console.log('✅ Ansluten till PostgreSQL databas');
});

pool.on('error', (err) => {
  console.error('❌ PostgreSQL anslutningsfel:', err);
});

// Huvudfunktion för att köra SQL-frågor
export const query = async <T = any>(
  text: string, 
  params?: any[]
): Promise<QueryResult<T>> => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } catch (error) {
    console.error('SQL-fråga fel:', error);
    throw error;
  } finally {
    client.release();
  }
};

// Funktion för transaktioner
export const transaction = async <T>(
  callback: (client: PoolClient) => Promise<T>
): Promise<T> => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

// Funktion för att stänga alla anslutningar
export const closePool = async (): Promise<void> => {
  await pool.end();
};

// Exportera pool för avancerade användningsfall
export { pool };

// Default export för enkelhet
export default {
  query,
  transaction,
  closePool,
  pool
};
