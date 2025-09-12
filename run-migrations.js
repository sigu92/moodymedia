const { Client } = require('pg');
require('dotenv').config();

async function runMigrations() {
  // Get connection string from .env
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRESQL;

  if (!connectionString) {
    console.error('❌ No DATABASE_URL or POSTGRESQL found in .env file');
    console.error('Please ensure your .env file contains:');
    console.error('DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.fylrytiilgkjhqlyetde.supabase.co:5432/postgres');
    process.exit(1);
  }

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Migration 1: Add purchase_price column
    console.log('\n📋 Running Migration 1: Add purchase_price column...');
    await client.query(`
      ALTER TABLE public.media_outlets
      ADD COLUMN IF NOT EXISTS purchase_price NUMERIC;
    `);
    console.log('✅ Migration 1 completed!');

    // Migration 2: Add status enum column
    console.log('\n📋 Running Migration 2: Add status enum column...');
    await client.query(`
      CREATE TYPE IF NOT EXISTS media_outlet_status AS ENUM ('pending', 'approved', 'rejected', 'active');
    `);
    await client.query(`
      ALTER TABLE public.media_outlets
      ADD COLUMN IF NOT EXISTS status media_outlet_status NOT NULL DEFAULT 'active';
    `);
    console.log('✅ Migration 2 completed!');

    // Migration 3: Add submission tracking columns
    console.log('\n📋 Running Migration 3: Add submission tracking columns...');
    await client.query(`
      ALTER TABLE public.media_outlets
      ADD COLUMN IF NOT EXISTS submitted_by UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id),
      ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS review_notes TEXT;
    `);
    console.log('✅ Migration 3 completed!');

    // Migration 4: Add performance indexes
    console.log('\n📋 Running Migration 4: Add performance indexes...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_media_outlets_status ON public.media_outlets(status);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_submitted_at ON public.media_outlets(submitted_at);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_reviewed_at ON public.media_outlets(reviewed_at);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_submitted_by ON public.media_outlets(submitted_by);
      CREATE INDEX IF NOT EXISTS idx_media_outlets_reviewed_by ON public.media_outlets(reviewed_by);
    `);
    console.log('✅ Migration 4 completed!');

    console.log('\n🎉 All migrations completed successfully!');
    console.log('📊 Database schema updated for Marketplace Manager System');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

runMigrations();


