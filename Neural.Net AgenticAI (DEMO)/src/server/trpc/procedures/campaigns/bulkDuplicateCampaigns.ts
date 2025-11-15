import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const bulkDuplicateCampaigns = baseProcedure
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

    // Fetch all campaigns with their assets
    const campaigns = await db.campaign.findMany({
      where: {
        id: { in: input.campaignIds },
      },
      include: {
        assets: true,
      },
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

    // Duplicate each campaign
    const newCampaignIds: number[] = [];

    for (const campaign of campaigns) {
      // Create new campaign
      const newCampaign = await db.campaign.create({
        data: {
          userId,
          name: `Copy of ${campaign.name}`,
          brief: campaign.brief,
          status: campaign.status,
          templateId: campaign.templateId,
          isArchived: false,
        },
      });

      newCampaignIds.push(newCampaign.id);

      // Duplicate all assets
      if (campaign.assets.length > 0) {
        await db.asset.createMany({
          data: campaign.assets.map((asset) => ({
            campaignId: newCampaign.id,
            type: asset.type,
            content: asset.content,
            url: asset.url,
            isSelected: asset.isSelected,
          })),
        });
      }
    }

    return {
      success: true,
      newCampaignIds,
      count: newCampaignIds.length,
    };
  });
