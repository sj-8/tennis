import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { generatePaymentParams, getJsApiSignature, verifyNotification, getWxPay } from '../utils/wechatPay';

// Helper to generate unique order number
const generateOrderNo = () => {
    const now = new Date();
    const timestamp = now.getFullYear().toString() +
        (now.getMonth() + 1).toString().padStart(2, '0') +
        now.getDate().toString().padStart(2, '0') +
        now.getHours().toString().padStart(2, '0') +
        now.getMinutes().toString().padStart(2, '0') +
        now.getSeconds().toString().padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${timestamp}${random}`;
};

export const createOrder = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user?.id;
    const { tournamentId } = req.body;

    try {
        const tournament = await prisma.tournament.findUnique({
            where: { id: Number(tournamentId) }
        });

        if (!tournament) return res.status(404).json({ error: 'Tournament not found' });
        // @ts-ignore
        if (!tournament.fee || tournament.fee <= 0) {
            return res.status(400).json({ error: 'This tournament is free, no order needed' });
        }

        // Create Order
        // @ts-ignore
        const order = await prisma.order.create({
            data: {
                orderNo: generateOrderNo(),
                playerId: Number(userId),
                tournamentId: Number(tournamentId),
                // @ts-ignore
                amount: tournament.fee, // Assuming Yuan
                status: 'PENDING'
            }
        });

        res.json(order);
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

export const initiatePayment = async (req: Request, res: Response) => {
    const { orderNo } = req.body;
    // @ts-ignore
    const userId = req.user?.id;

    try {
        // @ts-ignore
        const order = await prisma.order.findUnique({ where: { orderNo }, include: { player: true, tournament: true } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.status === 'PAID') return res.json({ message: 'Already paid', order });
        if (order.playerId !== userId) return res.status(403).json({ error: 'Not your order' });

        // If WeChat Pay is initialized, use it
        if (getWxPay()) {
            // 1. Generate Payment Params (Call WeChat JSAPI)
            const result: any = await generatePaymentParams(
                `报名费-${order.tournament.name}`,
                order.orderNo,
                order.amount,
                order.player.openid
            );
            
            // 2. Sign for Frontend
            let paymentParams;
            if (result.package && result.paySign) {
                // Already signed by the library
                paymentParams = result;
            } else {
                // Manually sign prepay_id
                paymentParams = getJsApiSignature(result.prepay_id);
            }
            
            res.json({ 
                paymentParams,
                order
            });
        } else {
            // Fallback to Simulation (if no credentials)
            console.warn('WeChat Pay not configured, using simulation');
            // Simulate success immediately
            // @ts-ignore
            const updatedOrder = await prisma.order.update({
                where: { id: order.id },
                data: { status: 'PAID' }
            });
            res.json({ message: 'Simulation: Payment successful', order: updatedOrder, isSimulation: true });
        }
    } catch (error: any) {
        console.error('Payment initiation error:', error);
        res.status(500).json({ error: 'Payment initiation failed', details: error.message });
    }
};

export const handlePaymentNotify = async (req: Request, res: Response) => {
    try {
        // Verify Signature & Decrypt
        const decrypted: any = await verifyNotification(req.headers, req.body);
        console.log('Payment Notification:', decrypted);
        
        const { out_trade_no, trade_state } = decrypted;
        
        if (trade_state === 'SUCCESS') {
            // Find Order
            // @ts-ignore
            const order = await prisma.order.findUnique({ where: { orderNo: out_trade_no } });
            
            if (order && order.status !== 'PAID') {
                // Update Order
                // @ts-ignore
                await prisma.order.update({
                    where: { id: order.id },
                    data: { status: 'PAID' }
                });
                console.log(`Order ${out_trade_no} paid successfully`);
            }
        }
        
        res.status(200).send({ code: 'SUCCESS', message: 'OK' });
    } catch (error) {
        console.error('Payment Notification Error:', error);
        res.status(500).send({ code: 'FAIL', message: 'Error' });
    }
};

export const submitApplication = async (req: Request, res: Response) => {
  const { tournamentId, partnerId } = req.body;
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
    
    // Check Payment if fee exists
    if (tournament.fee && tournament.fee > 0) {
        // Find a PAID order for this user and tournament
        const paidOrder = await prisma.order.findFirst({
            where: {
                tournamentId: Number(tournamentId),
                playerId: Number(userId),
                status: 'PAID'
            }
        });
        
        if (!paidOrder) {
            return res.status(402).json({ error: 'Payment required', fee: tournament.fee });
        }
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
            data: { 
                status, 
                createdAt: new Date(),
                partnerId: partnerId ? Number(partnerId) : null
            } 
        });
    } else {
        application = await prisma.playerApplication.create({
            data: {
                tournamentId: Number(tournamentId),
                playerId: Number(userId),
                partnerId: partnerId ? Number(partnerId) : null,
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
      where: {
        OR: [
          { playerId: Number(userId) },
          { partnerId: Number(userId) }
        ]
      },
      include: {
        tournament: true, // Include full tournament details
        partner: true,    // Include partner details
        player: true      // Include player details (so if I am partner, I see who applied)
      },
      orderBy: { createdAt: 'desc' }
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

export const getMyOrders = async (req: Request, res: Response) => {
    // @ts-ignore
    const userId = req.user?.id;
    try {
        // @ts-ignore
        const orders = await prisma.order.findMany({
            where: { playerId: Number(userId) },
            include: { tournament: true },
            orderBy: { createdAt: 'desc' }
        });
        res.json(orders);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to fetch orders' });
    }
};
