# 👨‍💼 Admin Dashboard - Endpoint Completi

## 🎯 Cosa Può Fare l'Admin

L'Admin ha **accesso completo** a tutto il sistema:
- ✅ Gestire tutti gli utenti
- ✅ Creare e gestire Business
- ✅ Creare e gestire Logistics
- ✅ Gestire tutti i Raider
- ✅ Assegnare Business ai Logistics
- ✅ Vedere tutti gli ordini
- ✅ Statistiche globali complete

---

## 📋 Endpoint Admin Completi (16 endpoint)

### **1. Utenti (3 endpoint)**

#### `GET /api/v2/admin/users`
Lista tutti gli utenti

**Filtri:**
- `role` - ADMIN, BUSINESS, RAIDER, LOGISTICS, USER
- `limit`, `offset` - Paginazione

**Cosa vedi:**
- Email, ruolo, status (confirmed, expired)
- Profili associati (raider/business/logistics)

---

#### `PUT /api/v2/admin/users/:id/role`
Cambia ruolo utente

**Body:**
```json
{
  "role": "LOGISTICS"
}
```

**Ruoli disponibili:**
- `ADMIN`
- `USER`
- `LOGISTICS`
- `BUSINESS`
- `RAIDER`

---

#### `PUT /api/v2/admin/users/:id/status`
Attiva/Disattiva utente

**Body:**
```json
{
  "expired": true  // true = disattiva, false = attiva
}
```

---

### **2. Business (5 endpoint)**

#### `GET /api/v2/admin/businesses`
Lista tutti i business

**Filtri:**
- `search` - Cerca per nome o indirizzo
- `limit`, `offset` - Paginazione

**Cosa vedi:**
- Dati business completi
- Raider attivi
- **Logistics assegnati**
- Statistiche ordini

---

#### `POST /api/v2/admin/businesses`
Crea nuovo business

**Body:**
```json
{
  "email": "newbusiness@example.com",
  "password": "password123",
  "bussinesName": "Nuova Pizzeria",
  "address": "Via Nuova 789",
  "businessCord": "41.9028,12.4964"
}
```

**Cosa fa:**
- Crea User con role BUSINESS
- Crea profilo Business
- Invia email conferma

---

#### `GET /api/v2/admin/businesses/:id`
Dettaglio business completo

**Cosa vedi:**
- Dati business
- User associato
- Tutti i raider (confirmed e pending)
- Ultimi 20 ordini
- **Logistics assegnati**

---

#### `PUT /api/v2/admin/businesses/:id`
Modifica business

**Body:**
```json
{
  "bussinesName": "Nuovo Nome",
  "address": "Nuovo Indirizzo",
  "businessCord": "41.9028,12.4964"
}
```

---

#### `DELETE /api/v2/admin/businesses/:id`
Disabilita business

**Cosa fa:**
- Imposta `user.expired = true`
- Business non può più fare login

---

### **3. Logistics (6 endpoint)**

#### `GET /api/v2/admin/logistics`
Lista tutti i logistics

**Cosa vedi:**
- Nome, cognome, email
- **Business assegnati** a ogni logistics
- Numero totale business
- Status (confirmed, expired)

---

#### `POST /api/v2/auth/register-logistics`
Crea nuovo logistics

**Body:**
```json
{
  "email": "logistics@example.com",
  "password": "password123",
  "name": "Mario",
  "surname": "Rossi"
}
```

---

#### `GET /api/v2/admin/logistics/:id`
Dettaglio logistics

**Cosa vedi:**
- Dati logistics
- User associato
- **Tutti i business assegnati** con statistiche ordini

---

#### `PUT /api/v2/admin/logistics/:id`
Modifica logistics

**Body:**
```json
{
  "name": "Nuovo Nome",
  "surname": "Nuovo Cognome"
}
```

---

#### `POST /api/v2/admin/logistics/assign-businesses`
Assegna business a logistics

**Body:**
```json
{
  "logisticsId": "logistics_id",
  "businessIds": ["business_1", "business_2", "business_3"]
}
```

**Cosa fa:**
- Crea record in `LogisticsBusiness` (pivot)
- Logistics potrà vedere e gestire questi business

---

#### `DELETE /api/v2/admin/logistics/remove-businesses`
Rimuovi business da logistics

**Body:**
```json
{
  "logisticsId": "logistics_id",
  "businessIds": ["business_1"]
}
```

---

#### `DELETE /api/v2/admin/logistics/:id`
Disabilita logistics

**Cosa fa:**
- Imposta `user.expired = true`
- Logistics non può più fare login

---

### **4. Raider (3 endpoint)**

#### `GET /api/v2/admin/raiders`
Lista tutti i raider

**Filtri:**
- `search` - Nome o cognome
- `isActive` - true/false
- `limit`, `offset` - Paginazione

**Cosa vedi:**
- Dati raider completi
- Business a cui è abilitato
- Consegne attualmente assegnate
- Status (active, inService, confirmed, expired)

---

#### `GET /api/v2/admin/raiders/:id`
Dettaglio raider completo

**Cosa vedi:**
- Dati raider
- User associato
- Business relations
- **Consegne attualmente assegnate**
- Storico consegne

---

#### `PUT /api/v2/admin/raiders/:id/status`
Attiva/Disattiva raider

**Body:**
```json
{
  "isActive": false
}
```

---

### **5. Ordini (1 endpoint)**

#### `GET /api/v2/admin/deliveries`
Vista globale ordini (tutti i business)

**Filtri:**
- `status` - CREATED, ASSIGNED, etc.
- `businessId` - Filtra per business
- `raiderId` - Filtra per raider
- `dateFrom`, `dateTo` - Periodo
- `limit`, `offset` - Paginazione

**Cosa vedi:**
- Tutti gli ordini del sistema
- Business associato
- Raider assegnato
- Status completo

---

### **6. Statistiche (1 endpoint)**

#### `GET /api/v2/admin/stats`
Statistiche globali sistema

**Filtri:**
- `dateFrom`, `dateTo` - Periodo

**Cosa vedi:**
- **Overview:** Totale users, business, logistics, raider
- **Ordini:** Totale e per status
- **Finanziari:** Ricavi, compensi, profitto
- **Top 10 Business:** Per numero ordini
- **Top 10 Raider:** Per consegne completate

---

## 🎨 Dashboard Admin - Sezioni

### **1. Home / Overview**
- Statistiche globali
- Grafici trend
- Alert e notifiche

**Endpoint:** `GET /v2/admin/stats`

---

### **2. Utenti**
- Lista tutti gli utenti
- Filtra per ruolo
- Cambia ruolo
- Attiva/disattiva

**Endpoint:**
- `GET /v2/admin/users`
- `PUT /v2/admin/users/:id/role`
- `PUT /v2/admin/users/:id/status`

---

### **3. Business**
- Lista tutti i business
- Crea nuovo business
- Modifica business
- Vedi dettaglio (raider, ordini, logistics assegnati)
- Disabilita business

**Endpoint:**
- `GET /v2/admin/businesses`
- `POST /v2/admin/businesses`
- `GET /v2/admin/businesses/:id`
- `PUT /v2/admin/businesses/:id`
- `DELETE /v2/admin/businesses/:id`

---

### **4. Logistics**
- Lista tutti i logistics
- Crea nuovo logistics
- **Assegna business ai logistics**
- Rimuovi business da logistics
- Vedi dettaglio logistics
- Disabilita logistics

**Endpoint:**
- `GET /v2/admin/logistics`
- `POST /v2/auth/register-logistics`
- `GET /v2/admin/logistics/:id`
- `PUT /v2/admin/logistics/:id`
- `POST /v2/admin/logistics/assign-businesses`
- `DELETE /v2/admin/logistics/remove-businesses`
- `DELETE /v2/admin/logistics/:id`

---

### **5. Raider**
- Lista tutti i raider
- Vedi dettaglio raider
- Attiva/disattiva raider
- Vedi business e consegne

**Endpoint:**
- `GET /v2/admin/raiders`
- `GET /v2/admin/raiders/:id`
- `PUT /v2/admin/raiders/:id/status`

---

### **6. Ordini**
- Vista globale ordini
- Filtra per business/raider/status
- Vedi dettagli completi

**Endpoint:**
- `GET /v2/admin/deliveries`

---

## 🔐 Permessi Admin

**Admin può:**
- ✅ Vedere **TUTTO** (tutti business, raider, ordini, logistics)
- ✅ Creare Business, Logistics
- ✅ Modificare qualsiasi risorsa
- ✅ Disabilitare utenti
- ✅ Cambiare ruoli
- ✅ Assegnare business ai logistics
- ✅ Attivare/disattivare raider

**Admin NON può:**
- ❌ Vedere password utenti (sono hashate)
- ❌ Modificare ordini in corso (solo visualizzare)

---

## 🚀 Flusso Operativo Admin

### **Setup Nuovo Logistics:**

1. **Crea utente Logistics:**
   ```bash
   POST /v2/auth/register-logistics
   {
     "email": "logistics@example.com",
     "password": "password123",
     "name": "Mario",
     "surname": "Rossi"
   }
   ```

2. **Assegna business al Logistics:**
   ```bash
   POST /v2/admin/logistics/assign-businesses
   {
     "logisticsId": "LOGISTICS_ID",
     "businessIds": ["BIZ_1", "BIZ_2", "BIZ_3"]
   }
   ```

3. **Logistics può ora fare login e gestire i suoi business**

---

### **Setup Nuovo Business:**

1. **Crea business:**
   ```bash
   POST /v2/admin/businesses
   {
     "email": "newbiz@example.com",
     "password": "password123",
     "bussinesName": "Nuova Pizzeria",
     "address": "Via Roma 123"
   }
   ```

2. **Assegna a Logistics (opzionale):**
   ```bash
   POST /v2/admin/logistics/assign-businesses
   {
     "logisticsId": "LOGISTICS_ID",
     "businessIds": ["NEW_BUSINESS_ID"]
   }
   ```

---

### **Gestione Raider:**

1. **Vedi tutti i raider:**
   ```bash
   GET /v2/admin/raiders
   ```

2. **Vedi dettaglio raider:**
   ```bash
   GET /v2/admin/raiders/:id
   ```

3. **Disattiva raider problematico:**
   ```bash
   PUT /v2/admin/raiders/:id/status
   {
     "isActive": false
   }
   ```

---

### **Monitoring Sistema:**

1. **Statistiche globali:**
   ```bash
   GET /v2/admin/stats
   ```

2. **Ordini globali:**
   ```bash
   GET /v2/admin/deliveries?status=ASSIGNED
   ```

3. **Business specifico:**
   ```bash
   GET /v2/admin/businesses/:id
   ```

---

## 📊 Esempio UI Admin

### **Dashboard Home:**
```
┌─────────────────────────────────────────┐
│  STATISTICHE GLOBALI                    │
├─────────────────────────────────────────┤
│  👥 Utenti: 250                         │
│  🏢 Business: 50                        │
│  🚚 Logistics: 10                       │
│  🏍️ Raider: 120 (85 attivi)            │
│  📦 Ordini: 5000 (4500 completati)     │
│  💰 Ricavi: €145,000                    │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  TOP 10 BUSINESS                        │
├─────────────────────────────────────────┤
│  1. Pizzeria Roma - 500 ordini          │
│  2. Ristorante Milano - 450 ordini      │
│  3. Trattoria Napoli - 380 ordini       │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  TOP 10 RAIDER                          │
├─────────────────────────────────────────┤
│  1. Giovanni Verdi - 450 consegne       │
│  2. Luca Bianchi - 420 consegne         │
│  3. Marco Neri - 380 consegne           │
└─────────────────────────────────────────┘
```

---

### **Gestione Logistics:**
```
┌─────────────────────────────────────────┐
│  LOGISTICS                              │
├─────────────────────────────────────────┤
│  Mario Rossi                            │
│  📧 logistics@example.com               │
│  🏢 Business assegnati: 3               │
│     - Pizzeria Roma                     │
│     - Ristorante Milano                 │
│     - Trattoria Napoli                  │
│  [Aggiungi Business] [Rimuovi] [Edit]  │
└─────────────────────────────────────────┘
```

---

### **Gestione Business:**
```
┌─────────────────────────────────────────┐
│  BUSINESS: Pizzeria Roma                │
├─────────────────────────────────────────┤
│  📧 Email: business@example.com         │
│  📍 Via Roma 123, Milano                │
│  ✅ Confermato | 🟢 Attivo              │
│                                         │
│  🚚 Logistics assegnati:                │
│     - Mario Rossi                       │
│     - Luigi Verdi                       │
│                                         │
│  🏍️ Raider attivi: 5                    │
│  📦 Ordini totali: 150                  │
│  ✅ Completati: 110                     │
│                                         │
│  [Modifica] [Disabilita] [Vedi Ordini] │
└─────────────────────────────────────────┘
```

---

## 🔄 Flussi Operativi Admin

### **Scenario 1: Nuovo Cliente (Business)**

```
1. Admin crea business
   ↓
2. Admin assegna business a logistics
   ↓
3. Business riceve email e conferma
   ↓
4. Business fa login e usa dashboard
   ↓
5. Logistics può gestire il business
```

---

### **Scenario 2: Espansione Logistics**

```
1. Logistics "Mario" gestisce 3 business
   ↓
2. Admin crea nuovo business "Pizzeria Nuova"
   ↓
3. Admin assegna "Pizzeria Nuova" a "Mario"
   ↓
4. Mario vede ora 4 business nella sua dashboard
```

---

### **Scenario 3: Problema Raider**

```
1. Admin riceve segnalazione su raider
   ↓
2. Admin vede dettaglio raider:
   GET /v2/admin/raiders/:id
   ↓
3. Admin vede consegne e performance
   ↓
4. Admin disattiva raider:
   PUT /v2/admin/raiders/:id/status
   { "isActive": false }
   ↓
5. Raider non può più prendere consegne
```

---

## 📊 Statistiche Admin

### **Metriche Disponibili:**

**Overview Sistema:**
- Totale utenti, business, logistics, raider
- Raider attivi vs totali

**Ordini:**
- Totale ordini
- Ordini per status (created, assigned, completed, etc.)
- Trend nel tempo

**Finanziari:**
- Ricavi totali
- Compensi raider
- Profitto netto

**Performance:**
- Top 10 business per ordini
- Top 10 raider per consegne
- Tasso completamento

---

## 🎯 Permessi e Sicurezza

### **Gerarchia Permessi:**

```
ADMIN (massimo controllo)
  ├─> Vede tutto
  ├─> Modifica tutto
  └─> Gestisce assegnazioni

LOGISTICS (controllo limitato)
  ├─> Vede solo business assegnati
  ├─> Gestisce ordini dei suoi business
  └─> NON può creare business

BUSINESS (controllo minimo)
  ├─> Vede solo i propri dati
  ├─> Gestisce i propri ordini
  └─> Gestisce i propri raider

RAIDER (app mobile)
  ├─> Vede ordini disponibili
  └─> Gestisce le proprie consegne
```

---

## 📝 Checklist Admin Setup

### **Setup Iniziale Sistema:**

- [ ] Creare primo utente Admin (manualmente nel DB)
- [ ] Admin crea Logistics
- [ ] Admin crea Business
- [ ] Admin assegna Business a Logistics
- [ ] Verificare che Logistics veda solo business assegnati
- [ ] Verificare isolamento tra Logistics

### **Operatività:**

- [ ] Monitorare statistiche giornaliere
- [ ] Gestire richieste nuovi business
- [ ] Assegnare business ai logistics
- [ ] Gestire problemi raider
- [ ] Verificare performance sistema

---

## 🚀 Quick Start Admin

### **1. Login Admin:**
```bash
curl -X POST http://localhost:3000/api/v2/auth/login \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@consegnoio.com",
    "password": "admin_password"
  }'
```

### **2. Crea Logistics:**
```bash
curl -X POST http://localhost:3000/api/v2/auth/register-logistics \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "logistics@example.com",
    "password": "password123",
    "name": "Mario",
    "surname": "Rossi"
  }'
```

### **3. Assegna Business:**
```bash
curl -X POST http://localhost:3000/api/v2/admin/logistics/assign-businesses \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "logisticsId": "LOGISTICS_ID",
    "businessIds": ["BIZ_1", "BIZ_2"]
  }'
```

### **4. Statistiche:**
```bash
curl -X GET http://localhost:3000/api/v2/admin/stats \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

---

## ✅ Riepilogo Endpoint Admin

**Totale: 16 endpoint**

| Categoria | Endpoint | Descrizione |
|-----------|----------|-------------|
| Users | 3 | Lista, cambia ruolo, attiva/disattiva |
| Business | 5 | CRUD completo + lista |
| Logistics | 6 | CRUD + assegnazione business |
| Raider | 3 | Lista, dettaglio, attiva/disattiva |
| Deliveries | 1 | Vista globale |
| Stats | 1 | Statistiche complete |

---

**Admin ha controllo completo del sistema!** 👨‍💼
