import { Request, Response } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const login = async (req: Request, res: Response) => {
  // Try to get OpenID from WeChat Cloud Hosting header first (most reliable in production)
  const wxOpenIdHeader = req.headers['x-wx-openid'];
  
  // Fallback to code from body (for local dev or if header missing)
  // Note: On real device without jscode2session implemented on backend, code is NOT the openid.
  // But if running on WeChat Cloud Hosting, x-wx-openid SHOULD be present.
  let openId = (wxOpenIdHeader as string) || req.body.code;

  // If we still don't have a valid "openid" looking string (e.g. just a short code), 
  // and we are NOT in production cloud hosting (no header), this will create a temporary user.
  // Ideally, you should implement jscode2session here if not using Cloud Hosting.
  
  if (!openId) {
     return res.status(400).json({ error: 'Missing code or openid' });
  }

  // Debug log
  console.log('Login request:', { 
    headers: req.headers, 
    body: req.body, 
    resolvedOpenId: openId 
  });

  try {
    let player = await prisma.player.findUnique({
      where: { openid: openId },
    });

    if (!player) {
      player = await prisma.player.create({
        data: {
          openid: openId,
          role: 'USER', // Default role
          name: `User_${openId.substring(0, 6)}`
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
