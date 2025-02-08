// app/components/UpdateUsersButton.tsx
'use client'; // Questo componente viene eseguito lato client

import { useState } from 'react';

export default function UpdateUsersButton() {
  const [message, setMessage] = useState<string>('');

  const handleUpdateUsers = async () => {
    try {
      const response = await fetch('/api/updateUsers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Utenti aggiornati con successo.');
      } else {
        setMessage(`Errore: ${data.error || 'Errore sconosciuto'}`);
      }
    } catch (error) {
      console.error('Errore durante la chiamata API:', error);
      setMessage('Si è verificato un errore durante la chiamata API.');
    }
  };

  return (
    <div>
      <button onClick={handleUpdateUsers}>Aggiorna Utenti</button>
      {message && <p>{message}</p>}
    </div>
  );
}