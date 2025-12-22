import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const submitApplication = async (req: Request, res: Response) => {
  const { tournamentId } = req.body;
  // @ts-ignore
  const userId = req.user?.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Check if tournament exists
    const tournament = await prisma.tournament.findUnique({
      where: { id: Number(tournamentId) }
    });

    if (!tournament) {
      return res.status(404).json({ error: 'Tournament not found' });
    }

    // Check if already applied
    const existingApp = await prisma.playerApplication.findFirst({
      where: {
        tournamentId: Number(tournamentId),
        playerId: Number(userId)
      }
    });

    if (existingApp && ['APPROVED', 'PENDING', 'WAITLIST'].includes(existingApp.status)) {
      return res.status(400).json({ error: 'Already applied' });
    }
    
    // Determine Status (APPROVED or WAITLIST)
    let status = 'APPROVED'; // Default to Approved (Signed Up)
    
    // @ts-ignore
    if (tournament.drawSize) {
        const count = await prisma.playerApplication.count({
            where: { 
                tournamentId: Number(tournamentId),
                status: 'APPROVED'
            }
        });
        
        // @ts-ignore
        if (count >= tournament.drawSize) {
            status = 'WAITLIST';
        }
    }

    // If previously CANCELLED/REJECTED, update it. Else create new.
    let application;
    if (existingApp) {
        application = await prisma.playerApplication.update({
            where: { id: existingApp.id },
            data: { status, createdAt: new Date() } // Reset time for waitlist queue
        });
    } else {
        application = await prisma.playerApplication.create({
            data: {
                tournamentId: Number(tournamentId),
                playerId: Number(userId),
                realName: '',
                phone: '',
                idCard: '',
                status
            }
        });
    }

    res.json(application);
  } catch (error) {
    console.error(error);
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

export const cancelApplication = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user?.id;
    const { id } = req.params; // Tournament ID
    
    try {
        const tournament = await prisma.tournament.findUnique({ where: { id: Number(id) } });
        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
        
        // Check time (24h before start)
        const now = new Date();
        const start = new Date(tournament.startTime);
        const diffHours = (start.getTime() - now.getTime()) / (1000 * 60 * 60);
        
        if (diffHours < 24) {
            return res.status(400).json({ error: '开赛前24h不能取消' });
        }

        // Transaction: Cancel self -> Promote waitlist
        await prisma.$transaction(async (tx) => {
            // 1. Cancel Self
            const myApp = await tx.playerApplication.findFirst({
                where: { tournamentId: Number(id), playerId: Number(userId) }
            });
            
            if (!myApp || !['APPROVED', 'WAITLIST'].includes(myApp.status)) {
                throw new Error('No active application found');
            }
            
            await tx.playerApplication.update({
                where: { id: myApp.id },
                data: { status: 'CANCELLED' }
            });
            
            // 2. If I was APPROVED, promote first WAITLIST
            // @ts-ignore
            if (myApp.status === 'APPROVED' && tournament.drawSize) {
                const firstWaitlist = await tx.playerApplication.findFirst({
                    where: { tournamentId: Number(id), status: 'WAITLIST' },
                    orderBy: { createdAt: 'asc' }
                });
                
                if (firstWaitlist) {
                    await tx.playerApplication.update({
                        where: { id: firstWaitlist.id },
                        data: { status: 'APPROVED' }
                    });
                }
            }
        });
        
        res.json({ message: 'Application cancelled' });
    } catch (error: any) {
        console.error(error);
        res.status(500).json({ error: error.message || 'Failed to cancel' });
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
  // @ts-ignore
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
