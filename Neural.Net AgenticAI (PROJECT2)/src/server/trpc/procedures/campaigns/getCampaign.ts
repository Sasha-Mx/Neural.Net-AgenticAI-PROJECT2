import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getCampaign = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      campaignId: z.number(),
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

    // Fetch campaign with all related data
    const campaign = await db.campaign.findUnique({
      where: { id: input.campaignId },
      include: {
        assets: {
          orderBy: { createdAt: "asc" },
        },
        workflowLog: {
          orderBy: { timestamp: "asc" },
        },
      },
    });

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      });
    }

    // Verify ownership
    if (campaign.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this campaign",
      });
    }

    return {
      id: campaign.id,
      name: campaign.name,
      brief: campaign.brief,
      status: campaign.status,
      createdAt: campaign.createdAt,
      assets: campaign.assets.map((a) => ({
        id: a.id,
        type: a.type,
        content: a.content,
        url: a.url,
        isSelected: a.isSelected,
        viewCount: a.viewCount,
        lastViewedAt: a.lastViewedAt,
        exportCount: a.exportCount,
        lastExportedAt: a.lastExportedAt,
      })),
      workflowLog: campaign.workflowLog.map((log) => ({
        id: log.id,
        agentName: log.agentName,
        status: log.status,
        durationMs: log.durationMs,
        inputPayload: log.inputPayload,
        outputPayload: log.outputPayload,
        outputSummary: log.outputSummary,
        timestamp: log.timestamp,
      })),
    };
  });
