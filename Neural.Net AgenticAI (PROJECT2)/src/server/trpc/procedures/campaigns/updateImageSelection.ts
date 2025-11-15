import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const updateImageSelection = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      assetId: z.number(),
      isSelected: z.boolean(),
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

    // Find the asset and verify ownership
    const asset = await db.asset.findUnique({
      where: { id: input.assetId },
      include: { campaign: true },
    });

    if (!asset) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Asset not found",
      });
    }

    if (asset.campaign.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this asset",
      });
    }

    // Update the selection status
    await db.asset.update({
      where: { id: input.assetId },
      data: { isSelected: input.isSelected },
    });

    return { success: true };
  });
