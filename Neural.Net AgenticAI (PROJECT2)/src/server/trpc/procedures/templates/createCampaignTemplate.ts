import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const createCampaignTemplate = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
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

    // Create template
    const template = await db.campaignTemplate.create({
      data: {
        userId,
        name: input.name,
        description: input.description,
        category: input.category,
        defaultGoal: input.defaultGoal,
        defaultTone: input.defaultTone,
        defaultAudience: input.defaultAudience,
        defaultKeywords: input.defaultKeywords,
        promptInstructions: input.promptInstructions,
        isDefault: false, // User-created templates are never default
      },
    });

    return template;
  });
