import { Request, Response } from 'express';
import prisma from '../prisma';
import { AuthRequest } from '../middleware/auth';
import { generatePaymentParams, getJsApiSignature, verifyNotification, getWxPay, refundOrder, queryOrder } from '../utils/wechatPay';

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

        // Check for existing PENDING order
        const existingOrder = await prisma.order.findFirst({
            where: {
                // @ts-ignore
                playerId: Number(userId),
                tournamentId: Number(tournamentId),
                status: 'PENDING'
            }
        });

        if (existingOrder) {
            return res.json(existingOrder);
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
            },
            include: {
                tournament: true,
                player: true
            }
        });

        res.json(order);
    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
};

export const checkOrderStatus = async (req: Request, res: Response) => {
    const { orderNo } = req.params;
    
    try {
        // @ts-ignore
        const order = await prisma.order.findUnique({ where: { orderNo } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        
        if (order.status === 'PAID') {
            return res.json({ status: 'PAID', message: 'Order is paid' });
        }
        
        // If PENDING, query WeChat
        if (getWxPay()) {
            const wxResult = await queryOrder(orderNo);
            if (wxResult.trade_state === 'SUCCESS') {
                // Sync status
                 // Transaction: Update Order -> Create/Update Application
                await prisma.$transaction(async (tx) => {
                    // 1. Update Order
                    // @ts-ignore
                    await tx.order.update({
                        where: { id: order.id },
                        data: { status: 'PAID' }
                    });
                    
                    // 2. Auto-Submit Application logic (copied from handlePaymentNotify)
                    const tournamentId = order.tournamentId;
                    const playerId = order.playerId;
                    // @ts-ignore
                    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
                    
                    if (tournament) {
                        const existingApp = await tx.playerApplication.findFirst({
                            where: { tournamentId, playerId }
                        });
                        let status = 'APPROVED';
                        // @ts-ignore
                        if (tournament.drawSize) {
                            const count = await tx.playerApplication.count({
                                where: { tournamentId, status: 'APPROVED' }
                            });
                            // @ts-ignore
                            if (count >= tournament.drawSize) { status = 'WAITLIST'; }
                        }

                        if (existingApp) {
                            if (['CANCELLED', 'REJECTED', 'PENDING_PAYMENT'].includes(existingApp.status)) {
                                await tx.playerApplication.update({
                                    where: { id: existingApp.id },
                                    data: { status, createdAt: new Date() }
                                });
                            }
                        } else {
                            await tx.playerApplication.create({
                                data: {
                                    tournamentId,
                                    playerId,
                                    status,
                                    realName: '',
                                    phone: '',
                                    idCard: ''
                                }
                            });
                        }
                    }
                });
                
                return res.json({ status: 'PAID', message: 'Order synced from WeChat' });
            }
        }
        
        res.json({ status: order.status });
    } catch (error) {
        console.error('Check order status error:', error);
        res.status(500).json({ error: 'Failed to check status' });
    }
};

export const cancelOrder = async (req: Request, res: Response) => {
    const { orderNo } = req.params;
    // @ts-ignore
    const userId = req.user?.id;

    try {
        // @ts-ignore
        const order = await prisma.order.findUnique({ where: { orderNo } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.playerId !== userId) return res.status(403).json({ error: 'Not your order' });
        // Allow cancelling PENDING orders. 
        // Note: If user wants to cancel PAID order, they should use 'cancelApplication' which handles refund.
        if (order.status !== 'PENDING') return res.status(400).json({ error: 'Only PENDING orders can be cancelled here' });

        // Update Order to CANCELLED
        // @ts-ignore
        const updatedOrder = await prisma.order.update({
            where: { id: order.id },
            data: { status: 'CANCELLED' }
        });
        
        // Also cancel the Application if it exists (so user can re-apply)
        // Ideally application status should be synced or reset.
        // If order is cancelled, the application remains in 'APPROVED' (if free) or 'PENDING_PAYMENT'?
        // Actually our submitApplication creates 'APPROVED' or 'WAITLIST'.
        // Wait, submitApplication checks for PAID order if fee > 0.
        // If fee > 0, submitApplication is called AFTER payment.
        // So if order is PENDING, submitApplication hasn't been called yet?
        // Let's check frontend logic: 
        // 1. createOrder -> 2. payOrder -> 3. submitApplication.
        // So if order is PENDING, there is NO application yet!
        // EXCEPT: If we changed logic to create application first? No.
        
        // But wait, "取消该赛事的报名订单。应将报名状态变为 提交报名状态"
        // If user hasn't paid, they haven't "applied" in the DB sense (PlayerApplication).
        // They only have an Order.
        // So cancelling the order just means the next time they click "Apply", they create a NEW order.
        // The frontend button state "待支付" is based on existence of PENDING order.
        // If we cancel this order, getPendingOrder() returns null.
        // So frontend button will revert to "提交报名" (or "待支付" if fee > 0 logic in template).
        
        // Template logic:
        // v-if="getPendingOrder(match.id)" -> "待支付"
        // v-else-if="match.status === 'PENDING'" -> "报名"
        
        // So if we cancel the order, getPendingOrder returns null.
        // The button becomes "报名".
        // Clicking "报名" calls createOrder -> payOrder.
        
        // So simply cancelling the order achieves the goal.

        res.json({ message: 'Order cancelled', order: updatedOrder });
    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({ error: 'Failed to cancel order' });
    }
};

export const initiatePayment = async (req: Request, res: Response) => {
    const { orderNo } = req.body;
    // @ts-ignore
    const userId = req.user?.id;

    try {
        // @ts-ignore
        let order = await prisma.order.findUnique({ where: { orderNo }, include: { player: true, tournament: true } });
        if (!order) return res.status(404).json({ error: 'Order not found' });
        if (order.status === 'PAID') return res.json({ message: 'Already paid', order });
        if (order.playerId !== userId) return res.status(403).json({ error: 'Not your order' });

        // If WeChat Pay is initialized, use it
        if (getWxPay()) {
            let result;
            try {
                // 1. Generate Payment Params (Call WeChat JSAPI)
                result = await generatePaymentParams(
                    `报名费-${order.tournament.name}`,
                    order.orderNo,
                    order.amount,
                    order.player.openid
                );
            } catch (err: any) {
                if (err.message === 'ORDER_REENTRY_CONFLICT') {
                    // Conflict detected (same orderNo, different params or expired).
                    // We must regenerate the orderNo to start a fresh transaction.
                    console.log(`Order reentry conflict for ${orderNo}, regenerating orderNo...`);
                    
                    const newOrderNo = generateOrderNo();
                    // Update DB with new orderNo
                    // @ts-ignore
                    order = await prisma.order.update({
                        where: { id: order.id },
                        data: { orderNo: newOrderNo },
                        include: { player: true, tournament: true }
                    });
                    
                    // Retry payment with new orderNo
                    result = await generatePaymentParams(
                        `报名费-${order.tournament.name}`,
                        order.orderNo,
                        order.amount,
                        order.player.openid
                    );
                } else if (err.message === 'ORDER_ALREADY_PAID') {
                     // Order is actually PAID in WeChat, but PENDING in our DB (Callback missed/delayed)
                     // Update DB and return "Already Paid"
                     console.log(`Order ${orderNo} found PAID in WeChat but PENDING in DB. Syncing status...`);
                     // @ts-ignore
                     const paidOrder = await prisma.order.update({
                         where: { id: order.id },
                         data: { status: 'PAID' }
                     });
                     return res.json({ message: 'Already paid (synced from WeChat)', order: paidOrder });
                } else {
                    throw err;
                }
            }
            
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
                order // Return updated order (with potentially new orderNo)
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
                // Transaction: Update Order -> Create/Update Application
                await prisma.$transaction(async (tx) => {
                    // 1. Update Order
                    // @ts-ignore
                    await tx.order.update({
                        where: { id: order.id },
                        data: { status: 'PAID' }
                    });
                    console.log(`Order ${out_trade_no} paid successfully`);

                    // 2. Auto-Submit Application if not exists or pending payment
                    // This ensures that even if frontend fails to call submitApplication,
                    // the payment callback will guarantee the user is registered.
                    const tournamentId = order.tournamentId;
                    const playerId = order.playerId;
                    
                    // @ts-ignore
                    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
                    
                    if (tournament) {
                        const existingApp = await tx.playerApplication.findFirst({
                            where: { tournamentId, playerId }
                        });
                        
                        // Determine Status
                        let status = 'APPROVED';
                        // @ts-ignore
                        if (tournament.drawSize) {
                            const count = await tx.playerApplication.count({
                                where: { tournamentId, status: 'APPROVED' }
                            });
                            // @ts-ignore
                            if (count >= tournament.drawSize) {
                                status = 'WAITLIST';
                            }
                        }

                        if (existingApp) {
                            // If app exists but was cancelled/rejected/pending, update it
                            if (['CANCELLED', 'REJECTED', 'PENDING_PAYMENT'].includes(existingApp.status)) {
                                await tx.playerApplication.update({
                                    where: { id: existingApp.id },
                                    data: { status, createdAt: new Date() }
                                });
                            }
                        } else {
                            // Create new application
                            await tx.playerApplication.create({
                                data: {
                                    tournamentId,
                                    playerId,
                                    status,
                                    realName: '', // These might be empty if callback handles it, ideally fetch from profile
                                    phone: '',
                                    idCard: ''
                                }
                            });
                        }
                    }
                });
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

        // Transaction: Cancel self -> Refund -> Promote waitlist
        await prisma.$transaction(async (tx) => {
            // 1. Cancel Self
            const myApp = await tx.playerApplication.findFirst({
                where: { tournamentId: Number(id), playerId: Number(userId) }
            });
            
            if (!myApp || !['APPROVED', 'WAITLIST'].includes(myApp.status)) {
                throw new Error('No active application found');
            }
            
            // 2. Refund Check
            // Find PAID order for this tournament
            const paidOrder = await tx.order.findFirst({
                where: {
                    tournamentId: Number(id),
                    playerId: Number(userId),
                    status: 'PAID'
                }
            });

            if (paidOrder) {
                // Perform Refund
                // Note: We do this inside transaction, but external API call cannot be rolled back.
                // Ideally, we should use a job queue or ensure idempotency.
                // For now, if refund fails, we throw error and rollback DB changes.
                try {
                    if (getWxPay()) {
                         await refundOrder(paidOrder.orderNo, paidOrder.amount, '用户取消报名退款');
                         console.log(`Refund initiated for order ${paidOrder.orderNo}`);
                    } else {
                         console.warn('Simulation: Refund skipped (No Wechat Pay Config)');
                    }
                    
                    // Update Order Status
                    await tx.order.update({
                        where: { id: paidOrder.id },
                        data: { status: 'REFUNDED' }
                    });
                } catch (refundError: any) {
                    console.error('Refund failed:', refundError);
                    // Decide: Fail the cancellation OR continue with manual refund required?
                    // Let's fail it to be safe.
                    throw new Error('退款失败，请联系客服处理');
                }
            }

            // 3. Update Application Status
            await tx.playerApplication.update({
                where: { id: myApp.id },
                data: { status: 'CANCELLED' }
            });
            
            // 4. If I was APPROVED, promote first WAITLIST
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
        
        res.json({ message: 'Application cancelled and refund initiated' });
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
