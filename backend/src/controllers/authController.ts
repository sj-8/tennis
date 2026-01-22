import { Request, Response } from 'express';
import https from 'https';
import prisma from '../prisma';
import jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const WX_APP_ID = process.env.WX_APP_ID;
const WX_APP_SECRET = process.env.WX_APP_SECRET;

export const searchPlayers = async (req: Request, res: Response) => {
  const { query } = req.query;
  
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required' });
  }

  try {
    const players = await prisma.player.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { realName: { contains: query } },
          { phone: { contains: query } }
        ]
      },
      take: 10,
      select: {
        id: true,
        name: true,
        realName: true,
        avatar: true,
        gender: true
      }
    });
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, avatar, gender, birthday, region, realName, idCard, phone } = req.body;

  try {
    const player = await prisma.player.update({
      where: { id: Number(id) },
      data: {
        name: name === undefined ? undefined : name,
        avatar: avatar === undefined ? undefined : avatar,
        gender: gender === undefined ? undefined : gender,
        birthday: birthday ? new Date(birthday) : (birthday === null ? null : undefined),
        region: region === undefined ? undefined : region,
        realName: realName === undefined ? undefined : realName,
        idCard: idCard === undefined ? undefined : idCard,
        phone: phone === undefined ? undefined : phone
      }
    });
    res.json(player);
  } catch (error: any) {
    console.error('Update profile error:', error);
    if (error.code === 'P2002' && error.meta?.target?.includes('idCard')) {
      return res.status(400).json({ error: '该身份证号已被绑定到其他账号' });
    }
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
  let openId = wxOpenIdHeader as string;

  // If no header (e.g. public network access or local dev), exchange code for openid
  if (!openId && req.body.code) {
    if (WX_APP_ID && WX_APP_SECRET) {
      try {
        const url = `https://api.weixin.qq.com/sns/jscode2session?appid=${WX_APP_ID}&secret=${WX_APP_SECRET}&js_code=${req.body.code}&grant_type=authorization_code`;
        console.log('Calling WeChat API:', url.replace(WX_APP_SECRET, '****')); // Log URL but mask secret
        
        // Create an https agent that ignores self-signed certificate errors
        const agent = new https.Agent({  
          rejectUnauthorized: false
        });
        
        const wxRes = await axios.get(url, { httpsAgent: agent });
        
        if (wxRes.data.openid) {
          openId = wxRes.data.openid;
          console.log('Fetched OpenID from WeChat API:', openId);
        } else {
          console.error('WeChat API error:', wxRes.data);
          return res.status(400).json({ error: 'Failed to fetch OpenID from WeChat', details: wxRes.data });
        }
      } catch (err: any) { // Type as any to access properties
        console.error('Network error calling WeChat API:', err.message, err.response?.data);
        // Return detailed error for debugging (remove details in production if sensitive)
        return res.status(500).json({ error: 'Network error calling WeChat API', details: err.message });
      }
    } else {
      console.warn('Missing WX_APP_ID or WX_APP_SECRET env vars. Falling back to code as openid (NOT RECOMMENDED for production).');
      openId = req.body.code;
    }
  }

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
      // Auto-assign ADMIN role for specific OpenID (Hotfix for development)
      const isAdmin = openId === 'oh76N5UiVyVhLMrgCBNE23Ana_DY';
      
      player = await prisma.player.create({
        data: {
          openid: openId,
          role: isAdmin ? 'ADMIN' : 'USER', 
          name: `User_${openId.substring(0, 6)}`
        }
      });
    } else {
        // Ensure this specific user is always ADMIN if they log in
        if (openId === 'oh76N5UiVyVhLMrgCBNE23Ana_DY' && player.role !== 'ADMIN') {
            player = await prisma.player.update({
                where: { id: player.id },
                data: { role: 'ADMIN' }
            });
        }
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

export const getPhoneNumber = async (req: Request, res: Response) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Code is required' });

  if (!WX_APP_ID || !WX_APP_SECRET) {
      return res.status(500).json({ error: 'Server misconfigured: Missing WX credentials' });
  }

  try {
    // Create an https agent that ignores self-signed certificate errors (Workaround for container env)
    const agent = new https.Agent({  
      rejectUnauthorized: false
    });

    // 1. Get Access Token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WX_APP_ID}&secret=${WX_APP_SECRET}`;
    const tokenRes = await axios.get(tokenUrl, { httpsAgent: agent });
    
    if (!tokenRes.data.access_token) {
        throw new Error('Failed to get access token: ' + JSON.stringify(tokenRes.data));
    }
    const accessToken = tokenRes.data.access_token;

    // 2. Get Phone Number
    const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${accessToken}`;
    const phoneRes = await axios.post(phoneUrl, { code }, { httpsAgent: agent });

    if (phoneRes.data.errcode === 0 && phoneRes.data.phone_info) {
        const phone = phoneRes.data.phone_info.phoneNumber;
        
        // Optionally update user's phone in DB if they are logged in
        // @ts-ignore
        const userId = req.user?.id;
        if (userId) {
            await prisma.player.update({
                where: { id: Number(userId) },
                data: { phone }
            });
        }

        res.json({ phone });
    } else {
        throw new Error('WeChat API Error: ' + JSON.stringify(phoneRes.data));
    }

  } catch (error: any) {
    console.error('Get Phone Number Error:', error);
    res.status(500).json({ error: 'Failed to get phone number', details: error.message });
  }
};
