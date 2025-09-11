// Testfil för att kontrollera PostgreSQL-anslutningen
// Kör denna fil med: npx tsx src/test-db-connection.ts

import { query, closePool } from './integrations/postgresql/client';
import { config } from 'dotenv';

// Ladda miljövariabler
config();

async function testDatabaseConnection() {
  console.log('🔄 Testar PostgreSQL-anslutning...');
  console.log('📋 Databasuppgifter:');
  console.log(`   Host: ${process.env.DB_HOST || 'localhost'}`);
  console.log(`   Port: ${process.env.DB_PORT || '5432'}`);
  console.log(`   Database: ${process.env.DB_NAME || 'ej angivet'}`);
  console.log(`   User: ${process.env.DB_USER || 'ej angivet'}`);
  console.log(`   SSL: ${process.env.DB_SSL || 'false'}`);
  console.log('');

  try {
    // Test 1: Grundläggande anslutning
    console.log('✅ Test 1: Grundläggande anslutning...');
    const basicTest = await query('SELECT NOW() as current_time, version() as postgres_version');
    console.log(`   ✅ Anslutning lyckades!`);
    console.log(`   🕐 Server tid: ${basicTest.rows[0].current_time}`);
    console.log(`   🐘 PostgreSQL version: ${basicTest.rows[0].postgres_version.split(' ')[0]}`);
    console.log('');

    // Test 2: Kontrollera om tabeller finns
    console.log('✅ Test 2: Kontrollerar tabeller...');
    const tablesTest = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);
    
    const tableNames = tablesTest.rows.map(row => row.table_name);
    console.log(`   📊 Hittade ${tableNames.length} tabeller:`);
    tableNames.forEach(name => console.log(`      - ${name}`));
    console.log('');

    // Test 3: Kontrollera specifika tabeller som används i appen
    console.log('✅ Test 3: Kontrollerar specifika tabeller...');
    const requiredTables = [
      'media_outlets',
      'orders', 
      'cart_items',
      'favorites',
      'metrics',
      'niches'
    ];

    for (const tableName of requiredTables) {
      try {
        const tableCheck = await query(`
          SELECT COUNT(*) as count 
          FROM ${tableName} 
          LIMIT 1
        `);
        console.log(`   ✅ Tabell '${tableName}' finns och är tillgänglig (${tableCheck.rows[0].count} poster)`);
      } catch (error) {
        console.log(`   ❌ Tabell '${tableName}' saknas eller är inte tillgänglig`);
      }
    }
    console.log('');

    // Test 4: Testa en enkel SELECT-fråga på media_outlets
    console.log('✅ Test 4: Testar SELECT-fråga på media_outlets...');
    try {
      const mediaTest = await query(`
        SELECT id, domain, category, price, is_active 
        FROM media_outlets 
        LIMIT 3
      `);
      console.log(`   ✅ Lyckades hämta ${mediaTest.rows.length} media outlets:`);
      mediaTest.rows.forEach(outlet => {
        console.log(`      - ${outlet.domain} (${outlet.category}) - ${outlet.price} - Active: ${outlet.is_active}`);
      });
    } catch (error) {
      console.log(`   ❌ Kunde inte hämta från media_outlets: ${error}`);
    }
    console.log('');

    console.log('🎉 Alla tester slutförda! Din PostgreSQL-anslutning fungerar korrekt.');
    
  } catch (error) {
    console.error('❌ Databastest misslyckades:', error);
    console.log('');
    console.log('🔧 Felsökningstips:');
    console.log('   1. Kontrollera att din .env-fil finns och innehåller rätt databasuppgifter');
    console.log('   2. Kontrollera att PostgreSQL-servern körs');
    console.log('   3. Kontrollera att användarnamn och lösenord är korrekt');
    console.log('   4. Kontrollera att databasen existerar');
    console.log('   5. Kontrollera att användaren har behörighet att ansluta');
    console.log('');
    console.log('📝 Exempel på korrekt .env-fil:');
    console.log('   DATABASE_URL=postgresql://postgres:lösenord@localhost:5432/moodymedia');
    console.log('   DB_HOST=localhost');
    console.log('   DB_PORT=5432');
    console.log('   DB_NAME=moodymedia');
    console.log('   DB_USER=postgres');
    console.log('   DB_PASSWORD=lösenord');
    console.log('   DB_SSL=false');
  } finally {
    // Stäng anslutningspoolen
    await closePool();
    console.log('🔌 Databasanslutning stängd.');
  }
}

// Kör testet
testDatabaseConnection().catch(console.error);
