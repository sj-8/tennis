import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';

export const submitApplication = async (req: Request, res: Response) => {
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
  try {
    const apps = await prisma.playerApplication.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch applications' });
  }
};

export const auditApplication = async (req: AuthRequest, res: Response) => {
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
