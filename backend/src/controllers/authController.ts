import { Request, Response } from 'express';
import prisma from '../prisma';

export const login = async (req: Request, res: Response) => {
  const { code } = req.body;
  // In a real app, exchange code for openid via WeChat API
  // For demo, we assume 'code' is the openid or username
  const mockOpenId = code || `user_${Date.now()}`;

  try {
    let player = await prisma.player.findUnique({
      where: { openid: mockOpenId },
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          openid: mockOpenId,
          name: `Player ${mockOpenId.substring(0, 4)}`,
        },
      });
    }

    res.json({ token: 'mock_jwt_token', player });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};
