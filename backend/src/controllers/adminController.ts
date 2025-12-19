import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export const adminLogin = async (req: Request, res: Response) => {
  /**
   * 管理员登录接口
   * 验证用户名和密码，成功后颁发 JWT Token
   */
  const { username, password } = req.body;
  
  try {
    const admin = await prisma.adminUser.findUnique({ where: { username } });
    if (!admin) return res.status(400).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(password, admin.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ id: admin.id, role: admin.role }, JWT_SECRET, { expiresIn: '1d' });
    res.json({ token });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createAdmin = async (req: Request, res: Response) => {
  /**
   * 创建管理员接口
   * 仅超级管理员可调用，用于创建新的管理员账户
   */
  const { username, password, role } = req.body;
  // In a real app, this endpoint should be protected or disabled
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const admin = await prisma.adminUser.create({
      data: {
        username,
        password: hashedPassword,
        role: role || 'ADMIN'
      }
    });
    res.json(admin);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create admin' });
  }
};

export const getAuditLogs = async (req: Request, res: Response) => {
  /**
   * 获取审计日志接口
   * 查询管理员的操作日志
   */
  try {
    const logs = await prisma.auditLog.findMany({
      include: {
        admin: { select: { username: true } },
        application: { select: { realName: true, project: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
};

export const promotePlayerToAdmin = async (req: Request, res: Response) => {
  /**
   * 提拔选手为管理员接口
   * 将指定选手 ID 的角色更新为 'ADMIN'
   */
  const { id } = req.params;
  const { role } = req.body; // 'ADMIN' or 'USER'

  try {
    const player = await prisma.player.update({
      where: { id: Number(id) },
      data: { role: role || 'ADMIN' }
    });
    res.json({ message: `Player ${player.name} role updated to ${player.role}`, player });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update player role' });
  }
};
