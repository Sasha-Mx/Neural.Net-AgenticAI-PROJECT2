import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const exportCampaignContent = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      campaignId: z.number(),
      format: z.enum(["csv", "txt", "json"]),
    })
  )
  .query(async ({ input }) => {
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

    // Fetch campaign with all assets
    const campaign = await db.campaign.findUnique({
      where: { id: input.campaignId },
      include: {
        assets: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!campaign) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Campaign not found",
      });
    }

    // Verify ownership
    if (campaign.userId !== userId) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to this campaign",
      });
    }

    // Track export
    await db.campaign.update({
      where: { id: input.campaignId },
      data: {
        assets: {
          updateMany: {
            where: { campaignId: input.campaignId },
            data: {
              exportCount: { increment: 1 },
              lastExportedAt: new Date(),
            },
          },
        },
      },
    });

    const brief = campaign.brief as any;
    let content = "";

    if (input.format === "csv") {
      // CSV format
      content = "Type,Content,Details\n";
      
      campaign.assets.forEach((asset) => {
        if (asset.type === "text") {
          const textContent = asset.content as any;
          content += `"Tagline","${(textContent.tagline || "").replace(/"/g, '""')}",""\n`;
          content += `"Description","${(textContent.description || "").replace(/"/g, '""')}",""\n`;
        } else if (asset.type === "social_media_post") {
          const socialContent = asset.content as any;
          content += `"Social - Twitter","${(socialContent.twitter || "").replace(/"/g, '""')}",""\n`;
          content += `"Social - LinkedIn","${(socialContent.linkedin || "").replace(/"/g, '""')}",""\n`;
          content += `"Social - Instagram","${(socialContent.instagram || "").replace(/"/g, '""')}",""\n`;
          content += `"Social - Facebook","${(socialContent.facebook || "").replace(/"/g, '""')}",""\n`;
        } else if (asset.type === "ad_copy") {
          const adContent = asset.content as any;
          content += `"Ad Headline","${(adContent.headline || "").replace(/"/g, '""')}",""\n`;
          content += `"Ad Body (Short)","${(adContent.bodyShort || "").replace(/"/g, '""')}",""\n`;
          content += `"Ad Body (Long)","${(adContent.bodyLong || "").replace(/"/g, '""')}",""\n`;
          content += `"Ad CTA","${(adContent.cta || "").replace(/"/g, '""')}",""\n`;
        } else if (asset.type === "email_subject_lines") {
          const emailSubjects = asset.content as any;
          emailSubjects.subjectLines?.forEach((subject: string, idx: number) => {
            content += `"Email Subject ${idx + 1}","${subject.replace(/"/g, '""')}",""\n`;
          });
        } else if (asset.type === "email") {
          const emailContent = asset.content as any;
          content += `"Email Subject","${(emailContent.subject || "").replace(/"/g, '""')}",""\n`;
          content += `"Email Preheader","${(emailContent.preheader || "").replace(/"/g, '""')}",""\n`;
        } else if (asset.type === "image") {
          content += `"Image","${asset.url || ""}",""\n`;
        }
      });
    } else if (input.format === "txt") {
      // Plain text format
      content = `Campaign: ${campaign.name}\n`;
      content += `Created: ${campaign.createdAt.toLocaleDateString()}\n`;
      content += `Status: ${campaign.status}\n\n`;
      content += `=== CAMPAIGN BRIEF ===\n`;
      content += `Goal: ${brief.goal}\n`;
      content += `Tone: ${brief.tone}\n`;
      content += `Audience: ${brief.audience}\n\n`;

      campaign.assets.forEach((asset) => {
        if (asset.type === "text") {
          const textContent = asset.content as any;
          content += `=== TAGLINE ===\n${textContent.tagline}\n\n`;
          content += `=== DESCRIPTION ===\n${textContent.description}\n\n`;
        } else if (asset.type === "social_media_post") {
          const socialContent = asset.content as any;
          content += `=== SOCIAL MEDIA POSTS ===\n`;
          content += `Twitter/X:\n${socialContent.twitter}\n\n`;
          content += `LinkedIn:\n${socialContent.linkedin}\n\n`;
          content += `Instagram:\n${socialContent.instagram}\n\n`;
          content += `Facebook:\n${socialContent.facebook}\n\n`;
        } else if (asset.type === "ad_copy") {
          const adContent = asset.content as any;
          content += `=== AD COPY ===\n`;
          content += `Headline: ${adContent.headline}\n`;
          content += `Short Body: ${adContent.bodyShort}\n`;
          content += `Long Body: ${adContent.bodyLong}\n`;
          content += `CTA: ${adContent.cta}\n\n`;
        } else if (asset.type === "email_subject_lines") {
          const emailSubjects = asset.content as any;
          content += `=== EMAIL SUBJECT LINES ===\n`;
          emailSubjects.subjectLines?.forEach((subject: string, idx: number) => {
            content += `${idx + 1}. ${subject}\n`;
          });
          content += `\n`;
        } else if (asset.type === "email") {
          const emailContent = asset.content as any;
          content += `=== EMAIL TEMPLATE ===\n`;
          content += `Subject: ${emailContent.subject}\n`;
          content += `Preheader: ${emailContent.preheader}\n\n`;
          content += `Plain Text Body:\n${emailContent.plainTextBody}\n\n`;
        } else if (asset.type === "image") {
          content += `=== IMAGE ===\n${asset.url}\n\n`;
        }
      });
    } else {
      // JSON format
      const exportData = {
        campaign: {
          id: campaign.id,
          name: campaign.name,
          brief: campaign.brief,
          status: campaign.status,
          createdAt: campaign.createdAt,
        },
        assets: campaign.assets.map((asset) => ({
          id: asset.id,
          type: asset.type,
          content: asset.content,
          url: asset.url,
          isSelected: asset.isSelected,
        })),
      };
      content = JSON.stringify(exportData, null, 2);
    }

    return {
      content,
      filename: `campaign-${campaign.id}-${campaign.name.replace(/[^a-z0-9]/gi, "-").toLowerCase()}.${input.format}`,
      mimeType: input.format === "csv" ? "text/csv" : input.format === "json" ? "application/json" : "text/plain",
    };
  });
