import { Request, Response } from 'express';
import prisma from '../prisma';

export const createGame = async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  const { player1Id, player2Id } = req.body;

  if (!player1Id || !player2Id) {
    return res.status(400).json({ error: 'Missing players' });
  }

  try {
    const game = await prisma.matchGame.create({
      data: {
        tournamentId: Number(tournamentId),
        player1Id: Number(player1Id),
        player2Id: Number(player2Id)
      },
      include: {
        player1: true,
        player2: true
      }
    });
    res.json(game);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create game' });
  }
};

export const getGames = async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const games = await prisma.matchGame.findMany({
      where: { tournamentId: Number(tournamentId) },
      include: {
        player1: { select: { name: true, avatar: true } },
        player2: { select: { name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
};

export const updateGameScore = async (req: Request, res: Response) => {
  const { gameId } = req.params;
  const { score1, score2 } = req.body;

  try {
    const game = await prisma.matchGame.update({
      where: { id: Number(gameId) },
      data: {
        score1: String(score1),
        score2: String(score2),
        status: 'COMPLETED'
      }
    });
    res.json(game);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update score' });
  }
};
