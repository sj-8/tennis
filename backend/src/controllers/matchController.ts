import { Request, Response } from 'express';
import prisma from '../prisma';

export const getMatches = async (req: Request, res: Response) => {
  /**
   * 获取赛事列表接口
   * 查询所有赛事，并包含比赛结果，按开始时间倒序排列
   */
  try {
    const matches = await prisma.tournament.findMany({
      include: { results: true },
      orderBy: { startTime: 'desc' }
    });
    res.json(matches);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch matches' });
  }
};

export const createMatch = async (req: Request, res: Response) => {
  /**
   * 创建赛事接口
   * 接收赛事名称、地点、时间等信息，创建新的赛事记录
   */
  const { name, location, startTime, description, rules, registrationStart, registrationEnd } = req.body;
  try {
    const match = await prisma.tournament.create({
      data: {
        name,
        location,
        startTime: new Date(startTime),
        description,
        rules,
        registrationStart: registrationStart ? new Date(registrationStart) : null,
        registrationEnd: registrationEnd ? new Date(registrationEnd) : null,
      },
    });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create match' });
  }
};

export const updateMatch = async (req: Request, res: Response) => {
  /**
   * 更新赛事接口
   * 根据赛事 ID 更新赛事信息
   */
  const { id } = req.params;
  const data = req.body;
  try {
    const match = await prisma.tournament.update({
      where: { id: Number(id) },
      data: {
        ...data,
        startTime: data.startTime ? new Date(data.startTime) : undefined,
        registrationStart: data.registrationStart ? new Date(data.registrationStart) : undefined,
        registrationEnd: data.registrationEnd ? new Date(data.registrationEnd) : undefined,
      },
    });
    res.json(match);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update match' });
  }
};

export const submitResult = async (req: Request, res: Response) => {
  /**
   * 提交比赛结果接口
   * 1. 接收比赛结果数组（包含选手 ID、排名、积分等）
   * 2. 使用数据库事务批量处理：
   *    - 更新或创建 TournamentResult 记录
   *    - 更新 Player 的总积分
   * 3. 将赛事状态更新为 'COMPLETED'
   */
  const { id } = req.params; // Tournament ID
  const { results } = req.body; // Array of { playerId, rank, score, bonusPoints }

  try {
    const operations = results.map((r: any) => {
      // Base points logic (can be overridden by bonusPoints)
      let points = r.bonusPoints || 1; 
      if (!r.bonusPoints) {
          if (r.rank === 1) points = 10;
          if (r.rank === 2) points = 5;
      }

      return prisma.$transaction([
        prisma.tournamentResult.upsert({
          where: {
            tournamentId_playerId: {
                tournamentId: Number(id),
                playerId: r.playerId
            }
          },
          update: {
            rank: r.rank,
            pointsChange: points
          },
          create: {
            tournamentId: Number(id),
            playerId: r.playerId,
            rank: r.rank,
            pointsChange: points
          }
        }),
        prisma.player.update({
          where: { id: r.playerId },
          data: { points: { increment: points } }
        })
      ]);
    });

    await Promise.all(operations);
    
    await prisma.tournament.update({
      where: { id: Number(id) },
      data: { status: 'COMPLETED' }
    });

    res.json({ message: 'Results submitted and points updated' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit results' });
  }
};

export const getRankings = async (req: Request, res: Response) => {
  /**
   * 获取排行榜接口
   * 查询前 50 名积分最高的选手
   */
  try {
    const players = await prisma.player.findMany({
      orderBy: { points: 'desc' },
      take: 50
    });
    res.json(players);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rankings' });
  }
};

export const getMatchParticipants = async (req: Request, res: Response) => {
  /**
   * 获取赛事参赛人员接口
   * 查询指定赛事下状态为 'APPROVED' 的报名记录
   * 返回包含选手 ID、真实姓名、头像等信息
   */
  const { id } = req.params;
  try {
    const participants = await prisma.playerApplication.findMany({
      where: {
        tournamentId: Number(id),
        status: 'APPROVED'
      },
      include: {
        player: {
          select: {
            name: true,
            avatar: true
          }
        }
      }
    });
    // Return only necessary info
    const result = participants.map((p: any) => ({
      id: p.id,
      playerId: p.playerId, // Add playerId
      name: p.realName, // Use realName from application
      avatar: p.player.avatar
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
};
