import { Request, Response } from 'express';
import prisma from '../prisma';

export const createGame = async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  const { player1Id, player2Id, groupId, partner1Id, partner2Id } = req.body;

  if (!player1Id || !player2Id) {
    return res.status(400).json({ error: 'Missing players' });
  }

  try {
    const game = await prisma.matchGame.create({
      data: {
        tournamentId: Number(tournamentId),
        player1Id: Number(player1Id),
        player2Id: Number(player2Id),
        partner1Id: partner1Id ? Number(partner1Id) : null,
        partner2Id: partner2Id ? Number(partner2Id) : null,
        groupId: groupId ? Number(groupId) : null
      },
      include: {
        player1: true,
        player2: true,
        partner1: true,
        partner2: true
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
        player2: { select: { name: true, avatar: true } },
        partner1: { select: { name: true, avatar: true } },
        partner2: { select: { name: true, avatar: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(games);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
};

export const getGroups = async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  try {
    const groups = await prisma.matchGroup.findMany({
      where: { tournamentId: Number(tournamentId) },
      include: {
        games: {
            include: {
                player1: { select: { name: true, avatar: true } },
                player2: { select: { name: true, avatar: true } },
                partner1: { select: { name: true, avatar: true } },
                partner2: { select: { name: true, avatar: true } }
            },
            orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    res.json(groups);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
};

export const createGroup = async (req: Request, res: Response) => {
  const { tournamentId } = req.params;
  const { title } = req.body;
  
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const group = await prisma.matchGroup.create({
        data: {
            tournamentId: Number(tournamentId),
            title
        }
    });
    res.json(group);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
};

export const updateGroup = async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title } = req.body;
    try {
        const group = await prisma.matchGroup.update({
            where: { id: Number(id) },
            data: { title }
        });
        res.json(group);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update group' });
    }
};

export const deleteGroup = async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
        // Option: Delete games or disconnect? 
        // Cascade delete should be handled by DB or manually.
        // Let's delete games in the group first
        await prisma.matchGame.deleteMany({ where: { groupId: Number(id) } });
        
        await prisma.matchGroup.delete({ where: { id: Number(id) } });
        res.json({ message: 'Group deleted' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete group' });
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
