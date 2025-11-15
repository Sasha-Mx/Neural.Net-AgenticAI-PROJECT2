import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { runCampaignWorkflow } from "~/server/workflows/campaign-workflow";

export const createCampaign = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      name: z.string().min(1, "Campaign name is required"),
      goal: z.string().min(1, "Goal is required"),
      tone: z.string().min(1, "Tone is required"),
      audience: z.string().min(1, "Target audience is required"),
      keywords: z.string().optional(),
      // New branding fields for enhanced image generation
      brandColorPrimary: z.string().optional(),
      brandColorSecondary: z.string().optional(),
      visualStyle: z.string().optional(),
      imageryPreference: z.string().optional(),
      brandThemes: z.string().optional(),
      templateId: z.number().optional(),
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

    // Fetch template if provided
    let template = null;
    if (input.templateId) {
      template = await db.campaignTemplate.findUnique({
        where: { id: input.templateId },
      });
    }

    // Create campaign
    const campaign = await db.campaign.create({
      data: {
        userId,
        name: input.name,
        templateId: input.templateId,
        brief: {
          goal: input.goal,
          tone: input.tone,
          audience: input.audience,
          keywords: input.keywords || "",
          // Include branding information for better image generation
          brandColorPrimary: input.brandColorPrimary || "",
          brandColorSecondary: input.brandColorSecondary || "",
          visualStyle: input.visualStyle || "",
          imageryPreference: input.imageryPreference || "",
          brandThemes: input.brandThemes || "",
          // Include template instructions if available
          templateInstructions: template?.promptInstructions || "",
        },
        status: "generating",
      },
    });

    // Start workflow asynchronously (don't await)
    void runCampaignWorkflow(campaign.id);

    return {
      id: campaign.id,
      name: campaign.name,
      status: campaign.status,
    };
  });
