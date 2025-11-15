import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getCampaigns = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      includeArchived: z.boolean().optional().default(false),
    })
  )
  .query(async ({ input }) => {
    // Verify token
    let userId: number;
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);
      userId = parsed.userId;
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token",
      });
    }

    // Fetch campaigns
    const campaigns = await db.campaign.findMany({
      where: {
        userId,
        ...(input.includeArchived ? {} : { isArchived: false }),
      },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    });

    // Calculate analytics
    const totalCampaigns = campaigns.length;
    const totalImages = await db.asset.count({
      where: {
        type: "image",
        campaign: {
          userId,
          ...(input.includeArchived ? {} : { isArchived: false }),
        },
      },
    });

    return {
      campaigns: campaigns.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status,
        isArchived: c.isArchived,
        createdAt: c.createdAt,
        assetCount: c._count.assets,
      })),
      analytics: {
        totalCampaigns,
        totalImages,
      },
    };
  });
