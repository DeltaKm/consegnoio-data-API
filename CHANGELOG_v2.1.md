# Changelog v2.1 (2025-10-06)

## Nuovi Endpoint Aggiunti

### Auth
- **GET /api/v2/auth/confirm** - Conferma email (endpoint pubblico v2, non richiede API key)

### Business Raiders
- **GET /api/v2/business/raiders/:id** - Ottieni dati singolo raider del business
- **DELETE /api/v2/business/raiders/:id** - Rimuovi raider dal business (elimina solo la relazione BusinessRaider, non l'utente)

### Logistics Raiders  
- **GET /api/v2/logistics/raiders/:id** - Ottieni dati singolo raider gestito dalla logistica
- **DELETE /api/v2/logistics/raiders/:id** - Rimuovi raider dai business gestiti dalla logistica

### Admin Raiders
- **DELETE /api/v2/admin/raiders/:id** - Elimina completamente raider (utente + tutte le relazioni + storico)

---

## Correzioni Importanti

### 1. Validazione Email Reale

**Registrazione Business/Logistics:**
- Blocca domini fake/temporanei: test.com, fake.com, example.com, mailinator.com, 10minutemail.com, etc.
- Permette domini aziendali personalizzati (es: info@tuaazienda.com)
- Verifica che il dominio abbia almeno un punto (.)

**Test Invio Email Prima del Salvataggio DB:**
- Se l'invio email fallisce, l'utente NON viene salvato nel database
- Previene registrazioni con email inesistenti o errate
- Mantiene il database pulito

### 2. Blocco Login Email Non Confermata

**Endpoint /api/v2/auth/login:**
- Verifica che user.confirmed sia true prima di permettere il login
- Errore 400 se email non confermata
- Messaggio: "Email non confermata. Verifica la tua casella di posta."

### 3. Filtri Logistics Corretti

**GET /api/v2/logistics/raiders:**
- Prima mostrava TUTTI i raider del sistema (BUG)
- Ora mostra SOLO i raider dei business gestiti dalla logistica
- Se la logistica non gestisce business, ritorna lista vuota

**Implementazione:**
```typescript
// Ottiene business gestiti dalla logistica
const businessesManaged = await prisma.logisticsBusiness.findMany({
  where: { logisticsId: auth.logistics.id },
  select: { businessId: true }
});

// Filtra raider solo per quei business
const where = {
  businessRelations: {
    some: {
      businessId: { in: businessIds }
    }
  }
};
```

### 4. Relazioni Database Corrette

**POST /api/v2/logistics/businesses:**
- Prima: Creava business ma NON la relazione LogisticsBusiness (BUG)
- Ora: Crea business + relazione LogisticsBusiness automaticamente
- La logistica vede immediatamente il business creato nella lista

**POST /api/v2/logistics/raiders:**
- Aggiunto parametro opzionale `businessId`
- Se specificato, crea automaticamente la relazione BusinessRaider
- Permette di creare raider già assegnati a un business

**Esempio:**
```json
{
  "email": "raider@gmail.com",
  "password": "password123",
  "name": "Mario",
  "surname": "Rossi",
  "vehicle": "MOTORCYCLE",
  "businessId": "business_id_here"
}
```

### 5. Link Conferma Email v2

**Registrazione Business/Logistics:**
- Prima: Link puntava a /api/v1/auth/confirm
- Ora: Link punta a /api/v2/auth/confirm
- Endpoint v2 aggiunto al middleware come pubblico (senza API key)

---

## Protezioni DELETE

### Business/Logistics DELETE Raiders
- Verifica che non ci siano consegne attive (CREATED, ASSIGNED, PICKEDUP)
- Elimina SOLO la relazione BusinessRaider
- L'utente raider rimane nel sistema

### Admin DELETE Raiders
- Verifica che non ci siano consegne attive
- Elimina in transazione:
  1. Tutte le relazioni BusinessRaider
  2. Tutte le AssignedDelivery
  3. Tutte le HistoryDelivery
  4. Il record Raider
  5. Il record User associato
- Operazione irreversibile

---

## Flusso Corretto Logistics

### Scenario 1: Logistics Crea Business
1. POST /api/v2/logistics/businesses (crea business + relazione)
2. POST /api/v2/logistics/raiders (con businessId, crea raider + assegnazione)
3. Raider immediatamente disponibile per il business

### Scenario 2: Logistics Assegna Raider Esistente
1. POST /api/v2/logistics/raiders (senza businessId, crea raider non assegnato)
2. POST /api/v2/logistics/raiders/assign (assegna a uno o più business)

---

## Endpoint Pubblici Aggiornati

**Senza API Key:**
- GET /api/v1/auth/confirm
- GET /api/v2/auth/confirm (NUOVO)

**Solo API Key (no JWT):**
- POST /api/v2/auth/login
- POST /api/v2/auth/register-business
- POST /api/v2/auth/register-logistics

**API Key + JWT:**
- Tutti gli altri endpoint

---

## Script di Migrazione

### fix-logistics-business-relations.ts
Script per aggiungere relazioni LogisticsBusiness mancanti per business creati prima della correzione.

**Uso:**
```bash
npx tsx scripts/fix-logistics-business-relations.ts
```

---

## Riepilogo Modifiche

### Nuovi Endpoint: 6
- GET /api/v2/auth/confirm
- GET /api/v2/business/raiders/:id
- DELETE /api/v2/business/raiders/:id
- GET /api/v2/logistics/raiders/:id
- DELETE /api/v2/logistics/raiders/:id
- DELETE /api/v2/admin/raiders/:id

### Bug Corretti: 5
1. Validazione email fake/temporanee
2. Login senza conferma email
3. Logistics vedeva tutti i raider
4. Logistics non creava relazione LogisticsBusiness
5. Link conferma email puntava a v1

### Miglioramenti: 3
1. Test invio email prima del salvataggio DB
2. Parametro businessId opzionale in POST logistics/raiders
3. Protezioni DELETE con verifica consegne attive

---

**Totale Endpoint v2.1:** 63 endpoint
**Versione:** 2.1
**Data Rilascio:** 2025-10-06
