# GET Raiders - Esempi Payload

Esempi completi di response per gli endpoint GET raiders per tutti i ruoli.

---

## Business - GET Raiders

### Endpoint
```
GET /api/v2/business/raiders
```

### Request
```bash
GET https://consegnoio-data-api.vercel.app/api/v2/business/raiders?status=confirmed&name=carlo

Headers:
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

### Response 200 - Success
```json
{
  "raiders": [
    {
      "id": "68e3bc277167c405b27ecbc5",
      "relationId": "68e3bc277167c405b27ecbc6",
      "name": "Carlo",
      "surname": "Carangelo",
      "vehicle": "VAN",
      "mobile": "+39 333 1234567",
      "isActive": true,
      "inService": false,
      "confirmedFromBusiness": true,
      "email": "carlo.rider2@cmh.it",
      "imgUrl": "asset/immages/icon-white.png",
      "createdAt": "2025-10-06T12:55:03.788Z"
    },
    {
      "id": "68e3bad67167c405b27ecbc1",
      "relationId": "68e3bad67167c405b27ecbc2",
      "name": "Carlo",
      "surname": "Rossi",
      "vehicle": "MOTORCYCLE",
      "mobile": "+39 333 9876543",
      "isActive": true,
      "inService": true,
      "confirmedFromBusiness": true,
      "email": "carlo.rider@cmh.it",
      "imgUrl": "asset/immages/icon-white.png",
      "createdAt": "2025-10-06T12:49:26.078Z"
    }
  ]
}
```

### Parametri Query
```bash
?status=confirmed    # Solo raider confermati
?status=pending      # Solo raider in attesa
?status=all          # Tutti i raider
?name=carlo          # Cerca per nome/cognome
?raiderId=xxx        # Filtra per ID specifico
?dateFrom=2025-10-01 # Data inizio
?dateTo=2025-10-31   # Data fine
```

### Campi Response
- **id** - ID del raider (usare per GET/:id, PUT/:id, visualizzazione)
- **relationId** - ID relazione BusinessRaider (usare per DELETE/:id)
- **confirmedFromBusiness** - true = confermato, false = pending
- **isActive** - Stato generale del raider
- **inService** - true = raider in servizio (modalità ON)

---

## Logistics - GET Raiders

### Endpoint
```
GET /api/v2/logistics/raiders
```

### Request
```bash
GET https://consegnoio-data-api.vercel.app/api/v2/logistics/raiders?name=mario&isActive=true&limit=10

Headers:
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

### Response 200 - Success
```json
{
  "raiders": [
    {
      "id": "68e3bc277167c405b27ecbc5",
      "name": "Mario",
      "surname": "Rossi",
      "vehicle": "MOTORCYCLE",
      "mobile": "+39 333 1234567",
      "isActive": true,
      "inService": false,
      "email": "mario.rossi@gmail.com",
      "confirmed": true,
      "businesses": [
        {
          "id": "68e3d6cefcc217363e574446",
          "name": "Pizzeria Roma"
        },
        {
          "id": "68e3d705fcc217363e574448",
          "name": "Ristorante Milano"
        }
      ],
      "totalBusinesses": 2,
      "createdAt": "2025-10-06T12:55:03.788Z"
    },
    {
      "id": "68e3bad67167c405b27ecbc1",
      "name": "Mario",
      "surname": "Bianchi",
      "vehicle": "CAR",
      "mobile": "+39 333 9876543",
      "isActive": true,
      "inService": true,
      "email": "mario.bianchi@gmail.com",
      "confirmed": true,
      "businesses": [
        {
          "id": "68e3d6cefcc217363e574446",
          "name": "Pizzeria Roma"
        }
      ],
      "totalBusinesses": 1,
      "createdAt": "2025-10-05T10:30:15.234Z"
    }
  ],
  "pagination": {
    "total": 2,
    "limit": 10,
    "offset": 0,
    "hasMore": false
  }
}
```

### Parametri Query
```bash
?name=mario          # Cerca per nome/cognome
?isActive=true       # Filtra per stato attivo
?raiderId=xxx        # Filtra per ID specifico
?dateFrom=2025-10-01 # Data inizio
?dateTo=2025-10-31   # Data fine
?limit=50            # Numero risultati (default: 50)
?offset=0            # Offset paginazione (default: 0)
```

### Campi Response
- **id** - ID del raider (usare per GET/:id, PUT/:id, DELETE/:id, visualizzazione)
- **businesses** - Array dei business a cui è assegnato
- **totalBusinesses** - Numero totale business assegnati
- **confirmed** - Email confermata
- **pagination** - Info paginazione

---

## Admin - GET Raiders

### Endpoint
```
GET /api/v2/admin/raiders
```

### Request
```bash
GET https://consegnoio-data-api.vercel.app/api/v2/admin/raiders?name=carlo&isActive=true&limit=20

Headers:
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

### Response 200 - Success
```json
{
  "raiders": [
    {
      "id": "68e3bc277167c405b27ecbc5",
      "name": "Carlo",
      "surname": "Carangelo",
      "vehicle": "VAN",
      "mobile": "+39 333 1234567",
      "isActive": true,
      "inService": false,
      "email": "carlo.rider@cmh.it",
      "confirmed": true,
      "expired": false,
      "businesses": [
        {
          "id": "68e3d6cefcc217363e574446",
          "name": "Pizzeria Roma"
        },
        {
          "id": "68e3d705fcc217363e574448",
          "name": "Ristorante Milano"
        }
      ],
      "totalBusinesses": 2,
      "currentAssignments": 3,
      "createdAt": "2025-10-06T12:55:03.788Z"
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 20,
    "offset": 0,
    "hasMore": false
  }
}
```

### Parametri Query
```bash
?name=carlo          # Cerca per nome/cognome
?isActive=true       # Filtra per stato attivo
?raiderId=xxx        # Filtra per ID specifico
?dateFrom=2025-10-01 # Data inizio
?dateTo=2025-10-31   # Data fine
?limit=50            # Numero risultati (default: 50)
?offset=0            # Offset paginazione (default: 0)
```

### Campi Response
- **id** - ID del raider (usare per tutte le operazioni)
- **expired** - Account disabilitato
- **currentAssignments** - Numero consegne attualmente assegnate
- **businesses** - Tutti i business a cui è assegnato
- **totalBusinesses** - Numero totale business

---

## Confronto Campi per Ruolo

| Campo | Business | Logistics | Admin |
|-------|----------|-----------|-------|
| **id** | ✅ | ✅ | ✅ |
| **relationId** | ✅ | ❌ | ❌ |
| **name** | ✅ | ✅ | ✅ |
| **surname** | ✅ | ✅ | ✅ |
| **vehicle** | ✅ | ✅ | ✅ |
| **mobile** | ✅ | ✅ | ✅ |
| **isActive** | ✅ | ✅ | ✅ |
| **inService** | ✅ | ✅ | ✅ |
| **email** | ✅ | ✅ | ✅ |
| **imgUrl** | ✅ | ❌ | ❌ |
| **confirmed** | ❌ | ✅ | ✅ |
| **expired** | ❌ | ❌ | ✅ |
| **confirmedFromBusiness** | ✅ | ❌ | ❌ |
| **businesses** | ❌ | ✅ | ✅ |
| **totalBusinesses** | ❌ | ✅ | ✅ |
| **currentAssignments** | ❌ | ❌ | ✅ |
| **pagination** | ❌ | ✅ | ✅ |

---

## Uso del Campo `id` vs `relationId`

### Business
```typescript
// Visualizzare raider
<RaiderCard raider={raider} />  // usa raider.id

// GET dettagli raider
GET /api/v2/business/raiders/{raider.id}

// PUT modifica raider
PUT /api/v2/business/raiders/{raider.id}

// DELETE rimuovi raider dal business
DELETE /api/v2/business/raiders/{raider.id}  // usa raider.id (non relationId)
```

### Logistics
```typescript
// Tutto usa sempre id
GET /api/v2/logistics/raiders/{raider.id}
PUT /api/v2/logistics/raiders/{raider.id}
DELETE /api/v2/logistics/raiders/{raider.id}
```

### Admin
```typescript
// Tutto usa sempre id
GET /api/v2/admin/raiders/{raider.id}
PUT /api/v2/admin/raiders/{raider.id}
DELETE /api/v2/admin/raiders/{raider.id}
```

---

## Note Importanti

1. **Campo `id` Uniforme:** Tutti i ruoli usano `id` per identificare il raider
2. **Campo `relationId`:** Solo Business lo riceve (per riferimento interno, ma DELETE usa `id`)
3. **Paginazione:** Solo Logistics e Admin hanno paginazione
4. **Filtro Automatico:** 
   - Business vede solo i suoi raider
   - Logistics vede solo raider dei business gestiti
   - Admin vede tutti i raider
5. **Componenti Frontend:** Possono usare la stessa interfaccia `Raider` per tutti i ruoli

---

**Versione:** 2.1  
**Ultimo aggiornamento:** 2025-10-10
