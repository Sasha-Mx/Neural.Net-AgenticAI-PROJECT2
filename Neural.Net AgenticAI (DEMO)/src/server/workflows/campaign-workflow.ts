import { EventEmitter } from "events";
import { generateObject } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { db } from "~/server/db";
import { minioClient, minioBaseUrl } from "~/server/minio";
import { env } from "~/server/env";
import { generateOpenSourceImage, buildOpenSourceImagePrompt, type ImageModel } from "~/server/utils/image-generation";

export const campaignProgressEmitter = new EventEmitter();

// Initialize OpenRouter with API key from environment
const openrouter = createOpenRouter({
  apiKey: env.OPENROUTER_API_KEY,
});

async function emitProgress(campaignId: number, data: any) {
  campaignProgressEmitter.emit(`campaign-${campaignId}`, data);
}

export async function runCampaignWorkflow(campaignId: number) {
  try {
    const campaign = await db.campaign.findUnique({
      where: { id: campaignId },
    });

    if (!campaign) {
      return;
    }

    const brief = campaign.brief as any;
    const startTime = Date.now();

    // Step 1: Writer Agent - Generate copy
    await emitProgress(campaignId, {
      type: "agent_start",
      agent: "WriterAgent",
      message: "Analyzing your brief and crafting compelling copy...",
    });

    const writerStartTime = Date.now();

    const writerSchema = z.object({
      tagline: z.string().describe("A catchy, memorable tagline for the campaign"),
      description: z.string().describe("A compelling description that elaborates on the campaign message"),
      socialMediaPosts: z.object({
        twitter: z.string().max(280).describe("Twitter/X post (max 280 characters)"),
        linkedin: z.string().describe("LinkedIn post (professional tone, can be longer)"),
        instagram: z.string().describe("Instagram caption (engaging, can include emojis)"),
        facebook: z.string().describe("Facebook post (conversational and engaging)"),
      }).describe("Social media posts optimized for each platform"),
      adCopy: z.object({
        headline: z.string().max(60).describe("Short, attention-grabbing headline for ads"),
        bodyShort: z.string().max(150).describe("Short ad body text (150 chars max)"),
        bodyLong: z.string().max(300).describe("Longer ad body text for display ads"),
        cta: z.string().max(20).describe("Call-to-action text (e.g., 'Shop Now', 'Learn More')"),
      }).describe("Ad copy variations for different ad formats"),
      emailSubjectLines: z.array(z.string()).length(3).describe("Three alternative email subject lines"),
    });

    const { object: writerOutput } = await generateObject({
      model: openrouter("openai/gpt-4o"),
      schema: writerSchema,
      prompt: `Create comprehensive marketing content for a campaign with the following brief:
      
Goal: ${brief.goal}
Tone: ${brief.tone}
Target Audience: ${brief.audience}
${brief.keywords ? `Keywords: ${brief.keywords}` : ""}
${brief.templateInstructions ? `\nTemplate Guidelines: ${brief.templateInstructions}` : ""}

Generate:
1. A catchy tagline and compelling campaign description
2. Social media posts optimized for Twitter/X (280 chars max), LinkedIn (professional), Instagram (engaging with emojis), and Facebook (conversational)
3. Ad copy including a headline (60 chars max), short body (150 chars), long body (300 chars), and CTA (20 chars)
4. Three alternative email subject lines

All content should align with the ${brief.tone} tone and appeal to ${brief.audience}.${brief.templateInstructions ? ` Follow these specific guidelines: ${brief.templateInstructions}` : ""}`,
    });

    const tagline = writerOutput.tagline;
    const description = writerOutput.description;
    const socialMediaPosts = writerOutput.socialMediaPosts;
    const adCopy = writerOutput.adCopy;
    const emailSubjectLines = writerOutput.emailSubjectLines;
    const writerDuration = Date.now() - writerStartTime;

    // Update campaign brief with generated content
    await db.campaign.update({
      where: { id: campaignId },
      data: {
        brief: {
          ...brief,
          tagline,
          description,
        },
      },
    });

    await db.workflowLog.create({
      data: {
        campaignId,
        agentName: "WriterAgent",
        status: "completed",
        durationMs: writerDuration,
        inputPayload: { brief },
        outputPayload: { tagline, description, socialMediaPosts, adCopy, emailSubjectLines },
        outputSummary: `Generated tagline: "${tagline}", campaign description, social media posts for 4 platforms, ad copy variations, and 3 email subject lines based on ${brief.tone} tone for ${brief.audience} audience.`,
      },
    });

    await db.asset.create({
      data: {
        campaignId,
        type: "text",
        content: { tagline, description },
      },
    });

    await db.asset.create({
      data: {
        campaignId,
        type: "social_media_post",
        content: socialMediaPosts,
      },
    });

    await db.asset.create({
      data: {
        campaignId,
        type: "ad_copy",
        content: adCopy,
      },
    });

    await db.asset.create({
      data: {
        campaignId,
        type: "email_subject_lines",
        content: { subjectLines: emailSubjectLines },
      },
    });

    await emitProgress(campaignId, {
      type: "agent_complete",
      agent: "WriterAgent",
      output: { 
        tagline, 
        description, 
        socialMediaPosts,
        adCopy,
        emailSubjectLines,
      },
    });

    // Step 2: Brand Checker Agent - Validate brand consistency
    await emitProgress(campaignId, {
      type: "agent_start",
      agent: "BrandCheckerAgent",
      message: "Validating brand consistency and tone alignment...",
    });

    const brandCheckerStartTime = Date.now();

    const brandCheckerSchema = z.object({
      validation: z.enum(["passed", "failed", "warning"]).describe("Overall validation status"),
      score: z.number().min(0).max(100).describe("Brand consistency score from 0-100"),
      feedback: z.string().describe("Detailed feedback on brand alignment"),
    });

    const { object: brandCheckerOutput } = await generateObject({
      model: openrouter("openai/gpt-4o"),
      schema: brandCheckerSchema,
      prompt: `Review the following marketing copy for brand consistency:

Tagline: ${tagline}
Description: ${description}

Campaign Brief:
- Goal: ${brief.goal}
- Tone: ${brief.tone}
- Target Audience: ${brief.audience}

Evaluate whether the copy aligns with the specified tone and brand requirements. Provide a validation status (passed/failed/warning), a score (0-100), and detailed feedback.`,
    });

    const brandCheckerDuration = Date.now() - brandCheckerStartTime;

    await db.workflowLog.create({
      data: {
        campaignId,
        agentName: "BrandCheckerAgent",
        status: "completed",
        durationMs: brandCheckerDuration,
        inputPayload: { tagline, description, brief },
        outputPayload: brandCheckerOutput,
        outputSummary: `${brandCheckerOutput.validation === "passed" ? "✓" : brandCheckerOutput.validation === "warning" ? "⚠" : "✗"} Brand consistency check ${brandCheckerOutput.validation} with ${brandCheckerOutput.score}% alignment. ${brandCheckerOutput.feedback}`,
      },
    });

    await emitProgress(campaignId, {
      type: "agent_complete",
      agent: "BrandCheckerAgent",
      output: { validation: brandCheckerOutput.validation, score: brandCheckerOutput.score },
    });

    // Step 3: Legal Agent - Review for compliance
    await emitProgress(campaignId, {
      type: "agent_start",
      agent: "LegalAgent",
      message: "Reviewing content for legal compliance...",
    });

    const legalStartTime = Date.now();

    const legalSchema = z.object({
      approved: z.boolean().describe("Whether the content is approved for use"),
      issues: z.array(z.string()).describe("List of any legal issues or concerns found"),
      recommendations: z.string().describe("Recommendations for improving legal compliance if needed"),
    });

    const { object: legalOutput } = await generateObject({
      model: openrouter("openai/gpt-4o"),
      schema: legalSchema,
      prompt: `Review the following marketing content for legal compliance and potential issues:

Tagline: ${tagline}
Description: ${description}

Check for:
- False or misleading claims
- Trademark or copyright concerns
- Regulatory compliance issues
- Inappropriate or offensive language
- Any other legal red flags

Provide an approval status, list any issues found, and give recommendations.`,
    });

    const legalDuration = Date.now() - legalStartTime;

    await db.workflowLog.create({
      data: {
        campaignId,
        agentName: "LegalAgent",
        status: "completed",
        durationMs: legalDuration,
        inputPayload: { tagline, description },
        outputPayload: legalOutput,
        outputSummary: legalOutput.approved 
          ? "✓ No legal issues detected. Content approved for use."
          : `✗ Legal issues found: ${legalOutput.issues.join(", ")}. ${legalOutput.recommendations}`,
      },
    });

    await emitProgress(campaignId, {
      type: "agent_complete",
      agent: "LegalAgent",
      output: { approved: legalOutput.approved, issueCount: legalOutput.issues.length },
    });

    // Step 4: Designer Agent - Generate visuals
    await emitProgress(campaignId, {
      type: "agent_start",
      agent: "DesignerAgent",
      message: "Creating stunning visuals for your campaign...",
    });

    const designerStartTime = Date.now();
    const imageCount = 3;
    const generatedImages: string[] = [];

    // Get the preferred image model from campaign brief (defaults to SDXL)
    const imageModel: ImageModel = (brief.imageModel as ImageModel) || "sdxl";

    // Generate image prompts based on the campaign with brand-specific details
    const imagePrompts = [
      buildOpenSourceImagePrompt(
        `Hero image for campaign: "${tagline}"`,
        brief,
        tagline,
        description
      ),
      buildOpenSourceImagePrompt(
        `Marketing visual representing: ${description.substring(0, 100)}`,
        brief,
        tagline,
        description
      ),
      buildOpenSourceImagePrompt(
        `Campaign concept image embodying the goal: ${brief.goal.substring(0, 80)}`,
        brief,
        tagline,
        description
      ),
    ];

    for (let i = 0; i < imageCount; i++) {
      try {
        // Generate image using open-source model
        const imageResult = await generateOpenSourceImage({
          model: imageModel,
          prompt: imagePrompts[i]!,
        });

        // Convert base64 to buffer
        const imageBuffer = Buffer.from(imageResult.base64, "base64");

        // Upload to MinIO
        const fileName = `public/campaign-${campaignId}-image-${i + 1}-${Date.now()}.png`;
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
        const imageUrl = `${minioBaseUrl}/campaign-assets/${fileName}`;
        generatedImages.push(imageUrl);

        // Create asset record with model info
        await db.asset.create({
          data: {
            campaignId,
            type: "image",
            url: imageUrl,
            content: {
              model: imageResult.model,
              provider: imageResult.provider,
              prompt: imagePrompts[i],
              generatedAt: new Date().toISOString(),
            },
          },
        });

        await emitProgress(campaignId, {
          type: "image_generated",
          agent: "DesignerAgent",
          imageUrl: imageUrl,
          index: i + 1,
          total: imageCount,
        });
      } catch (error) {
        console.error(`Error generating image ${i + 1} with ${imageModel}:`, error);
        // Continue with other images even if one fails
        // This provides graceful degradation - user gets some images even if not all succeed
      }
    }

    const designerDuration = Date.now() - designerStartTime;

    await db.workflowLog.create({
      data: {
        campaignId,
        agentName: "DesignerAgent",
        status: "completed",
        durationMs: designerDuration,
        inputPayload: { tagline, description, brief, imagePrompts, imageModel },
        outputPayload: { imageCount: generatedImages.length, imageUrls: generatedImages },
        outputSummary: `Generated ${generatedImages.length} brand-aligned AI visuals using ${imageModel} (${brief.visualStyle || "custom"} style, ${brief.imageryPreference || "varied"} imagery${brief.brandColorPrimary ? `, featuring ${brief.brandColorPrimary}` : ""}), matching campaign messaging and ${brief.tone} aesthetic.`,
      },
    });

    await emitProgress(campaignId, {
      type: "agent_complete",
      agent: "DesignerAgent",
      output: { imageCount: generatedImages.length, model: imageModel },
    });

    // Step 5: Email Agent - Generate branded email templates
    await emitProgress(campaignId, {
      type: "agent_start",
      agent: "EmailAgent",
      message: "Creating branded email templates...",
    });

    const emailStartTime = Date.now();

    const emailSchema = z.object({
      subject: z.string().describe("Compelling email subject line"),
      preheader: z.string().describe("Email preheader text (preview text)"),
      headline: z.string().describe("Main headline for the email"),
      bodyContent: z.string().describe("Main body content of the email"),
      ctaText: z.string().describe("Call-to-action button text"),
      ctaUrl: z.string().describe("Placeholder URL for the CTA button"),
    });

    const { object: emailContent } = await generateObject({
      model: openrouter("openai/gpt-4o"),
      schema: emailSchema,
      prompt: `Create email marketing content based on this campaign:

Tagline: ${tagline}
Description: ${description}
Goal: ${brief.goal}
Tone: ${brief.tone}
Target Audience: ${brief.audience}

Generate a complete email campaign including subject line, preheader, headline, body content, and call-to-action text. The content should match the ${brief.tone} tone and appeal to ${brief.audience}.`,
    });

    // Build branded HTML email template
    const primaryColor = brief.brandColorPrimary || "#4F46E5";
    const secondaryColor = brief.brandColorSecondary || "#7C3AED";
    const fontFamily = brief.fontFamily || "system-ui, -apple-system, sans-serif";

    const htmlBody = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${emailContent.subject}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: ${fontFamily};
      background-color: #f5f5f5;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .header {
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      padding: 40px 20px;
      text-align: center;
    }
    .header h1 {
      color: #ffffff;
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }
    .content {
      padding: 40px 30px;
    }
    .headline {
      color: ${primaryColor};
      font-size: 24px;
      font-weight: bold;
      margin-bottom: 20px;
    }
    .body-text {
      color: #333333;
      font-size: 16px;
      line-height: 1.6;
      margin-bottom: 30px;
    }
    .cta-button {
      display: inline-block;
      background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
      color: #ffffff;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 8px;
      font-weight: bold;
      font-size: 16px;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 30px;
      text-align: center;
      color: #666666;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <h1>${tagline}</h1>
    </div>
    <div class="content">
      <div class="headline">${emailContent.headline}</div>
      <div class="body-text">${emailContent.bodyContent.replace(/\n/g, '<br>')}</div>
      <center>
        <a href="${emailContent.ctaUrl}" class="cta-button">${emailContent.ctaText}</a>
      </center>
    </div>
    <div class="footer">
      <p>You're receiving this email because you subscribed to our mailing list.</p>
      <p><a href="#" style="color: ${primaryColor};">Unsubscribe</a> | <a href="#" style="color: ${primaryColor};">Update Preferences</a></p>
    </div>
  </div>
</body>
</html>
`;

    const plainTextBody = `
${tagline}

${emailContent.headline}

${emailContent.bodyContent}

${emailContent.ctaText}: ${emailContent.ctaUrl}

---
You're receiving this email because you subscribed to our mailing list.
Unsubscribe | Update Preferences
`;

    await db.asset.create({
      data: {
        campaignId,
        type: "email",
        content: {
          subject: emailContent.subject,
          preheader: emailContent.preheader,
          htmlBody: htmlBody,
          plainTextBody: plainTextBody.trim(),
        },
      },
    });

    const emailDuration = Date.now() - emailStartTime;

    await db.workflowLog.create({
      data: {
        campaignId,
        agentName: "EmailAgent",
        status: "completed",
        durationMs: emailDuration,
        inputPayload: { tagline, description, brief },
        outputPayload: { subject: emailContent.subject, preheader: emailContent.preheader },
        outputSummary: `Generated branded email template with subject: "${emailContent.subject}". Email styled with brand colors (${primaryColor}, ${secondaryColor}) and custom typography.`,
      },
    });

    await emitProgress(campaignId, {
      type: "agent_complete",
      agent: "EmailAgent",
      output: { subject: emailContent.subject },
    });

    // Complete the campaign
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "completed" },
    });

    const totalDuration = Date.now() - startTime;

    await emitProgress(campaignId, {
      type: "complete",
      message: "Campaign generation complete!",
      duration: totalDuration,
    });
  } catch (error) {
    console.error("Campaign workflow error:", error);
    
    await db.campaign.update({
      where: { id: campaignId },
      data: { status: "failed" },
    });

    await emitProgress(campaignId, {
      type: "error",
      message: "An error occurred during campaign generation",
    });
  }
}
