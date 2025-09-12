#!/usr/bin/env node

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
function loadEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('❌ .env file not found at:', envPath);
    console.error('Please create a .env file with your PostgreSQL connection string:');
    console.error('DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.fylrytiilgkjhqlyetde.supabase.co:5432/postgres');
    process.exit(1);
  }

  const envContent = fs.readFileSync(envPath, 'utf8');
  const envLines = envContent.split('\n');
  const envVars = {};

  envLines.forEach(line => {
    if (line.trim() && !line.startsWith('#')) {
      const [key, ...valueParts] = line.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

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

  // Load environment variables
  const envVars = loadEnvFile();
  const connectionString = envVars.DATABASE_URL || envVars.POSTGRESQL;

  if (!connectionString) {
    console.error('❌ No DATABASE_URL or POSTGRESQL found in .env file');
    console.error('Available env vars:', Object.keys(envVars));
    process.exit(1);
  }

  console.log('🔗 Database connection found');
  console.log('🏠 Host:', connectionString.match(/@([^:]+):/)?.[1] || 'Unknown');
  console.log('');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

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
    console.log('✅ Ready for next tasks:');
    console.log('   - RLS policy updates');
    console.log('   - Publisher submission interface');
    console.log('   - Admin approval dashboard');

  } catch (error) {
    console.error('❌ Migration process failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Check if pg is installed
try {
  require('pg');
} catch (error) {
  console.error('❌ pg package not found. Installing...');
  console.error('Run: npm install pg dotenv');
  process.exit(1);
}

runMigrations();


