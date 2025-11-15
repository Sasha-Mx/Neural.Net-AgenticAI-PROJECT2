import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const bulkArchiveCampaigns = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      campaignIds: z.array(z.number()).min(1, "At least one campaign must be selected"),
    })
  )
  .mutation(async ({ input }) => {
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

    // Verify all campaigns belong to the user
    const campaigns = await db.campaign.findMany({
      where: {
        id: { in: input.campaignIds },
      },
      select: { id: true, userId: true },
    });

    if (campaigns.length !== input.campaignIds.length) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Some campaigns were not found",
      });
    }

    const unauthorizedCampaign = campaigns.find((c) => c.userId !== userId);
    if (unauthorizedCampaign) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to some of these campaigns",
      });
    }

    // Archive all campaigns
    const result = await db.campaign.updateMany({
      where: {
        id: { in: input.campaignIds },
        userId,
      },
      data: {
        isArchived: true,
      },
    });

    return {
      success: true,
      count: result.count,
    };
  });
