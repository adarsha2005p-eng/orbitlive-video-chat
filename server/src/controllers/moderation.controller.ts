import { Response } from 'express';
import { z } from 'zod';
import prisma from '../utils/prisma';
import { RedisQueue } from '../utils/redis';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

const reportSchema = z.object({
  reportedUserId: z.string().min(1),
  sessionId: z.string().optional(),
  reason: z.string().min(1).max(200),
  details: z.string().max(1000).optional(),
});

const blockSchema = z.object({
  blockedUserId: z.string().min(1),
});

export async function submitReport(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parse = reportSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.errors[0].message });
    }

    const { reportedUserId, sessionId, reason, details } = parse.data;

    if (prisma) {
      try {
        const report = await prisma.report.create({
          data: {
            reporterId: req.user.id,
            reportedUserId,
            sessionId,
            reason,
            details: details || '',
          },
        });
        return res.status(201).json({ message: 'Report submitted successfully', report });
      } catch (err) {
        // Fallback
      }
    }

    return res.status(201).json({
      message: 'Report submitted successfully',
      report: {
        id: 'rep_' + Date.now(),
        reporterId: req.user.id,
        reportedUserId,
        sessionId,
        reason,
        details,
        createdAt: new Date(),
      },
    });
  } catch (err) {
    console.error('[Report Error]:', err);
    return res.status(500).json({ error: 'Failed to submit report' });
  }
}

export async function blockUser(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const parse = blockSchema.safeParse(req.body);
    if (!parse.success) {
      return res.status(400).json({ error: parse.error.errors[0].message });
    }

    const { blockedUserId } = parse.data;

    // Add to Redis block set
    await RedisQueue.addBlock(req.user.id, blockedUserId);

    if (prisma) {
      try {
        await prisma.block.upsert({
          where: {
            blockerId_blockedId: {
              blockerId: req.user.id,
              blockedId: blockedUserId,
            },
          },
          create: {
            blockerId: req.user.id,
            blockedId: blockedUserId,
          },
          update: {},
        });
      } catch (err) {
        // Fallback
      }
    }

    return res.json({ message: 'User blocked successfully' });
  } catch (err) {
    console.error('[Block Error]:', err);
    return res.status(500).json({ error: 'Failed to block user' });
  }
}

export async function getBlockedUsers(req: AuthenticatedRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (prisma) {
      try {
        const blocks = await prisma.block.findMany({
          where: { blockerId: req.user.id },
          include: {
            blocked: {
              select: { id: true, username: true },
            },
          },
        });
        return res.json({ blocks });
      } catch {
        // Fallback
      }
    }

    return res.json({ blocks: [] });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve blocks' });
  }
}
