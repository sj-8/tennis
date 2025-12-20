import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const submitApplication = async (req: Request, res: Response) => {
  /**
   * 提交报名申请接口
   * 接收选手提交的报名信息（真实姓名、手机号、身份证等）
   * 创建初始状态为 'PENDING' 的报名记录
   */
  const { playerId, tournamentId, realName, phone, idCard, bio, files } = req.body;
  
  try {
    const application = await prisma.playerApplication.create({
      data: {
        playerId: Number(playerId),
        tournamentId: Number(tournamentId),
        realName,
        phone,
        idCard,
        bio,
        files: JSON.stringify(files || []),
        status: 'PENDING'
      }
    });
    res.json(application);
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit application' });
  }
};

export const getApplications = async (req: Request, res: Response) => {
  /**
   * 获取报名申请列表接口
   * 查询所有报名申请记录，按时间倒序排列
   */
  try {
    const applications = await prisma.playerApplication.findMany({
      include: {
        player: true,
        tournament: true
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

export const getUserApplications = async (req: Request, res: Response) => {
  // @ts-ignore
  const userId = req.user?.id;
  try {
    const applications = await prisma.playerApplication.findMany({
      where: { playerId: Number(userId) },
      select: {
        tournamentId: true,
        status: true
      }
    });
    res.json(applications);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user applications' });
  }
};

export const auditApplication = async (req: Request, res: Response) => {
  /**
   * 审核报名申请接口
   * 更新申请状态（APPROVED 或 REJECTED）
   * 同时记录审计日志 (AuditLog)
   */
  const { id } = req.params;
  const { status, comment } = req.body; // status: APPROVED or REJECTED
  const adminId = req.user.id;

  try {
    const application = await prisma.playerApplication.update({
      where: { id: Number(id) },
      data: { status }
    });

    await prisma.auditLog.create({
      data: {
        adminId,
        applicationId: application.id,
        action: status,
        comment
      }
    });

    res.json(application);
  } catch (error) {
    res.status(500).json({ error: 'Audit failed' });
  }
};
