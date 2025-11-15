import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

const taglineSchema = z.object({
  tagline: z.string().describe("A catchy, memorable tagline for the campaign"),
});

const socialMediaSchema = z.object({
  socialMediaPosts: z.object({
    twitter: z.string().max(280).describe("Twitter/X post (max 280 characters)"),
    linkedin: z.string().describe("LinkedIn post (professional tone, can be longer)"),
    instagram: z.string().describe("Instagram caption (engaging, can include emojis)"),
    facebook: z.string().describe("Facebook post (conversational and engaging)"),
  }).describe("Social media posts optimized for each platform"),
});

const adCopySchema = z.object({
  adCopy: z.object({
    headline: z.string().max(60).describe("Short, attention-grabbing headline for ads"),
    bodyShort: z.string().max(150).describe("Short ad body text (150 chars max)"),
    bodyLong: z.string().max(300).describe("Longer ad body text for display ads"),
    cta: z.string().max(20).describe("Call-to-action text (e.g., 'Shop Now', 'Learn More')"),
  }).describe("Ad copy variations for different ad formats"),
});

export const regenerateTextContent = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      assetId: z.number(),
      contentType: z.enum(["tagline", "social", "adCopy"]),
      preferences: z.object({
        feedback: z.string().optional().describe("User feedback on what to improve or change"),
        tone: z.string().optional().describe("Desired tone (e.g., 'more casual', 'more professional')"),
        length: z.string().optional().describe("Length preference (e.g., 'shorter', 'longer', 'more concise')"),
        tags: z.array(z.string()).optional().describe("Style tags (e.g., 'SEO', 'punchy', 'emotional')"),
        customInstructions: z.string().optional().describe("Any other specific instructions"),
      }).optional(),
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
      include: {
        campaign: {
          include: {
            assets: true,
          },
        },
      },
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

    // Verify asset type matches content type
    const validAssetTypes: Record<string, string[]> = {
      tagline: ["text"],
      social: ["social_media_post"],
      adCopy: ["ad_copy"],
    };

    if (!validAssetTypes[input.contentType]?.includes(asset.type)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Cannot regenerate ${input.contentType} for asset type ${asset.type}`,
      });
    }

    const brief = asset.campaign.brief as any;
    const existingContent = asset.content as any;
    const preferences = input.preferences || {};

    // Build the tailored prompt
    const baseBriefContext = `
Goal: ${brief.goal}
Tone: ${brief.tone}
Target Audience: ${brief.audience}
${brief.keywords ? `Keywords: ${brief.keywords}` : ""}
${brief.brandThemes ? `Brand Themes: ${brief.brandThemes}` : ""}
${brief.templateInstructions ? `Template Guidelines: ${brief.templateInstructions}` : ""}
`;

    const previousContentContext = existingContent
      ? `\n\nPrevious version for reference:\n${JSON.stringify(existingContent, null, 2)}`
      : "";

    const userFeedbackContext = preferences.feedback
      ? `\n\nUser Feedback: ${preferences.feedback}`
      : "";

    const toneAdjustment = preferences.tone
      ? `\n\nTone Adjustment: ${preferences.tone}`
      : "";

    const lengthPreference = preferences.length
      ? `\n\nLength Preference: ${preferences.length}`
      : "";

    const tagsContext = preferences.tags && preferences.tags.length > 0
      ? `\n\nStyle Tags: ${preferences.tags.join(", ")}`
      : "";

    const customInstructionsContext = preferences.customInstructions
      ? `\n\nAdditional Instructions: ${preferences.customInstructions}`
      : "";

    let prompt: string;
    let schema: any;
    let resultKey: string;

    /**
     * TEXT CONTENT REGENERATION WORKFLOW
     * 
     * 1. Authenticate user and verify asset ownership
     * 2. Build tailored prompt based on user preferences and feedback
     * 3. Generate new content using AI (OpenRouter GPT-4)
     * 4. Validate generated content is not empty
     * 5. Update asset record with new content
     * 6. Create workflow log for traceability
     * 7. Return success with new content
     * 
     * Error handling:
     * - All errors are caught and returned with user-friendly messages
     * - AI generation failures are handled gracefully
     * - Empty/invalid responses are detected and reported
     */

    const startTime = Date.now();

    if (input.contentType === "tagline") {
      schema = taglineSchema;
      resultKey = "tagline";
      prompt = `Regenerate a tagline for a marketing campaign with the following brief:

${baseBriefContext}${previousContentContext}${userFeedbackContext}${toneAdjustment}${lengthPreference}${tagsContext}${customInstructionsContext}

Create a fresh, compelling tagline that:
- Directly implements the user's feedback and preferences
- Maintains alignment with the campaign goal and target audience
- Uses the specified tone${preferences.tone ? ` (${preferences.tone})` : ` (${brief.tone})`}
${preferences.length ? `- Follows the length preference: ${preferences.length}` : ""}
${preferences.tags && preferences.tags.length > 0 ? `- Incorporates these style elements: ${preferences.tags.join(", ")}` : ""}

Output ONLY the new tagline, tailored exactly as specified.`;
    } else if (input.contentType === "social") {
      schema = socialMediaSchema;
      resultKey = "socialMediaPosts";
      prompt = `Regenerate social media posts for a marketing campaign with the following brief:

${baseBriefContext}${previousContentContext}${userFeedbackContext}${toneAdjustment}${lengthPreference}${tagsContext}${customInstructionsContext}

Create fresh social media posts for Twitter/X (max 280 characters), LinkedIn (professional), Instagram (engaging with emojis), and Facebook (conversational) that:
- Directly implement the user's feedback and preferences
- Are optimized for each platform's unique style and audience
- Maintain alignment with the campaign goal and target audience
- Use the specified tone${preferences.tone ? ` (${preferences.tone})` : ` (${brief.tone})`}
${preferences.length ? `- Follow the length preference: ${preferences.length}` : ""}
${preferences.tags && preferences.tags.length > 0 ? `- Incorporate these style elements: ${preferences.tags.join(", ")}` : ""}

Output fresh, platform-optimized content tailored exactly as specified.`;
    } else {
      // adCopy
      schema = adCopySchema;
      resultKey = "adCopy";
      prompt = `Regenerate ad copy for a marketing campaign with the following brief:

${baseBriefContext}${previousContentContext}${userFeedbackContext}${toneAdjustment}${lengthPreference}${tagsContext}${customInstructionsContext}

Create fresh ad copy including headline (max 60 chars), short body (max 150 chars), long body (max 300 chars), and CTA (max 20 chars) that:
- Directly implements the user's feedback and preferences
- Is attention-grabbing and conversion-focused
- Maintains alignment with the campaign goal and target audience
- Uses the specified tone${preferences.tone ? ` (${preferences.tone})` : ` (${brief.tone})`}
${preferences.length ? `- Follows the length preference: ${preferences.length}` : ""}
${preferences.tags && preferences.tags.length > 0 ? `- Incorporates these style elements: ${preferences.tags.join(", ")}` : ""}

Output fresh ad copy variations tailored exactly as specified.`;
    }

    // Generate new content using AI
    let generatedContent: any;
    try {
      console.log(`Regenerating ${input.contentType} for asset ${input.assetId}`);
      
      const result = await generateObject({
        model: openrouter("openai/gpt-4o"),
        schema: schema,
        prompt: prompt,
      });
      
      generatedContent = result.object;
      
      // Validate that content was generated
      if (!generatedContent || !generatedContent[resultKey]) {
        throw new Error(`AI returned empty ${input.contentType} content.`);
      }
      
      // Additional validation based on content type
      if (input.contentType === "tagline") {
        if (!generatedContent.tagline || generatedContent.tagline.trim().length === 0) {
          throw new Error("Generated tagline is empty.");
        }
      } else if (input.contentType === "social") {
        const posts = generatedContent.socialMediaPosts;
        if (!posts || !posts.twitter || !posts.linkedin || !posts.instagram || !posts.facebook) {
          throw new Error("Generated social media posts are incomplete.");
        }
      } else if (input.contentType === "adCopy") {
        const copy = generatedContent.adCopy;
        if (!copy || !copy.headline || !copy.bodyShort || !copy.bodyLong || !copy.cta) {
          throw new Error("Generated ad copy is incomplete.");
        }
      }
      
      console.log(`Successfully generated ${input.contentType} content`);
    } catch (error: any) {
      console.error(`AI generation failed for ${input.contentType}:`, {
        error: error.message,
        assetId: input.assetId,
        contentType: input.contentType,
      });
      
      // Provide user-friendly error message
      let userMessage = `Failed to regenerate ${input.contentType}. `;
      
      if (error.message?.includes("timeout") || error.message?.includes("timed out")) {
        userMessage += "The AI service timed out. Please try again.";
      } else if (error.message?.includes("rate limit")) {
        userMessage += "Rate limit exceeded. Please wait a moment and try again.";
      } else if (error.message?.includes("empty") || error.message?.includes("incomplete")) {
        userMessage += "The AI returned incomplete content. Please try again.";
      } else {
        userMessage += "Please try again or adjust your preferences.";
      }
      
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: userMessage,
        cause: error,
      });
    }

    const newContent = generatedContent[resultKey];
    const duration = Date.now() - startTime;

    // Update the asset with new content, preserving existing fields
    let updatedContent: any;
    if (input.contentType === "tagline") {
      // For tagline, merge with existing content to preserve description
      const existingAssetContent = (existingContent || {}) as any;
      updatedContent = {
        ...existingAssetContent,
        tagline: newContent,
      };
    } else {
      // For social and adCopy, replace the entire content
      updatedContent = newContent;
    }

    try {
      await db.asset.update({
        where: { id: input.assetId },
        data: { content: updatedContent },
      });
      
      console.log(`Asset ${input.assetId} updated with new ${input.contentType} content`);
    } catch (error: any) {
      console.error(`Failed to update asset ${input.assetId}:`, error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Content generated but failed to save. Please try again.",
        cause: error,
      });
    }

    // Create workflow log for traceability
    try {
      await db.workflowLog.create({
        data: {
          campaignId: asset.campaignId,
          agentName: "WriterAgent-Regenerate",
          status: "completed",
          durationMs: duration,
          inputPayload: {
            contentType: input.contentType,
            preferences: preferences,
            previousContent: existingContent,
          },
          outputPayload: generatedContent,
          outputSummary: `Regenerated ${input.contentType} content${preferences.feedback ? ` based on feedback: "${preferences.feedback}"` : ""}${preferences.tone ? ` with ${preferences.tone} tone` : ""}${preferences.tags && preferences.tags.length > 0 ? ` incorporating ${preferences.tags.join(", ")}` : ""}.`,
        },
      });
    } catch (error: any) {
      // Log error but don't fail the request if workflow log creation fails
      console.error("Failed to create workflow log:", error);
    }

    return {
      content: updatedContent,
      contentType: input.contentType,
    };
  });
