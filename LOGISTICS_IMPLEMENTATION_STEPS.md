# 🚚 Implementazione Logistics Multi-Tenant - Prossimi Passi

## ✅ Cosa è Stato Fatto

1. **Schema Prisma aggiornato** con:
   - Modello `Logistics` (profilo logistics)
   - Modello `LogisticsBusiness` (pivot table many-to-many)
   - Relazione `User` → `Logistics`
   - Relazione `Business` → `LogisticsBusiness`

2. **Helper auth aggiornati**:
   - `getLogisticsFromUser()` - Ottiene profilo logistics
   - `requireLogistics()` - Verifica ruolo e ritorna profilo con business assegnati

3. **Endpoint Logistics modificati**:
   - `/v2/logistics/businesses` - Filtra solo business assegnati
   - `/v2/logistics/deliveries` - Filtra solo ordini dei business assegnati
   - `/v2/logistics/stats/global` - Statistiche solo dei business assegnati

4. **Nuovo endpoint**:
   - `/v2/auth/register-logistics` - Registrazione logistics

---

## ⚠️ IMPORTANTE: Prossimi Passi Obbligatori

### **1. Migrazione Prisma** ⚡ PRIORITÀ ALTA

Devi eseguire la migrazione per creare i nuovi modelli nel database:

```bash
# Genera il client Prisma con i nuovi modelli
npx prisma generate

# OPZIONE A: Se sei in sviluppo (MongoDB Atlas)
# Prisma creerà automaticamente le collezioni al primo uso

# OPZIONE B: Se vuoi forzare la creazione
npx prisma db push
```

**⚠️ ATTENZIONE:** 
- Gli endpoint Logistics **NON funzioneranno** finché non esegui `prisma generate`
- Gli errori TypeScript `Property 'logistics' does not exist` si risolveranno dopo la generazione

---

### **2. Creare Profilo Logistics per Utenti Esistenti**

Se hai già utenti con ruolo `LOGISTICS` nel database, devi creare i loro profili:

```typescript
// Script da eseguire una volta (puoi creare un file scripts/create-logistics-profiles.ts)
import prisma from './app/lib/prisma';

async function createLogisticsProfiles() {
  const logisticsUsers = await prisma.user.findMany({
    where: { role: 'LOGISTICS' }
  });

  for (const user of logisticsUsers) {
    const existingProfile = await prisma.logistics.findFirst({
      where: { userId: user.id }
    });

    if (!existingProfile) {
      await prisma.logistics.create({
        data: {
          name: 'Nome',  // Chiedi all'utente di compilare
          surname: 'Cognome',
          userId: user.id,
        }
      });
      console.log(`Profilo Logistics creato per ${user.email}`);
    }
  }
}

createLogisticsProfiles();
```

---

### **3. Assegnare Business ai Logistics**

Devi creare un endpoint Admin per assegnare business ai logistics:

**Endpoint da creare:** `POST /api/v2/admin/logistics/assign-businesses`

```typescript
// app/api/v2/admin/logistics/assign-businesses/route.ts
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/app/lib/prisma";
import { requireAdmin } from "@/app/lib/auth";

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth) {
    return NextResponse.json(
      { message: "Non autorizzato" },
      { status: 401 }
    );
  }

  try {
    const { logisticsId, businessIds } = await request.json();

    // Verifica che logistics esista
    const logistics = await prisma.logistics.findUnique({
      where: { id: logisticsId }
    });

    if (!logistics) {
      return NextResponse.json(
        { message: "Logistics non trovato" },
        { status: 404 }
      );
    }

    // Crea le relazioni
    for (const businessId of businessIds) {
      await prisma.logisticsBusiness.upsert({
        where: {
          logisticsId_businessId: {
            logisticsId,
            businessId
          }
        },
        update: {},
        create: {
          logisticsId,
          businessId
        }
      });
    }

    return NextResponse.json({
      message: `${businessIds.length} business assegnati al logistics`,
      logisticsId,
      businessIds
    });
  } catch (error: any) {
    return NextResponse.json(
      { message: "Errore interno", error: error.message },
      { status: 500 }
    );
  }
}
```

---

### **4. Endpoint Admin Aggiuntivi**

Crea questi endpoint per gestire logistics:

#### `GET /api/v2/admin/logistics`
Lista tutti i logistics con i business assegnati

#### `GET /api/v2/admin/logistics/:id`
Dettaglio logistics specifico

#### `DELETE /api/v2/admin/logistics/:id/remove-business`
Rimuovi business da logistics

---

## 🎯 Come Funziona il Sistema Multi-Tenant

### **Flusso Completo:**

1. **Admin crea utente Logistics:**
   ```
   POST /api/v2/auth/register-logistics
   {
     "email": "logistics@example.com",
     "password": "password123",
     "name": "Mario",
     "surname": "Rossi"
   }
   ```

2. **Admin assegna business al Logistics:**
   ```
   POST /api/v2/admin/logistics/assign-businesses
   {
     "logisticsId": "logistics_id",
     "businessIds": ["business_1", "business_2", "business_3"]
   }
   ```

3. **Logistics fa login:**
   ```
   POST /api/v2/auth/login
   {
     "email": "logistics@example.com",
     "password": "password123"
   }
   
   Response:
   {
     "token": "...",
     "user": {
       "role": "LOGISTICS"
     },
     "profile": {
       "type": "logistics",
       "id": "logistics_id",
       "name": "Mario Rossi"
     }
   }
   ```

4. **Logistics vede solo i suoi business:**
   ```
   GET /api/v2/logistics/businesses
   Authorization: Bearer TOKEN
   
   Response: Solo business_1, business_2, business_3
   ```

5. **Logistics vede solo ordini dei suoi business:**
   ```
   GET /api/v2/logistics/deliveries
   Authorization: Bearer TOKEN
   
   Response: Solo ordini di business_1, business_2, business_3
   ```

---

## 📊 Schema Database

```
User (role: LOGISTICS)
  └─> Logistics (profilo)
       └─> LogisticsBusiness (pivot)
            └─> Business
                 └─> DeliveryEA (ordini)
```

**Esempio:**
- Logistics "Mario Rossi" gestisce:
  - Business "Pizzeria Roma"
  - Business "Ristorante Milano"
  - Business "Trattoria Napoli"

- Logistics "Luigi Verdi" gestisce:
  - Business "Bar Torino"
  - Business "Caffè Firenze"

Ogni logistics vede **solo i suoi business** e **solo gli ordini dei suoi business**.

---

## 🔧 Modifiche al Frontend

### **Dashboard Logistics:**

```typescript
// Dopo il login, il frontend riceve:
{
  "user": {
    "role": "LOGISTICS"
  },
  "profile": {
    "type": "logistics",
    "id": "logistics_id",
    "assignedBusinesses": 3  // Numero business assegnati
  }
}

// Quando chiama /api/v2/logistics/businesses
// Riceve SOLO i business assegnati a lui

// Quando chiama /api/v2/logistics/deliveries
// Riceve SOLO gli ordini dei suoi business
```

### **Dashboard Admin:**

Aggiungi sezione per:
- Lista logistics
- Assegna/rimuovi business da logistics
- Visualizza business assegnati per ogni logistics

---

## ✅ Checklist Implementazione

- [x] Schema Prisma aggiornato
- [x] Helper auth aggiornati
- [x] Endpoint Logistics filtrati
- [x] Endpoint register logistics
- [ ] **Eseguire `npx prisma generate`** ⚡
- [ ] Creare profili Logistics per utenti esistenti
- [ ] Creare endpoint Admin per assegnazione business
- [ ] Testare flusso completo
- [ ] Aggiornare documentazione API
- [ ] Implementare frontend Admin per gestione logistics

---

## 🚀 Comando Rapido per Iniziare

```bash
# 1. Genera client Prisma
npx prisma generate

# 2. Verifica che funzioni
npm run dev

# 3. Testa registrazione logistics
curl -X POST http://localhost:3000/api/v2/auth/register-logistics \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "logistics@test.com",
    "password": "password123",
    "name": "Mario",
    "surname": "Rossi"
  }'
```

---

## 📝 Note Importanti

1. **Ogni Logistics è isolato** - Non può vedere i business di altri logistics
2. **Admin ha accesso globale** - Può gestire tutti i logistics e business
3. **Business non sa a quale logistics è assegnato** - È trasparente per loro
4. **Scalabile** - Puoi avere N logistics che gestiscono M business ciascuno

---

## ❓ FAQ

**Q: Un business può essere assegnato a più logistics?**  
A: Sì, il modello `LogisticsBusiness` è many-to-many. Un business può avere più logistics.

**Q: Cosa succede se un logistics non ha business assegnati?**  
A: Vedrà liste vuote. Non è un errore, semplicemente non ha ancora business da gestire.

**Q: Come faccio a rimuovere un business da un logistics?**  
A: Devi creare l'endpoint Admin per eliminare il record da `LogisticsBusiness`.

**Q: Gli errori TypeScript si risolveranno?**  
A: Sì, automaticamente dopo `npx prisma generate`. Prisma genererà i tipi TypeScript corretti.

---

**Prossimo passo:** Esegui `npx prisma generate` e testa! 🚀
