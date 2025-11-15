import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const updateCampaignTemplate = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      templateId: z.number(),
      name: z.string().min(1, "Template name is required"),
      description: z.string().min(1, "Description is required"),
      category: z.string().min(1, "Category is required"),
      defaultGoal: z.string().min(1, "Default goal is required"),
      defaultTone: z.string().min(1, "Default tone is required"),
      defaultAudience: z.string().min(1, "Default audience is required"),
      defaultKeywords: z.string().optional(),
      promptInstructions: z.string().min(1, "Prompt instructions are required"),
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

    // Check if user owns the template (system templates cannot be edited)
    if (template.isDefault || template.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to edit this template",
      });
    }

    // Update template
    const updated = await db.campaignTemplate.update({
      where: { id: input.templateId },
      data: {
        name: input.name,
        description: input.description,
        category: input.category,
        defaultGoal: input.defaultGoal,
        defaultTone: input.defaultTone,
        defaultAudience: input.defaultAudience,
        defaultKeywords: input.defaultKeywords,
        promptInstructions: input.promptInstructions,
      },
    });

    return updated;
  });
