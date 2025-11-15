import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getCampaignAnalytics = baseProcedure
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

    // Fetch campaign with all assets
    const campaign = await db.campaign.findUnique({
      where: { id: input.campaignId },
      include: {
        assets: {
          orderBy: { viewCount: "desc" },
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

    // Calculate total views and exports for this campaign
    const totalAssetViews = campaign.assets.reduce((sum, a) => sum + a.viewCount, 0);
    const totalExports = campaign.assets.reduce((sum, a) => sum + a.exportCount, 0);

    // Get most viewed assets
    const mostViewedAssets = campaign.assets
      .filter((a) => a.viewCount > 0)
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        type: a.type,
        viewCount: a.viewCount,
        lastViewedAt: a.lastViewedAt,
        url: a.url,
        content: a.content,
      }));

    // Get most exported assets
    const mostExportedAssets = [...campaign.assets]
      .sort((a, b) => b.exportCount - a.exportCount)
      .filter((a) => a.exportCount > 0)
      .slice(0, 10)
      .map((a) => ({
        id: a.id,
        type: a.type,
        exportCount: a.exportCount,
        lastExportedAt: a.lastExportedAt,
        url: a.url,
        content: a.content,
      }));

    // Get export breakdown by asset type
    const exportsByType: Record<string, number> = {};
    campaign.assets.forEach((asset) => {
      if (asset.exportCount > 0) {
        exportsByType[asset.type] = (exportsByType[asset.type] || 0) + asset.exportCount;
      }
    });

    const exportTrendsByType = Object.entries(exportsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    // Get view breakdown by asset type
    const viewsByType: Record<string, number> = {};
    campaign.assets.forEach((asset) => {
      if (asset.viewCount > 0) {
        viewsByType[asset.type] = (viewsByType[asset.type] || 0) + asset.viewCount;
      }
    });

    const viewTrendsByType = Object.entries(viewsByType)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    return {
      campaignId: campaign.id,
      campaignName: campaign.name,
      campaignViewCount: campaign.viewCount,
      campaignLastViewedAt: campaign.lastViewedAt,
      totalAssetViews,
      totalExports,
      mostViewedAssets,
      mostExportedAssets,
      exportTrendsByType,
      viewTrendsByType,
      createdAt: campaign.createdAt,
    };
  });
