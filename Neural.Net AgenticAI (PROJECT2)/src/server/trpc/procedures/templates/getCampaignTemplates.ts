import { z } from "zod";
import jwt from "jsonwebtoken";
import { env } from "~/server/env";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";

export const getCampaignTemplates = baseProcedure
  .input(
    z.object({
      authToken: z.string().optional(),
    })
  )
  .query(async ({ input }) => {
    let userId: number | null = null;

    // Verify token if provided
    if (input.authToken) {
      try {
        const verified = jwt.verify(input.authToken, env.JWT_SECRET);
        const parsed = z.object({ userId: z.number() }).parse(verified);
        userId = parsed.userId;
      } catch (error) {
        // If token is invalid, just ignore it and return only default templates
        userId = null;
      }
    }

    // Fetch templates - either all defaults, or defaults + user's custom templates
    const templates = await db.campaignTemplate.findMany({
      where: userId
        ? {
            OR: [
              { isDefault: true },
              { userId: userId },
            ],
          }
        : { isDefault: true },
      orderBy: [
        { isDefault: "desc" },
        { name: "asc" },
      ],
    });

    return templates.map((template) => ({
      id: template.id,
      userId: template.userId,
      name: template.name,
      description: template.description,
      category: template.category,
      defaultGoal: template.defaultGoal,
      defaultTone: template.defaultTone,
      defaultAudience: template.defaultAudience,
      defaultKeywords: template.defaultKeywords,
      promptInstructions: template.promptInstructions,
      isDefault: template.isDefault,
    }));
  });
