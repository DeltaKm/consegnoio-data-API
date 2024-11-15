"use client"
import { useEffect, useState } from "react";

const RatingDisplay: React.FC = () => {
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRating = async () => {
      try {
        console.log("Fetching data from /api/ratings...");
        const response = await fetch("/api/ratings");

        if (!response.ok) {
          console.error(`Errore HTTP: ${response.status}`);
          throw new Error(`Errore HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log("Dati ricevuti:", data);
        setAverageRating(data.average);
      } catch (err: any) {
        console.error("Errore nel recupero dei dati:", err.message);
        setError(err.message || "Errore sconosciuto");
        
      }
    };

    fetchRating();
  }, []);

  if (error) {
    return <p>Errore: {error}</p>;
  }

  if (averageRating === null) {
    return <p>Caricamento in corso...</p>;
  }

  return <p>Punteggio medio utente: {averageRating}</p>;
  };

export default RatingDisplay;