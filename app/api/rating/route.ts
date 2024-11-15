import { NextApiRequest, NextApiResponse } from "next";

type Rating = {
  userId: string;
  score: number;
};

// dati di test
const ratings: Rating[] = [
  { userId: "user1", score: 5 },
  { userId: "user2", score: 4 },
  { userId: "user3", score: 3 },
];

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === "GET") {
    //  media rating degli utenti
    const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
    const average = ratings.length > 0 ? totalScore / ratings.length : 0;

   
    res.status(200).json({ average: parseFloat(average.toFixed(2)) });
  } else {
    
    res.setHeader("Allow", ["GET"]);
    res.status(405).end(`Metodo ${req.method} non consentito`);
  }
}