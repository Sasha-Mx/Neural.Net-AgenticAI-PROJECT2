import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";
import { minioClient, minioBaseUrl } from "~/server/minio";
import { generateOpenSourceImage, buildOpenSourceImagePrompt, type ImageModel } from "~/server/utils/image-generation";

// Helper function to build detailed, brand-aware image prompts
function buildBrandedImagePrompt(
  baseContext: string,
  brief: any,
  tagline: string,
  description: string
): string {
  const parts: string[] = [baseContext];

  if (brief.imageryPreference) {
    const imageryStyles: Record<string, string> = {
      photography: "photorealistic, high-quality photography style",
      illustration: "digital illustration style, artistic",
      abstract: "abstract and conceptual art style",
      geometric: "geometric patterns and shapes, structured design",
      mixed: "mixed media approach, creative fusion",
      "3d": "3D rendered, modern CGI style",
    };
    parts.push(imageryStyles[brief.imageryPreference] || brief.imageryPreference);
  }

  if (brief.visualStyle) {
    const visualDescriptors: Record<string, string> = {
      minimalist: "minimalist design, clean lines, simple composition",
      vibrant: "vibrant and energetic, bold colors, dynamic",
      corporate: "professional and polished, business-appropriate",
      artistic: "artistic and creative, expressive, unique perspective",
      modern: "modern and contemporary, sleek design",
      vintage: "vintage aesthetic, retro inspired, nostalgic feel",
      luxurious: "luxurious and premium, high-end, sophisticated",
      organic: "organic and natural, earthy, authentic",
    };
    parts.push(visualDescriptors[brief.visualStyle] || brief.visualStyle);
  }

  const colors: string[] = [];
  if (brief.brandColorPrimary) {
    colors.push(brief.brandColorPrimary);
  }
  if (brief.brandColorSecondary) {
    colors.push(brief.brandColorSecondary);
  }
  if (colors.length > 0) {
    parts.push(`color palette featuring ${colors.join(" and ")}`);
  }

  if (brief.brandThemes) {
    parts.push(`incorporating visual elements: ${brief.brandThemes}`);
  }

  parts.push(`${brief.tone} tone`);
  parts.push(`designed to appeal to ${brief.audience}`);

  return parts.join(", ") + ". Professional marketing quality, high resolution, visually striking.";
}

export const regenerateImage = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      assetId: z.number(),
      customPrompt: z.string().optional(),
      model: z.enum([
        "sdxl",
        "stable-diffusion-2-1",
        "stable-diffusion-1-5",
        "kandinsky-2-2",
        "playground-v2",
        "flux-schnell",
      ]).optional(),
      // Advanced options for power users
      negativePrompt: z.string().optional(),
      guidanceScale: z.number().min(1).max(20).optional(),
      numInferenceSteps: z.number().min(1).max(150).optional(),
    })
  )
  .mutation(async ({ input }) => {
    /**
     * IMAGE REGENERATION WORKFLOW
     * 
     * 1. Authenticate user and verify asset ownership
     * 2. Build image prompt from campaign brief and user input
     * 3. Generate image using selected model (HuggingFace or Replicate)
     * 4. Upload generated image to MinIO storage
     * 5. Update asset record with new image URL and metadata
     * 6. Return success with image details
     * 
     * Error handling:
     * - All errors are caught and returned with user-friendly messages
     * - Timeouts, empty responses, and API failures are handled gracefully
     * - Users are given actionable suggestions (try different model, etc.)
     */
    
    // Step 1: Verify token and authenticate user
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

    // Find the asset and verify ownership
    const asset = await db.asset.findUnique({
      where: { id: input.assetId },
      include: {
        campaign: {
          include: {
            assets: {
              where: { type: "text" },
              take: 1,
            },
          },
        },
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

    if (asset.type !== "image") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Can only regenerate image assets.",
      });
    }

    // Step 2: Build the prompt
    const brief = asset.campaign.brief as any;
    const textAsset = asset.campaign.assets[0];
    const textContent = textAsset ? JSON.parse(textAsset.content || "{}") : {};
    const tagline = textContent.tagline || "";
    const description = textContent.description || "";

    // Use custom prompt if provided, otherwise build from campaign context
    const prompt = input.customPrompt || buildOpenSourceImagePrompt(
      `Marketing visual for campaign: "${tagline}"`,
      brief,
      tagline,
      description
    );

    // Validate prompt
    if (!prompt || prompt.trim().length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Image prompt cannot be empty. Please provide a description or use the campaign context.",
      });
    }

    // Determine which model to use
    const modelToUse: ImageModel = input.model || (brief.imageModel as ImageModel) || "sdxl";

    console.log(`Regenerating image for campaign ${asset.campaignId} with model ${modelToUse}`);

    // Step 3: Generate new image using open-source model
    let imageResult: Awaited<ReturnType<typeof generateOpenSourceImage>>;
    try {
      imageResult = await generateOpenSourceImage({
        model: modelToUse,
        prompt: prompt,
        negativePrompt: input.negativePrompt,
        guidanceScale: input.guidanceScale,
        numInferenceSteps: input.numInferenceSteps,
      });
      
      // Validate result
      if (!imageResult || !imageResult.base64) {
        throw new Error("No image data received from generation service.");
      }
    } catch (error: any) {
      console.error("Image generation failed:", {
        error: error.message,
        model: modelToUse,
        campaignId: asset.campaignId,
        assetId: input.assetId,
      });
      
      // Pass through the user-friendly error message from generateOpenSourceImage
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Failed to generate image. Please try again or select a different model.",
        cause: error,
      });
    }

    // Step 4: Convert base64 to buffer and upload to MinIO
    let imageUrl: string;
    try {
      const imageBuffer = Buffer.from(imageResult.base64, "base64");
      
      // Validate buffer
      if (!imageBuffer || imageBuffer.length === 0) {
        throw new Error("Invalid image data received.");
      }

      const fileName = `public/campaign-${asset.campaignId}-image-regenerated-${Date.now()}.png`;
      
      await minioClient.putObject(
        "campaign-assets",
        fileName,
        imageBuffer,
        imageBuffer.length,
        {
          "Content-Type": "image/png",
        }
      );

      // Construct public URL
      imageUrl = `${minioBaseUrl}/campaign-assets/${fileName}`;
      
      console.log(`Image uploaded successfully: ${imageUrl}`);
    } catch (error: any) {
      console.error("Failed to upload image to storage:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to save generated image. Please try again.",
        cause: error,
      });
    }

    // Step 5: Update the asset with the new image URL and model info
    try {
      await db.asset.update({
        where: { id: input.assetId },
        data: { 
          url: imageUrl,
          content: JSON.stringify({
            model: imageResult.model,
            provider: imageResult.provider,
            prompt: prompt,
            generatedAt: new Date().toISOString(),
          }),
        },
      });
      
      console.log(`Asset ${input.assetId} updated with new image`);
    } catch (error: any) {
      console.error("Failed to update asset record:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Image generated but failed to save. Please refresh and try again.",
        cause: error,
      });
    }

    // Step 6: Return success with image details
    return { 
      url: imageUrl,
      model: imageResult.model,
      provider: imageResult.provider,
    };
  });
