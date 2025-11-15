import { z } from "zod";
import { TRPCError } from "@trpc/server";
import jwt from "jsonwebtoken";
import { db } from "~/server/db";
import { baseProcedure } from "~/server/trpc/main";
import { env } from "~/server/env";

export const bulkExportCampaigns = baseProcedure
  .input(
    z.object({
      authToken: z.string(),
      campaignIds: z.array(z.number()).min(1, "At least one campaign must be selected"),
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

    // Fetch campaigns with all assets
    const campaigns = await db.campaign.findMany({
      where: {
        id: { in: input.campaignIds },
      },
      include: {
        assets: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (campaigns.length === 0) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "No campaigns found",
      });
    }

    // Verify ownership
    const unauthorizedCampaign = campaigns.find((c) => c.userId !== userId);
    if (unauthorizedCampaign) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "You don't have access to some of these campaigns",
      });
    }

    // Track exports for all assets
    for (const campaign of campaigns) {
      if (campaign.assets.length > 0) {
        await db.asset.updateMany({
          where: { campaignId: campaign.id },
          data: {
            exportCount: { increment: 1 },
            lastExportedAt: new Date(),
          },
        });
      }
    }

    let content = "";

    if (input.format === "csv") {
      // CSV format
      content = "Campaign,Type,Content,Details\n";
      
      for (const campaign of campaigns) {
        for (const asset of campaign.assets) {
          const campaignName = campaign.name.replace(/"/g, '""');
          
          if (asset.type === "text") {
            const textContent = asset.content as any;
            content += `"${campaignName}","Tagline","${(textContent.tagline || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Description","${(textContent.description || "").replace(/"/g, '""')}",""\n`;
          } else if (asset.type === "social_media_post") {
            const socialContent = asset.content as any;
            content += `"${campaignName}","Social - Twitter","${(socialContent.twitter || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Social - LinkedIn","${(socialContent.linkedin || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Social - Instagram","${(socialContent.instagram || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Social - Facebook","${(socialContent.facebook || "").replace(/"/g, '""')}",""\n`;
          } else if (asset.type === "ad_copy") {
            const adContent = asset.content as any;
            content += `"${campaignName}","Ad Headline","${(adContent.headline || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Ad Body (Short)","${(adContent.bodyShort || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Ad Body (Long)","${(adContent.bodyLong || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Ad CTA","${(adContent.cta || "").replace(/"/g, '""')}",""\n`;
          } else if (asset.type === "email_subject_lines") {
            const emailSubjects = asset.content as any;
            emailSubjects.subjectLines?.forEach((subject: string, idx: number) => {
              content += `"${campaignName}","Email Subject ${idx + 1}","${subject.replace(/"/g, '""')}",""\n`;
            });
          } else if (asset.type === "email") {
            const emailContent = asset.content as any;
            content += `"${campaignName}","Email Subject","${(emailContent.subject || "").replace(/"/g, '""')}",""\n`;
            content += `"${campaignName}","Email Preheader","${(emailContent.preheader || "").replace(/"/g, '""')}",""\n`;
          } else if (asset.type === "image") {
            content += `"${campaignName}","Image","${asset.url || ""}",""\n`;
          }
        }
      }
    } else if (input.format === "txt") {
      // Plain text format
      content = `Bulk Export - ${campaigns.length} Campaign(s)\n`;
      content += `Exported: ${new Date().toLocaleString()}\n`;
      content += `${"=".repeat(80)}\n\n`;

      for (const campaign of campaigns) {
        const brief = campaign.brief as any;
        
        content += `Campaign: ${campaign.name}\n`;
        content += `Created: ${campaign.createdAt.toLocaleDateString()}\n`;
        content += `Status: ${campaign.status}\n\n`;
        content += `=== CAMPAIGN BRIEF ===\n`;
        content += `Goal: ${brief.goal}\n`;
        content += `Tone: ${brief.tone}\n`;
        content += `Audience: ${brief.audience}\n\n`;

        for (const asset of campaign.assets) {
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
        }

        content += `${"-".repeat(80)}\n\n`;
      }
    } else {
      // JSON format
      const exportData = {
        exportDate: new Date().toISOString(),
        campaignCount: campaigns.length,
        campaigns: campaigns.map((campaign) => ({
          id: campaign.id,
          name: campaign.name,
          brief: campaign.brief,
          status: campaign.status,
          createdAt: campaign.createdAt,
          assets: campaign.assets.map((asset) => ({
            id: asset.id,
            type: asset.type,
            content: asset.content,
            url: asset.url,
            isSelected: asset.isSelected,
          })),
        })),
      };
      content = JSON.stringify(exportData, null, 2);
    }

    return {
      content,
      filename: `bulk-export-${campaigns.length}-campaigns-${Date.now()}.${input.format}`,
      mimeType: input.format === "csv" ? "text/csv" : input.format === "json" ? "application/json" : "text/plain",
    };
  });
