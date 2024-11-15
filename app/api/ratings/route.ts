import { NextResponse } from 'next/server';

type Rating = {
  userId: string;
  score: number;
};

// Dati di test
const ratings: Rating[] = [
  { userId: "user1", score: 5 },
  { userId: "user2", score: 4 },
  { userId: "user3", score: 3 },
];


export async function GET() {
  const totalScore = ratings.reduce((sum, rating) => sum + rating.score, 0);
  const average = ratings.length > 0 ? totalScore / ratings.length : 0;

  return NextResponse.json({ average: parseFloat(average.toFixed(2)) });
}