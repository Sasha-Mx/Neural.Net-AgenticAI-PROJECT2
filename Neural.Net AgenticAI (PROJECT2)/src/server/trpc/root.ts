import {
  createCallerFactory,
  createTRPCRouter,
} from "~/server/trpc/main";
import { register } from "~/server/trpc/procedures/auth/register";
import { login } from "~/server/trpc/procedures/auth/login";
import { getMe } from "~/server/trpc/procedures/auth/getMe";
import { updateMe } from "~/server/trpc/procedures/auth/updateMe";
import { createCampaign } from "~/server/trpc/procedures/campaigns/createCampaign";
import { getCampaigns } from "~/server/trpc/procedures/campaigns/getCampaigns";
import { getCampaign } from "~/server/trpc/procedures/campaigns/getCampaign";
import { deleteCampaign } from "~/server/trpc/procedures/campaigns/deleteCampaign";
import { campaignProgress } from "~/server/trpc/procedures/campaigns/campaignProgress";
import { updateImageSelection } from "~/server/trpc/procedures/campaigns/updateImageSelection";
import { regenerateImage } from "~/server/trpc/procedures/campaigns/regenerateImage";
import { updateTextAsset } from "~/server/trpc/procedures/campaigns/updateTextAsset";
import { regenerateTextContent } from "~/server/trpc/procedures/campaigns/regenerateTextContent";
import { getImageHistory } from "~/server/trpc/procedures/campaigns/getImageHistory";
import { bulkArchiveCampaigns } from "~/server/trpc/procedures/campaigns/bulkArchiveCampaigns";
import { bulkDuplicateCampaigns } from "~/server/trpc/procedures/campaigns/bulkDuplicateCampaigns";
import { bulkExportCampaigns } from "~/server/trpc/procedures/campaigns/bulkExportCampaigns";
import { createBrandProfile } from "~/server/trpc/procedures/brand-profiles/createBrandProfile";
import { getBrandProfiles } from "~/server/trpc/procedures/brand-profiles/getBrandProfiles";
import { updateBrandProfile } from "~/server/trpc/procedures/brand-profiles/updateBrandProfile";
import { deleteBrandProfile } from "~/server/trpc/procedures/brand-profiles/deleteBrandProfile";
import { getMinioBaseUrl } from "~/server/trpc/procedures/getMinioBaseUrl";
import { getCampaignTemplates } from "~/server/trpc/procedures/templates/getCampaignTemplates";
import { createCampaignTemplate } from "~/server/trpc/procedures/templates/createCampaignTemplate";
import { updateCampaignTemplate } from "~/server/trpc/procedures/templates/updateCampaignTemplate";
import { deleteCampaignTemplate } from "~/server/trpc/procedures/templates/deleteCampaignTemplate";
import { exportCampaignContent } from "~/server/trpc/procedures/campaigns/exportCampaignContent";
import { trackCampaignView } from "~/server/trpc/procedures/campaigns/trackCampaignView";
import { getPerformanceAnalytics } from "~/server/trpc/procedures/campaigns/getPerformanceAnalytics";
import { trackAssetView } from "~/server/trpc/procedures/campaigns/trackAssetView";
import { getCampaignAnalytics } from "~/server/trpc/procedures/campaigns/getCampaignAnalytics";

export const appRouter = createTRPCRouter({
  // Auth
  register,
  login,
  getMe,
  updateMe,
  
  // Campaigns
  createCampaign,
  getCampaigns,
  getCampaign,
  deleteCampaign,
  campaignProgress,
  updateImageSelection,
  regenerateImage,
  updateTextAsset,
  regenerateTextContent,
  getImageHistory,
  
  // Bulk Campaign Operations
  bulkArchiveCampaigns,
  bulkDuplicateCampaigns,
  bulkExportCampaigns,
  
  // Campaign Templates
  getCampaignTemplates,
  createCampaignTemplate,
  updateCampaignTemplate,
  deleteCampaignTemplate,
  
  // Performance Tracking
  trackCampaignView,
  trackAssetView,
  getPerformanceAnalytics,
  getCampaignAnalytics,
  exportCampaignContent,
  
  // Brand Profiles
  createBrandProfile,
  getBrandProfiles,
  updateBrandProfile,
  deleteBrandProfile,
  
  // Utilities
  getMinioBaseUrl,
});

export type AppRouter = typeof appRouter;

export const createCaller = createCallerFactory(appRouter);
