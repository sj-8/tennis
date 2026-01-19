import { Request, Response } from 'express';
import prisma from '../prisma';

export const getMatches = async (req: Request, res: Response) => {
  try {
    const matches = await prisma.tournament.findMany({
      orderBy: { startTime: 'desc' },
      include: {
        _count: {
          select: { applications: { where: { status: { in: ['APPROVED', 'PENDING', 'WAITLIST'] } } } } // Count valid applications
        },
        referees: true
      }
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

  if (!name || !location || !startTime) {
      return res.status(400).json({ error: '缺少必填字段：名称、地点、时间' });
  }

  const start = new Date(startTime);
  if (isNaN(start.getTime())) {
      return res.status(400).json({ error: '无效的时间格式' });
  }

  try {
    const match = await prisma.tournament.create({
      data: {
        name,
        location,
        startTime: start,
        description,
        rules,
        registrationStart: registrationStart ? new Date(registrationStart) : null,
        registrationEnd: registrationEnd ? new Date(registrationEnd) : null,
      },
    });
    res.json(match);
  } catch (error) {
    console.error('Create match error:', error);
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
    // Validate time format if provided
    let startTime = undefined;
    if (data.startTime) {
      const d = new Date(data.startTime);
      if (isNaN(d.getTime())) return res.status(400).json({ error: '无效的比赛时间格式' });
      startTime = d;
    }

    let registrationStart = undefined;
    if (data.registrationStart) {
      const d = new Date(data.registrationStart);
      if (isNaN(d.getTime())) return res.status(400).json({ error: '无效的报名开始时间格式' });
      registrationStart = d;
    } else if (data.registrationStart === null) {
      registrationStart = null;
    }

    let registrationEnd = undefined;
    if (data.registrationEnd) {
      const d = new Date(data.registrationEnd);
      if (isNaN(d.getTime())) return res.status(400).json({ error: '无效的报名截止时间格式' });
      registrationEnd = d;
    } else if (data.registrationEnd === null) {
      registrationEnd = null;
    }

    const match = await prisma.tournament.update({
      where: { id: Number(id) },
      data: {
        name: data.name,
        location: data.location,
        description: data.description,
        rules: data.rules,
        startTime: startTime,
        registrationStart: registrationStart,
        registrationEnd: registrationEnd,
        drawSize: data.drawSize ? Number(data.drawSize) : null,
        matchType: data.matchType,
      },
    });
    res.json(match);
  } catch (error) {
    console.error('Update match error:', error);
    res.status(500).json({ error: 'Failed to update match' });
  }
};

export const deleteMatch = async (req: Request, res: Response) => {
  /**
   * 删除赛事接口
   * 物理删除赛事记录
   * 注意：如果有相关联的报名记录或结果，可能会因外键约束失败，需要先处理关联数据
   */
  const { id } = req.params;
  try {
    // Optional: Delete related data first if cascade delete is not configured in DB
    // await prisma.playerApplication.deleteMany({ where: { tournamentId: Number(id) } });
    // await prisma.tournamentResult.deleteMany({ where: { tournamentId: Number(id) } });

    await prisma.tournament.delete({
      where: { id: Number(id) }
    });
    res.json({ message: 'Match deleted successfully' });
  } catch (error) {
    console.error('Delete match error:', error);
    res.status(500).json({ error: 'Failed to delete match' });
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
   * 支持筛选：region (地区), gender (性别), matchType (比赛类型)
   */
  const { region, gender, matchType } = req.query;

  try {
    let players;
    
    // 如果指定了比赛类型，我们需要从 TournamentResult 聚合积分
    if (matchType && matchType !== '单打' && matchType !== '全部') {
       // Note: Currently DB stores total points in Player.points.
       // If we want to filter by matchType, we must aggregate from TournamentResult
       // where Tournament.matchType matches.
       // This is a more complex query.
       // Given the user requirement "Default Single", maybe they expect points to be separate?
       // But Player model only has `points`.
       // For now, let's assume `matchType` filter implies "Show me ranking based on points earned in this match type".
       
       const results = await prisma.tournamentResult.groupBy({
         by: ['playerId'],
         where: {
           tournament: {
             matchType: matchType as string
           }
         },
         _sum: {
           pointsChange: true
         },
         orderBy: {
           _sum: {
             pointsChange: 'desc'
           }
         },
         take: 50
       });
       
       // Now fetch player details for these IDs
       const playerIds = results.map(r => r.playerId);
       const playersDetails = await prisma.player.findMany({
         where: {
           id: { in: playerIds },
           region: region ? { contains: region as string } : undefined, // Filter by region if provided
           gender: (gender && gender !== '全性别') ? (gender as string) : undefined // Filter by gender if provided
         }
       });
       
       // Map back to preserve order and aggregated points
       players = results.map(r => {
         const p = playersDetails.find(pd => pd.id === r.playerId);
         if (!p) return null;
         return {
           ...p,
           points: r._sum.pointsChange || 0 // Override total points with filtered points
         };
       }).filter(p => p !== null);
       
    } else if (matchType === '单打') {
        // Default logic for Singles if we want to separate?
        // Or if '单打' is just one of the types.
        // Let's apply the same logic as above for consistency if matchType is specified.
         const results = await prisma.tournamentResult.groupBy({
         by: ['playerId'],
         where: {
           tournament: {
             matchType: { contains: '单' } // "男单", "女单" usually contain "单"
           }
         },
         _sum: {
           pointsChange: true
         },
         orderBy: {
           _sum: {
             pointsChange: 'desc'
           }
         },
         take: 50
       });
       
       const playerIds = results.map(r => r.playerId);
       const playersDetails = await prisma.player.findMany({
         where: {
           id: { in: playerIds },
           region: region ? { contains: region as string } : undefined,
           gender: (gender && gender !== '全性别') ? (gender as string) : undefined
         }
       });
       
       players = results.map(r => {
         const p = playersDetails.find(pd => pd.id === r.playerId);
         if (!p) return null;
         return {
           ...p,
           points: r._sum.pointsChange || 0
         };
       }).filter(p => p !== null);

    } else {
        // No matchType filter (or '全部'), use global points but filter by region/gender
        players = await prisma.player.findMany({
            where: {
                region: region ? { contains: region as string } : undefined,
                gender: (gender && gender !== '全性别') ? (gender as string) : undefined
            },
            orderBy: { points: 'desc' },
            take: 50
        });
    }

    res.json(players);
  } catch (error) {
    console.error('Get rankings error:', error);
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
        status: { in: ['APPROVED', 'WAITLIST'] }
      },
      orderBy: { createdAt: 'asc' },
      include: {
        player: {
          select: {
            name: true,
            avatar: true,
            gender: true
          }
        }
      }
    });
    // Return only necessary info
    const result = participants.map((p: any) => ({
      id: p.id,
      playerId: p.playerId, // Add playerId
      name: p.realName, // Use realName from application
      nickname: p.player.name, // Nickname from Player profile
      gender: p.player.gender, // Gender from Player profile
      avatarUrl: p.player.avatar, // Map to avatarUrl to match frontend
      status: p.status // Return status for display
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch participants' });
  }
};

// Referee Management
export const getReferees = async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const referees = await prisma.tournamentReferee.findMany({
      where: { tournamentId: Number(id) },
      include: { player: true }
    });
    res.json(referees.map(r => r.player));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch referees' });
  }
};

export const addReferee = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { openid } = req.body;
  
  try {
    const player = await prisma.player.findUnique({ where: { openid } });
    if (!player) {
      return res.status(404).json({ error: 'User not found' });
    }

    await prisma.tournamentReferee.create({
      data: {
        tournamentId: Number(id),
        playerId: player.id
      }
    });
    res.json({ message: 'Referee added' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add referee' });
  }
};

export const removeReferee = async (req: Request, res: Response) => {
  const { id, playerId } = req.params;
  try {
    await prisma.tournamentReferee.delete({
      where: {
        tournamentId_playerId: {
          tournamentId: Number(id),
          playerId: Number(playerId)
        }
      }
    });
    res.json({ message: 'Referee removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove referee' });
  }
};
