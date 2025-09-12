import pkg from 'pg';
const { Client } = pkg;

// Database connection using direct connection string
const connectionString = 'postgresql://postgres:Musknappar50!@db.fylrytiilgkjhqlyetde.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

// Migration SQL statements
const migrations = [
  {
    name: 'Add purchase_price column',
    sql: `
      ALTER TABLE public.media_outlets
      ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
    `
  },
  {
    name: 'Add status enum column',
    sql: `
      CREATE TYPE IF NOT EXISTS media_outlet_status AS ENUM ('pending', 'approved', 'rejected', 'active');

      ALTER TABLE public.media_outlets
      ADD COLUMN IF NOT EXISTS status media_outlet_status NOT NULL DEFAULT 'active';
    `
  },
  {
    name: 'Add submission tracking columns',
    sql: `
      ALTER TABLE public.media_outlets
      ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS review_notes TEXT;
    `
  },
  {
    name: 'Add performance indexes',
    sql: `
      CREATE INDEX IF NOT EXISTS idx_media_outlets_status ON public.media_outlets(status);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_submitted_at ON public.media_outlets(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_reviewed_at ON public.media_outlets(reviewed_at);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_submitted_by ON public.media_outlets(submitted_by);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_reviewed_by ON public.media_outlets(reviewed_by);
    `
  }
];

async function runMigrations() {
  console.log('🚀 Marketplace Manager System - Database Migrations\n');

  // Client already created above

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Test connection with a simple query
    const testResult = await client.query('SELECT version()');
    console.log('📊 PostgreSQL version:', testResult.rows[0].version.split(' ')[1]);

    // Run each migration
    for (let i = 0; i < migrations.length; i++) {
      const migration = migrations[i];
      console.log(`📋 Running Migration ${i + 1}: ${migration.name}...`);

      try {
        await client.query(migration.sql);
        console.log(`✅ Migration ${i + 1} completed!\n`);
      } catch (error) {
        console.error(`❌ Migration ${i + 1} failed:`, error.message);
        console.error('SQL:', migration.sql.trim());
        throw error;
      }
    }

    console.log('🎉 All migrations completed successfully!');
    console.log('📊 Database schema updated for Marketplace Manager System');
    console.log('');
    console.log('✅ Database ready for:');
    console.log('   • Publisher submissions (status: pending)');
    console.log('   • Admin approvals (status: approved/rejected/active)');
    console.log('   • Dual pricing (purchase_price + price)');
    console.log('   • Audit trails (submitted_by, reviewed_by, etc.)');

  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigrations();
