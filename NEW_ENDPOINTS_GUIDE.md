


### Nuovi Endpoint Completi 
1. `/api/v2/logistics/profile` - GET, PUT - Gestione profilo logistics
2. `/api/v2/admin/deliveries/:id` - GET, PUT, DELETE - Gestione delivery admin

### Nuovi Metodi su Endpoint Esistenti
1. `/api/v2/logistics/businesses/:id` - PUT - Modifica business

### Totale Nuovi Metodi
- GET `/api/v2/logistics/profile`
- PUT `/api/v2/logistics/profile`
- GET `/api/v2/admin/deliveries/:id`
- PUT `/api/v2/admin/deliveries/:id`
- DELETE `/api/v2/admin/deliveries/:id`



## Logistics Profile Management

### GET Profilo Logistics

Visualizza il profilo del logistics autenticato con la lista completa dei business gestiti.

**Endpoint:**
```
GET /api/v2/logistics/profile
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Request:**
```bash
GET https://consegnoio-data-api.vercel.app/api/v2/logistics/profile
```

**Response 200 - Success:**
```json
{
  "logistics": {
    "id": "68e3d123abc456def789",
    "name": "Mario",
    "surname": "Rossi",
    "email": "mario.logistics@consegnoio.it",
    "confirmed": true,
    "expired": false,
    "businesses": [
      {
        "id": "68e3d6cefcc217363e574446",
        "name": "Pizzeria Roma",
        "address": "Via Roma 123, Milano",
        "assignedAt": "2025-10-01T10:00:00.000Z"
      },
      {
        "id": "68e3d705fcc217363e574448",
        "name": "Ristorante Milano",
        "address": "Via Milano 456, Milano",
        "assignedAt": "2025-10-05T14:30:00.000Z"
      }
    ],
    "totalBusinesses": 2,
    "createdAt": "2025-09-15T08:00:00.000Z"
  }
}
```

**Response 401:**
```json
{
  "message": "Non autorizzato. Accesso riservato a Logistics."
}
```

**Response 404:**
```json
{
  "message": "Profilo logistics non trovato"
}
```

**Esempio Frontend:**
```javascript
async function getLogisticsProfile() {
  const response = await fetch('/api/v2/logistics/profile', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
    }
  });
  
  const data = await response.json();
  return data.logistics;
}
```

---

### PUT Modifica Profilo Logistics

Modifica nome e cognome del logistics autenticato.

**Endpoint:**
```
PUT /api/v2/logistics/profile
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Body:**
```json
{
  "name": "Mario",
  "surname": "Verdi"
}
```

**Campi Body:**
- `name` (optional) - Nuovo nome (min 2 caratteri)
- `surname` (optional) - Nuovo cognome (min 2 caratteri)

**Response 200 - Success:**
```json
{
  "message": "Profilo aggiornato con successo",
  "logistics": {
    "id": "68e3d123abc456def789",
    "name": "Mario",
    "surname": "Verdi",
    "email": "mario.logistics@consegnoio.it",
    "confirmed": true
  }
}
```

**Response 400:**
```json
{
  "message": "Dati non validi",
  "errors": [
    {
      "code": "too_small",
      "minimum": 2,
      "path": ["name"],
      "message": "String must contain at least 2 character(s)"
    }
  ]
}
```

**Esempio Frontend:**
```javascript
async function updateLogisticsProfile(name, surname) {
  const response = await fetch('/api/v2/logistics/profile', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, surname })
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('Profilo aggiornato:', data.logistics);
  } else {
    console.error('Errore:', data.message);
  }
  
  return data;
}
```

---

## Logistics Business Edit

### PUT Modifica Business

Modifica i dati di un business gestito dal logistics.

**Endpoint:**
```
PUT /api/v2/logistics/businesses/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Parametri URL:**
- `id` - ID del business da modificare

**Body:**
```json
{
  "bussinesName": "Nuovo Nome Business",
  "address": "Nuovo Indirizzo",
  "businessCord": "45.4642,9.1900"
}
```

**Campi Body:**
- `bussinesName` (optional) - Nuovo nome business (min 2 caratteri)
- `address` (optional) - Nuovo indirizzo (min 2 caratteri)
- `businessCord` (optional) - Coordinate GPS

**Response 200 - Success:**
```json
{
  "message": "Business aggiornato con successo",
  "business": {
    "id": "68e3d6cefcc217363e574446",
    "bussinesName": "Pizzeria Roma Centrale",
    "address": "Via Roma 125, Milano",
    "businessCord": "45.4642,9.1900",
    "raiderActived": ["raider_id_1", "raider_id_2"],
    "createdAt": "2025-10-01T10:00:00.000Z",
    "updateAt": "2025-10-13T22:00:00.000Z"
  }
}
```

**Response 403:**
```json
{
  "message": "Non hai i permessi per modificare questo business"
}
```

**Response 404:**
```json
{
  "message": "Business non trovato"
}
```

**Esempio Frontend:**
```javascript
async function updateBusiness(businessId, updates) {
  const response = await fetch(`/api/v2/logistics/businesses/${businessId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates)
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('Business aggiornato:', data.business);
  } else if (response.status === 403) {
    alert('Non hai i permessi per modificare questo business');
  }
  
  return data;
}
```

---

## Admin Delivery Management

### GET Dettaglio Delivery

Visualizza i dettagli completi di una delivery con storico assegnazioni.

**Endpoint:**
```
GET /api/v2/admin/deliveries/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` - ID della delivery

**Response 200 - Success:**
```json
{
  "delivery": {
    "id": "68e3xyz123abc456",
    "orderId": "ORD-2025-001",
    "status": "ONDELIVERY",
    "schedulingDelivery": "2025-10-13T18:00:00.000Z",
    "compensation": 5.50,
    "business": {
      "id": "68e3d6cefcc217363e574446",
      "bussinesName": "Pizzeria Roma",
      "address": "Via Roma 123, Milano"
    },
    "assignedToRaider": {
      "id": "68e3bc277167c405b27ecbc5",
      "name": "Carlo",
      "surname": "Rossi",
      "vehicle": "MOTORCYCLE",
      "mobile": "+39 333 1234567"
    },
    "assignedDeliveries": [
      {
        "id": "assign_id_1",
        "raiderId": "68e3bc277167c405b27ecbc5",
        "createdAt": "2025-10-13T15:00:00.000Z",
        "raider": {
          "id": "68e3bc277167c405b27ecbc5",
          "name": "Carlo",
          "surname": "Rossi"
        }
      }
    ],
    "historyDeliveries": [
      {
        "id": "history_id_1",
        "raiderId": "68e3abc456def789",
        "createdAt": "2025-10-13T14:00:00.000Z",
        "raider": {
          "id": "68e3abc456def789",
          "name": "Mario",
          "surname": "Bianchi"
        }
      }
    ],
    "createdAt": "2025-10-13T12:00:00.000Z"
  }
}
```

**Esempio Frontend:**
```javascript
async function getDeliveryDetails(deliveryId) {
  const response = await fetch(`/api/v2/admin/deliveries/${deliveryId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
    }
  });
  
  const data = await response.json();
  return data.delivery;
}
```

---

### PUT Modifica Delivery

Modifica i dati di una delivery. Admin può modificare status, data, compenso e raider assegnato.

**Endpoint:**
```
PUT /api/v2/admin/deliveries/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Parametri URL:**
- `id` - ID della delivery da modificare

**Body:**
```json
{
  "status": "COMPLETED",
  "schedulingDelivery": "2025-10-14T18:00:00.000Z",
  "compensation": 6.00,
  "assignedToRaiderId": "68e3bc277167c405b27ecbc5"
}
```

**Campi Body (tutti optional):**
- `status` - Nuovo stato (CREATED, RELEASED, ASSIGNED, ONDELIVERY, COMPLETED, NOTDELIVERED, DELETED)
- `schedulingDelivery` - Nuova data/ora consegna (ISO 8601 string)
- `compensation` - Nuovo compenso (number)
- `assignedToRaiderId` - ID nuovo raider (string o null per rimuovere)

**Response 200 - Success:**
```json
{
  "message": "Delivery aggiornata con successo",
  "delivery": {
    "id": "68e3xyz123abc456",
    "orderId": "ORD-2025-001",
    "status": "COMPLETED",
    "schedulingDelivery": "2025-10-13T18:00:00.000Z",
    "compensation": 6.00,
    "business": {
      "id": "68e3d6cefcc217363e574446",
      "bussinesName": "Pizzeria Roma"
    },
    "assignedToRaider": {
      "id": "68e3bc277167c405b27ecbc5",
      "name": "Carlo",
      "surname": "Rossi"
    }
  }
}
```

**Esempio Frontend:**
```javascript
async function updateDelivery(deliveryId, updates) {
  const response = await fetch(`/api/v2/admin/deliveries/${deliveryId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates)
  });
  
  const data = await response.json();
  return data;
}

// Esempio: Cambia stato a COMPLETED
await updateDelivery('delivery_id', { status: 'COMPLETED' });

// Esempio: Riassegna a altro raider
await updateDelivery('delivery_id', { 
  assignedToRaiderId: 'new_raider_id' 
});

// Esempio: Rimuovi raider assegnato
await updateDelivery('delivery_id', { 
  assignedToRaiderId: null 
});
```

---

### DELETE Elimina Delivery

Elimina permanentemente una delivery e tutte le sue relazioni (hard delete).

**Endpoint:**
```
DELETE /api/v2/admin/deliveries/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` - ID della delivery da eliminare

**Response 200 - Success:**
```json
{
  "message": "Delivery eliminata con successo"
}
```

**Response 404:**
```json
{
  "message": "Delivery non trovata"
}
```

**Nota Importante:**
Questa operazione elimina permanentemente:
- La delivery
- Tutte le AssignedDelivery
- Tutte le HistoryDelivery
- Tutte le CancelledDeliveries
- Tutte le ReleasedDelivery

**Esempio Frontend:**
```javascript
async function deleteDelivery(deliveryId) {
  const confirmed = confirm('Sei sicuro di voler eliminare questa delivery? Questa azione è irreversibile.');
  
  if (!confirmed) return;
  
  const response = await fetch(`/api/v2/admin/deliveries/${deliveryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'x-api-key': API_KEY,
    }
  });
  
  const data = await response.json();
  
  if (response.ok) {
    console.log('Delivery eliminata');
  } else {
    console.error('Errore:', data.message);
  }
  
  return data;
}
```

---

## Note Implementazione

### Gestione Errori Consigliata
```javascript
async function apiCall(url, options) {
  try {
    const response = await fetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      switch (response.status) {
        case 400:
          console.error('Dati non validi:', data.errors);
          break;
        case 401:
          console.error('Non autorizzato - redirect a login');
          break;
        case 403:
          console.error('Permessi negati');
          break;
        case 404:
          console.error('Risorsa non trovata');
          break;
        default:
          console.error('Errore:', data.message);
      }
    }
    
    return { ok: response.ok, data };
  } catch (error) {
    console.error('Errore di rete:', error);
    return { ok: false, data: null };
  }
}
```

### Stati Delivery Validi
```
CREATED      - Ordine creato
RELEASED     - Ordine rilasciato dal raider
ASSIGNED     - Ordine assegnato a un raider
ONDELIVERY   - Ordine in consegna
COMPLETED    - Ordine completato
NOTDELIVERED - Ordine non consegnato
DELETED      - Ordine eliminato
```

### Veicoli Validi
```
CAR
BICYCLE
MOTORCYCLE
VAN
REFRIGERATEDVAN
WITHOUTVEHICLE
TRANSIT
```

---

