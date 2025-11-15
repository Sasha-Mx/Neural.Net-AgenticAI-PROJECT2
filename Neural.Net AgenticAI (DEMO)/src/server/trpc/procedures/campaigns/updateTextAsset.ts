import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const updateTextAsset = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      assetId: z.number(),
      content: z.record(z.any()), // flexible object for text content like { tagline: "..." }
    })
  )
  .mutation(async ({ input }) => {
    /**
     * TEXT ASSET UPDATE WORKFLOW
     * 
     * 1. Authenticate user
     * 2. Verify asset exists and user has access
     * 3. Validate asset type is text-based
     * 4. Validate content is not empty
     * 5. Update asset in database
     * 6. Return success
     * 
     * This endpoint is used when users manually edit text content in the workspace.
     * It updates the asset's content field with the new user-provided content.
     */
    
    // Verify token
    let userId: number;
    try {
      const verified = jwt.verify(input.authToken, env.JWT_SECRET);
      const parsed = z.object({ userId: z.number() }).parse(verified);
      userId = parsed.userId;
    } catch (error) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid or expired token. Please log in again.",
      });
    }

    // Validate content is not empty
    if (!input.content || Object.keys(input.content).length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Content cannot be empty.",
      });
    }

    // Find the asset and verify ownership
    const asset = await db.asset.findUnique({
      where: { id: input.assetId },
      include: {
        campaign: true,
      },
    });

    if (!asset) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Asset not found. Please refresh the page and try again.",
      });
    }

    if (asset.campaign.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this asset.",
      });
    }

    if (!["text", "social_media_post", "ad_copy", "email_subject_lines"].includes(asset.type)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Can only update text-based assets.",
      });
    }

    // Get existing content to merge with updates
    const existingContent = (asset.content || {}) as any;
    
    // Merge new content with existing content to preserve fields that weren't updated
    const updatedContent = {
      ...existingContent,
      ...input.content,
    };

    // Update the asset with merged content
    try {
      await db.asset.update({
        where: { id: input.assetId },
        data: { content: updatedContent },
      });
      
      console.log(`Asset ${input.assetId} (${asset.type}) updated successfully`);
    } catch (error: any) {
      console.error(`Failed to update asset ${input.assetId}:`, error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save changes. Please try again.",
        cause: error,
      });
    }

    return { success: true };
  });
