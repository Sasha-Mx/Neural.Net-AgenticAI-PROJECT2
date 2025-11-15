import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const deleteCampaignTemplate = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      templateId: z.number(),
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

    // Find template and verify ownership
    const template = await db.campaignTemplate.findUnique({
      where: { id: input.templateId },
    });

    if (!template) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Template not found",
      });
    }

    // Check if user owns the template (system templates cannot be deleted)
    if (template.isDefault || template.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to delete this template",
      });
    }

    // Delete template
    await db.campaignTemplate.delete({
      where: { id: input.templateId },
    });

    return { success: true };
  });
