import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const getImageHistory = baseProcedure
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

    // Find the campaign and verify ownership
    const campaign = await db.campaign.findUnique({
      where: { id: input.campaignId },
    });

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      });
    }

    if (campaign.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this campaign",
      });
    }

    // Fetch all image assets for this campaign, ordered by creation date (newest first)
    const imageAssets = await db.asset.findMany({
      where: {
        campaignId: input.campaignId,
        type: "image",
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Parse and format the image history
    const history = imageAssets.map((asset) => {
      // Prisma's Json type returns already-parsed objects, so no need to JSON.parse
      const content = (asset.content || {}) as any;

      return {
        id: asset.id,
        url: asset.url || "",
        model: content.model || "sdxl",
        provider: content.provider || "huggingface",
        prompt: content.prompt || "",
        generatedAt: content.generatedAt || asset.createdAt.toISOString(),
        isSelected: asset.isSelected,
      };
    });

    return history;
  });
