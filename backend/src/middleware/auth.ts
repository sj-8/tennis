import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export interface AuthRequest extends Request {
  user?: any;
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
  /**
   * JWT 认证中间件
   * 验证请求头中的 Bearer Token
   * 如果验证通过，将用户信息挂载到 req.user
   */
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.sendStatus(401);

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  /**
   * 管理员权限验证中间件
   * 确保用户角色为 'ADMIN' 或 'SUPER_ADMIN'
   */
  if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
    return res.status(403).json({ error: 'Requires admin role' });
  }
  next();
};

export const requireSuperAdmin = (req: AuthRequest, res: Response, next: NextFunction) => {
  /**
   * 超级管理员权限验证中间件
   * 确保用户角色为 'SUPER_ADMIN'
   */
  if (!req.user || req.user.role !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Requires super admin role' });
  }
  next();
};
