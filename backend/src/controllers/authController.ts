import { Request, Response } from 'express';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const updateProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, avatar } = req.body;

  try {
    const player = await prisma.player.update({
      where: { id: Number(id) },
      data: {
        name: name || undefined,
        avatar: avatar || undefined
      }
    });
    res.json(player);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

export const login = async (req: Request, res: Response) => {
  /**
   * 用户登录接口
   * 1. 优先尝试从微信云托管请求头 'x-wx-openid' 获取 OpenID (生产环境最可靠)
   * 2. 如果没有请求头，回退使用请求体中的 code (用于本地开发)
   * 3. 如果 OpenID 获取失败，返回 400 错误
   * 4. 查询数据库中是否存在该 OpenID 的用户
   * 5. 如果不存在，自动创建新用户，默认角色为 'USER'
   * 6. 生成 JWT Token 并返回
   */
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
    console.error('Login error detail:', error); // Enhanced error logging
    res.status(500).json({ error: 'Login failed', details: String(error) });
  }
};
