# DELETE Endpoints - API v2

Documentazione completa di tutti gli endpoint DELETE disponibili nella v2 dell'API.

---

## Indice

- [Business Endpoints](#business-endpoints)
  - [DELETE Delivery](#delete-delivery)
  - [DELETE Raider (singolo)](#delete-raider-singolo)
  - [DELETE Raiders (multipli)](#delete-raiders-multipli)
- [Logistics Endpoints](#logistics-endpoints)
  - [DELETE Raider](#delete-raider-logistics)
- [Admin Endpoints](#admin-endpoints)
  - [DELETE Raider (permanente)](#delete-raider-permanente)
  - [DELETE Business](#delete-business)
  - [DELETE Logistics](#delete-logistics)
  - [DELETE Business da Logistics](#delete-business-da-logistics)

---

## Business Endpoints

### DELETE Delivery

Cancella un ordine (solo se non ancora assegnato o in stato CREATED).

**Endpoint:**
```
DELETE /api/v2/business/deliveries/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` (string, required) - ID della delivery da cancellare

**Condizioni:**
- La delivery deve appartenere al business autenticato
- La delivery deve essere in stato CREATED
- La delivery NON deve essere già assegnata a un raider

**Response 200 - Success:**
```json
{
  "message": "Ordine cancellato con successo"
}
```

**Response 400 - Bad Request:**
```json
{
  "message": "Impossibile cancellare l'ordine. È già stato assegnato o è in corso."
}
```

**Response 404 - Not Found:**
```json
{
  "message": "Ordine non trovato o non appartiene al tuo business"
}
```

---

### DELETE Raider (singolo)

Rimuove un raider dal business. Elimina solo la relazione BusinessRaider, non l'utente.

**Endpoint:**
```
DELETE /api/v2/business/raiders/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` (string, required) - ID del raider da rimuovere

**Condizioni:**
- Il raider deve essere associato al business autenticato
- Il raider NON deve avere consegne attive (CREATED, ASSIGNED, ONDELIVERY)

**Response 200 - Success:**
```json
{
  "message": "Raider rimosso dal business con successo"
}
```

**Response 400 - Bad Request:**
```json
{
  "message": "Impossibile rimuovere il raider. Ha ancora consegne attive.",
  "activeDeliveries": 3
}
```

**Response 404 - Not Found:**
```json
{
  "message": "Raider non trovato o non associato al tuo business"
}
```

**Nota:** L'utente raider rimane nel sistema e può essere riassegnato in futuro.

---

### DELETE Raiders (multipli)

Rimuove uno o più raider dal business in una singola operazione.

**Endpoint:**
```
DELETE /api/v2/business/raiders/remove
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
Content-Type: application/json
```

**Body (singolo raider):**
```json
{
  "raiderId": "raider_id_here"
}
```

**Body (multipli raider):**
```json
{
  "raiderIds": ["raider_id_1", "raider_id_2", "raider_id_3"]
}
```

**Condizioni:**
- I raider devono essere associati al business autenticato
- I raider NON devono avere consegne attive

**Response 200 - Success (singolo):**
```json
{
  "message": "Raider rimosso con successo",
  "raiderId": "raider_id_here"
}
```

**Response 200 - Success (multipli):**
```json
{
  "message": "3 raider rimossi con successo",
  "removedRaiders": ["raider_id_1", "raider_id_2", "raider_id_3"]
}
```

**Response 400 - Bad Request:**
```json
{
  "message": "Alcuni raider hanno ancora consegne attive",
  "raidersWithActiveDeliveries": [
    {
      "raiderId": "raider_id_1",
      "activeDeliveries": 2
    }
  ]
}
```

---

## Logistics Endpoints

### DELETE Raider (Logistics)

Rimuove un raider da tutti i business gestiti dalla logistica.

**Endpoint:**
```
DELETE /api/v2/logistics/raiders/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` (string, required) - ID del raider da rimuovere

**Condizioni:**
- Il raider deve essere gestito dalla logistica (attraverso i business)
- Il raider NON deve avere consegne attive nei business gestiti

**Response 200 - Success:**
```json
{
  "message": "Raider rimosso dai business gestiti con successo",
  "removedFromBusinesses": 2
}
```

**Response 400 - Bad Request:**
```json
{
  "message": "Impossibile rimuovere il raider. Ha ancora consegne attive.",
  "activeDeliveries": 5
}
```

**Response 404 - Not Found:**
```json
{
  "message": "Raider non trovato o non gestito dai business della tua logistica"
}
```

**Nota:** Rimuove tutte le relazioni BusinessRaider per i business gestiti dalla logistica.

---

## Admin Endpoints

### DELETE Raider (permanente)

Elimina completamente un raider dal sistema. Operazione irreversibile.

**Endpoint:**
```
DELETE /api/v2/admin/raiders/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` (string, required) - ID del raider da eliminare

**Condizioni:**
- Il raider NON deve avere consegne attive

**Operazioni eseguite (in transazione):**
1. Elimina tutte le relazioni BusinessRaider
2. Elimina tutte le AssignedDelivery
3. Elimina tutte le HistoryDelivery
4. Elimina il record Raider
5. Elimina il record User associato

**Response 200 - Success:**
```json
{
  "message": "Raider eliminato completamente dal sistema",
  "deletedRelations": {
    "businessRaiders": 3,
    "assignedDeliveries": 15,
    "historyDeliveries": 42
  }
}
```

**Response 400 - Bad Request:**
```json
{
  "message": "Impossibile eliminare il raider. Ha ancora consegne attive.",
  "activeDeliveries": 2
}
```

**Response 404 - Not Found:**
```json
{
  "message": "Raider non trovato"
}
```

**ATTENZIONE:** Questa operazione è irreversibile. Tutti i dati del raider verranno eliminati permanentemente.

---

### DELETE Business

Disabilita un business (soft delete).

**Endpoint:**
```
DELETE /api/v2/admin/businesses/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` (string, required) - ID del business da disabilitare

**Operazioni eseguite:**
- Imposta `user.expired = true` per l'utente associato
- Il business non viene eliminato fisicamente dal database

**Response 200 - Success:**
```json
{
  "message": "Business disabilitato con successo"
}
```

**Response 404 - Not Found:**
```json
{
  "message": "Business non trovato"
}
```

**Nota:** Soft delete - il business rimane nel database ma l'utente non può più accedere.

---

### DELETE Logistics

Disabilita un account logistics (soft delete).

**Endpoint:**
```
DELETE /api/v2/admin/logistics/:id
```

**Headers:**
```
Authorization: Bearer YOUR_JWT_TOKEN
x-api-key: YOUR_API_KEY
```

**Parametri URL:**
- `id` (string, required) - ID del logistics da disabilitare

**Operazioni eseguite:**
- Imposta `user.expired = true` per l'utente associato
- Il logistics non viene eliminato fisicamente dal database
- Le relazioni LogisticsBusiness rimangono intatte

**Response 200 - Success:**
```json
{
  "message": "Logistics disabilitato con successo"
}
```

**Response 404 - Not Found:**
```json
{
  "message": "Logistics non trovato"
}
```

**Nota:** Soft delete - il logistics rimane nel database ma l'utente non può più accedere.

---

### DELETE Business da Logistics

Rimuove l'assegnazione di uno o più business da un logistics.

**Endpoint:**
```
DELETE /api/v2/admin/logistics/remove-businesses
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
  "logisticsId": "logistics_id_here",
  "businessIds": ["business_id_1", "business_id_2"]
}
```

**Operazioni eseguite:**
- Elimina le relazioni LogisticsBusiness specificate
- I business rimangono nel sistema ma non sono più gestiti da quel logistics

**Response 200 - Success:**
```json
{
  "message": "2 business rimossi dal logistics con successo",
  "removedBusinessIds": ["business_id_1", "business_id_2"]
}
```

**Response 400 - Bad Request:**
```json
{
  "message": "Dati non validi",
  "errors": [...]
}
```

**Response 404 - Not Found:**
```json
{
  "message": "Logistics non trovato"
}
```

---

## Riepilogo Operazioni DELETE

### Tipo di Eliminazione

| Endpoint | Tipo | Reversibile | Elimina Utente |
|----------|------|-------------|----------------|
| Business Delivery | Hard Delete | No | N/A |
| Business Raider | Relazione | Sì | No |
| Logistics Raider | Relazione | Sì | No |
| Admin Raider | Hard Delete | No | Sì |
| Admin Business | Soft Delete | Sì | No |
| Admin Logistics | Soft Delete | Sì | No |
| Admin Remove Business | Relazione | Sì | No |

### Protezioni Comuni

Tutti gli endpoint DELETE che riguardano raider verificano:
- Nessuna consegna attiva (stati: CREATED, ASSIGNED, ONDELIVERY)
- Permessi corretti dell'utente autenticato
- Esistenza della risorsa da eliminare

### Best Practices

1. **Verificare sempre prima di eliminare**: Usa GET per controllare lo stato della risorsa
2. **Controllare le consegne attive**: Prima di rimuovere un raider
3. **Preferire soft delete**: Per business e logistics (reversibile)
4. **Usare transazioni**: Le operazioni complesse sono atomiche
5. **Backup dei dati**: Prima di eliminazioni permanenti (Admin Raider)

---

**Versione:** 2.1
**Ultimo aggiornamento:** 2025-10-10
