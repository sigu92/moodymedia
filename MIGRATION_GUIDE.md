# Migration Guide: Från Supabase till PostgreSQL

## Översikt
Denna guide visar hur du migrerar ditt projekt från Supabase till direkt PostgreSQL-anslutning.

## Steg som redan är slutförda ✅

1. **Paket installerade**: `pg`, `@types/pg`, `dotenv`, `tsx`
2. **PostgreSQL-klient skapad**: `src/integrations/postgresql/client.ts`
3. **TypeScript-typer skapade**: `src/integrations/postgresql/types.ts`
4. **Hjälpfunktioner skapade**: `src/integrations/postgresql/helpers.ts`
5. **Nya hooks skapade**: PostgreSQL-versioner av dina hooks
6. **Testfil skapad**: `src/test-db-connection.ts`

## Nästa steg för dig

### 1. Skapa .env-filen
Skapa en `.env` fil i projektets rotmapp med dina databasuppgifter:

```env
# PostgreSQL Database Configuration
DATABASE_URL=postgresql://användarnamn:lösenord@localhost:5432/databasnamn
DB_HOST=localhost
DB_PORT=5432
DB_NAME=databasnamn
DB_USER=användarnamn
DB_PASSWORD=lösenord
DB_SSL=false
```

**Exempel för lokal utveckling:**
```env
DATABASE_URL=postgresql://postgres:mittlösenord@localhost:5432/moodymedia
DB_HOST=localhost
DB_PORT=5432
DB_NAME=moodymedia
DB_USER=postgres
DB_PASSWORD=mittlösenord
DB_SSL=false
```

### 2. Testa databasanslutningen
Kör följande kommando för att testa anslutningen:

```bash
npx tsx src/test-db-connection.ts
```

### 3. Uppdatera dina komponenter

#### Steg 3.1: Ersätt Supabase-imports
I alla dina komponenter, ersätt:
```typescript
// GAMMAL
import { supabase } from '@/integrations/supabase/client';

// NY
import { query } from '@/integrations/postgresql/client';
```

#### Steg 3.2: Uppdatera hooks
Ersätt dina befintliga hooks med de nya PostgreSQL-versionerna:

**För useMediaOutlets:**
```typescript
// GAMMAL
import { useMediaOutlets } from '@/hooks/useMediaOutlets';

// NY
import { useMediaOutlets } from '@/hooks/useMediaOutletsPostgreSQL';
```

**För useOrders:**
```typescript
// GAMMAL
import { useOrders } from '@/hooks/useOrders';

// NY
import { useOrders } from '@/hooks/useOrdersPostgreSQL';
```

**För useDashboard:**
```typescript
// GAMMAL
import { useDashboard } from '@/hooks/useDashboard';

// NY
import { useDashboard } from '@/hooks/useDashboardPostgreSQL';
```

#### Steg 3.3: Uppdatera komponenter som använder Supabase direkt

**Exempel på hur du uppdaterar en komponent:**

**GAMMAL kod:**
```typescript
import { supabase } from '@/integrations/supabase/client';

const MyComponent = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase
        .from('media_outlets')
        .select('*')
        .eq('is_active', true);
      
      if (data) setData(data);
    };
    
    fetchData();
  }, []);

  return <div>{/* Din JSX */}</div>;
};
```

**NY kod:**
```typescript
import { mediaOutlets } from '@/integrations/postgresql/helpers';

const MyComponent = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const mediaData = await mediaOutlets.getAllWithMetrics();
        setData(mediaData);
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    
    fetchData();
  }, []);

  return <div>{/* Din JSX */}</div>;
};
```

### 4. Uppdatera package.json scripts (valfritt)

Du kan lägga till ett script för att testa databasanslutningen:

```json
{
  "scripts": {
    "test-db": "tsx src/test-db-connection.ts"
  }
}
```

### 5. Kontrollera att allt fungerar

1. **Starta din utvecklingsserver:**
   ```bash
   npm run dev
   ```

2. **Kontrollera att inga fel visas i konsolen**

3. **Testa funktionaliteten i din app:**
   - Logga in/ut
   - Visa media outlets
   - Skapa/hantera orders
   - Använd dashboard

### 6. Ta bort gamla filer (efter att allt fungerar)

När du är säker på att allt fungerar, kan du ta bort:
- `src/integrations/supabase/` mappen
- Gamla hooks som inte längre används
- Supabase-beroenden från package.json

## Vanliga problem och lösningar

### Problem: "Cannot find module 'dotenv'"
**Lösning:** Kör `npm install dotenv`

### Problem: "Connection refused"
**Lösning:** 
1. Kontrollera att PostgreSQL körs
2. Kontrollera att anslutningsuppgifterna i .env är korrekta
3. Kontrollera att port 5432 är tillgänglig

### Problem: "Database does not exist"
**Lösning:**
1. Skapa databasen: `CREATE DATABASE moodymedia;`
2. Eller ändra DB_NAME i .env till en befintlig databas

### Problem: "Permission denied"
**Lösning:**
1. Kontrollera att användaren har rätt behörigheter
2. Kör: `GRANT ALL PRIVILEGES ON DATABASE moodymedia TO your_user;`

## Ytterligare hjälp

Om du stöter på problem:
1. Kör testfilen: `npx tsx src/test-db-connection.ts`
2. Kontrollera konsol-loggarna för felmeddelanden
3. Kontrollera att alla imports är korrekta
4. Kontrollera att .env-filen är korrekt formaterad

## Nästa steg

När migrationen är klar kan du:
1. Optimera databasfrågorna för bättre prestanda
2. Lägga till caching-lager (Redis, etc.)
3. Implementera databas-migreringar
4. Lägga till backup-strategier

