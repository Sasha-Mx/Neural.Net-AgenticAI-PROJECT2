import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getPerformanceAnalytics = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
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

    // Build date filter
    const dateFilter: any = {};
    if (input.startDate || input.endDate) {
      dateFilter.createdAt = {};
      if (input.startDate) {
        dateFilter.createdAt.gte = new Date(input.startDate);
      }
      if (input.endDate) {
        dateFilter.createdAt.lte = new Date(input.endDate);
      }
    }

    // Get all campaigns for the user with date filtering
    const campaigns = await db.campaign.findMany({
      where: {
        userId,
        ...dateFilter,
      },
      include: {
        assets: true,
        template: true,
      },
      orderBy: { viewCount: "desc" },
    });

    // Calculate total views and exports
    const totalViews = campaigns.reduce((sum, c) => sum + c.viewCount, 0);
    const totalExports = campaigns.reduce(
      (sum, c) => sum + c.assets.reduce((aSum, a) => aSum + a.exportCount, 0),
      0
    );

    // Get most viewed campaigns (top 5)
    const mostViewedCampaigns = campaigns
      .filter((c) => c.viewCount > 0)
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        name: c.name,
        viewCount: c.viewCount,
        lastViewedAt: c.lastViewedAt,
      }));

    // Get most exported content types
    const contentTypeExports: Record<string, number> = {};
    campaigns.forEach((campaign) => {
      campaign.assets.forEach((asset) => {
        if (asset.exportCount > 0) {
          contentTypeExports[asset.type] = (contentTypeExports[asset.type] || 0) + asset.exportCount;
        }
      });
    });

    const mostExportedContentTypes = Object.entries(contentTypeExports)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count }));

    // Get template usage statistics
    const templateUsage: Record<string, { name: string; count: number }> = {};
    campaigns.forEach((campaign) => {
      if (campaign.template) {
        const key = campaign.template.id.toString();
        if (!templateUsage[key]) {
          templateUsage[key] = {
            name: campaign.template.name,
            count: 0,
          };
        }
        templateUsage[key]!.count++;
      }
    });

    const mostUsedTemplates = Object.values(templateUsage)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      totalViews,
      totalExports,
      mostViewedCampaigns,
      mostExportedContentTypes,
      mostUsedTemplates,
    };
  });
