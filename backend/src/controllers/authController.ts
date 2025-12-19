import { Request, Response } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (req: Request, res: Response) => {
  // For real WeChat login, we need to call jscode2session
  // This part is skipped for local dev if we just assume openid is passed or mocked
  // In production, uncomment and implement:
  // const { code } = req.body;
  // const wxRes = await axios.get(`https://api.weixin.qq.com/sns/jscode2session...`);
  // const openId = wxRes.data.openid;

  // For now, assume code IS the openid for simplicity in this demo environment or use a fixed one
  const mockOpenId = req.body.code || 'mock_openid_12345';

  try {
    let player = await prisma.player.findUnique({
      where: { openid: mockOpenId },
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          openid: mockOpenId,
          role: 'USER', // Default role
          name: `User_${mockOpenId.substring(0, 6)}`
        }
      });
    }

    // Log for debugging
    console.log(`User logged in: ${player.name}, OpenID: ${player.openid}, Role: ${player.role}`);

    const token = jwt.sign({ id: player.id, role: player.role, openid: player.openid }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, player });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
};
