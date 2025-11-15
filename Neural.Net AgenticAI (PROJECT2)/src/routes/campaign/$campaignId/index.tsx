import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { useEffect, useState } from "react";
import { Sparkles, ArrowLeft, Download, Clock, CheckCircle, RefreshCw, ChevronDown, TrendingUp, BarChart3, Target, Zap } from "lucide-react";
import { toast } from "react-hot-toast";

export const Route = createFileRoute("/campaign/$campaignId/")({
  component: CampaignDetailsPage,
});

function CampaignDetailsPage() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [showAllImages, setShowAllImages] = useState(false);
  const [exportFormat, setExportFormat] = useState<"csv" | "txt" | "json">("txt");
  const [showExportMenu, setShowExportMenu] = useState(false);

  useEffect(() => {
    if (!token) {
      void navigate({ to: "/login" });
    }
  }, [token, navigate]);

  const campaignQuery = useQuery(
    trpc.getCampaign.queryOptions(
      {
        authToken: token || "",
        campaignId: parseInt(campaignId),
      },
      { enabled: !!token }
    )
  );

  const trackViewMutation = useMutation(
    trpc.trackCampaignView.mutationOptions({
      onError: (error) => {
        console.error("Failed to track view:", error);
      },
    })
  );

  const exportQuery = useQuery(
    trpc.exportCampaignContent.queryOptions(
      {
        authToken: token || "",
        campaignId: parseInt(campaignId),
        format: exportFormat,
      },
      { enabled: false }
    )
  );

  const updateSelectionMutation = useMutation(
    trpc.updateImageSelection.mutationOptions({
      onSuccess: () => {
        void campaignQuery.refetch();
        toast.success("Image selection updated");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update selection");
      },
    })
  );

  const regenerateImageMutation = useMutation(
    trpc.regenerateImage.mutationOptions({
      onSuccess: () => {
        void campaignQuery.refetch();
        toast.success("Image regenerated successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to regenerate image");
      },
    })
  );

  const campaignAnalyticsQuery = useQuery(
    trpc.getCampaignAnalytics.queryOptions(
      {
        authToken: token || "",
        campaignId: parseInt(campaignId),
      },
      { enabled: !!token && !!campaignQuery.data }
    )
  );

  const trackAssetViewMutation = useMutation(
    trpc.trackAssetView.mutationOptions({
      onError: (error) => {
        console.error("Failed to track asset view:", error);
      },
    })
  );

  const handleTrackAssetView = (assetId: number) => {
    if (!token) return;
    trackAssetViewMutation.mutate({
      authToken: token,
      assetId,
    });
  };

  const campaign = campaignQuery.data;

  useEffect(() => {
    if (campaign && token) {
      trackViewMutation.mutate({
        authToken: token,
        campaignId: parseInt(campaignId),
      });
    }
  }, [campaign?.id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest(".relative")) {
        setShowExportMenu(false);
      }
    };
    
    if (showExportMenu) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [showExportMenu]);

  const handleToggleSelection = (assetId: number, currentSelection: boolean) => {
    if (!token) return;
    updateSelectionMutation.mutate({
      authToken: token,
      assetId,
      isSelected: !currentSelection,
    });
  };

  const handleRegenerateImage = (assetId: number) => {
    if (!token) return;
    if (confirm("Regenerate this image? The current image will be replaced.")) {
      regenerateImageMutation.mutate({
        authToken: token,
        assetId,
      });
    }
  };

  const handleExport = async (format: "csv" | "txt" | "json") => {
    if (!token) return;
    
    setExportFormat(format);
    setShowExportMenu(false);
    
    const result = await exportQuery.refetch();
    
    if (result.data) {
      const blob = new Blob([result.data.content], { type: result.data.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Content exported successfully!");
    }
  };

  if (!token) {
    return null;
  }

  const brief = campaign?.brief as any;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="h-5 w-5" />
                Back to Dashboard
              </Link>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="h-6 w-6 text-indigo-600" />
              <span className="text-xl font-bold text-gray-900">Neural.Net</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {campaignQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading campaign...</p>
          </div>
        ) : !campaign ? (
          <div className="text-center py-12">
            <p className="text-gray-600">Campaign not found</p>
          </div>
        ) : (
          <>
            {/* Campaign Header */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {campaign.name}
                  </h1>
                  <p className="text-gray-600">
                    Created {new Date(campaign.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                    campaign.status === "completed"
                      ? "bg-green-100 text-green-700"
                      : campaign.status === "generating"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-red-100 text-red-700"
                  }`}
                >
                  {campaign.status}
                </span>
              </div>

              {/* Brief Summary */}
              {brief && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                  {brief.goal && (
                    <div>
                      <p className="text-sm font-semibold text-gray-500 mb-1">GOAL</p>
                      <p className="text-gray-900">{brief.goal}</p>
                    </div>
                  )}
                  {brief.tone && (
                    <div>
                      <p className="text-sm font-semibold text-gray-500 mb-1">TONE</p>
                      <p className="text-gray-900 capitalize">{brief.tone}</p>
                    </div>
                  )}
                  {brief.audience && (
                    <div>
                      <p className="text-sm font-semibold text-gray-500 mb-1">AUDIENCE</p>
                      <p className="text-gray-900">{brief.audience}</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Performance Analytics */}
            {campaignAnalyticsQuery.data && (
              <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                  <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                    <BarChart3 className="h-6 w-6 text-white" />
                  </div>
                  Campaign Performance
                </h2>

                {/* Key Metrics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-blue-900">Campaign Views</p>
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                    </div>
                    <p className="text-4xl font-bold text-blue-900">
                      {campaignAnalyticsQuery.data.campaignViewCount}
                    </p>
                    {campaignAnalyticsQuery.data.campaignLastViewedAt && (
                      <p className="text-xs text-blue-700 mt-2">
                        Last viewed {new Date(campaignAnalyticsQuery.data.campaignLastViewedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl p-6 border border-purple-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-purple-900">Asset Views</p>
                      <Target className="h-5 w-5 text-purple-600" />
                    </div>
                    <p className="text-4xl font-bold text-purple-900">
                      {campaignAnalyticsQuery.data.totalAssetViews}
                    </p>
                    <p className="text-xs text-purple-700 mt-2">
                      {Math.round((campaignAnalyticsQuery.data.totalAssetViews / Math.max(campaign.assets.length, 1)) * 10) / 10} per asset
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-green-900">Total Exports</p>
                      <Download className="h-5 w-5 text-green-600" />
                    </div>
                    <p className="text-4xl font-bold text-green-900">
                      {campaignAnalyticsQuery.data.totalExports}
                    </p>
                    <p className="text-xs text-green-700 mt-2">
                      {campaignAnalyticsQuery.data.exportTrendsByType.length} content types
                    </p>
                  </div>

                  <div className="bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl p-6 border border-orange-100/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-orange-900">Engagement Rate</p>
                      <Zap className="h-5 w-5 text-orange-600" />
                    </div>
                    <p className="text-4xl font-bold text-orange-900">
                      {campaignAnalyticsQuery.data.totalAssetViews > 0
                        ? Math.round((campaignAnalyticsQuery.data.totalExports / campaignAnalyticsQuery.data.totalAssetViews) * 100)
                        : 0}%
                    </p>
                    <p className="text-xs text-orange-700 mt-2">
                      Export/view ratio
                    </p>
                  </div>
                </div>

                {/* Most Viewed Assets */}
                {campaignAnalyticsQuery.data.mostViewedAssets.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-indigo-600" />
                      Most Viewed Assets
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {campaignAnalyticsQuery.data.mostViewedAssets.slice(0, 6).map((asset, idx) => {
                        const content = asset.content as any;
                        let preview = "";
                        
                        if (asset.type === "text" && content?.tagline) {
                          preview = content.tagline;
                        } else if (asset.type === "social_media_post" && content?.twitter) {
                          preview = content.twitter.substring(0, 60) + "...";
                        } else if (asset.type === "ad_copy" && content?.headline) {
                          preview = content.headline;
                        } else if (asset.type === "email" && content?.subject) {
                          preview = content.subject;
                        } else if (asset.type === "image") {
                          preview = "Image Asset";
                        } else {
                          preview = asset.type.replace(/_/g, " ");
                        }

                        return (
                          <div
                            key={asset.id}
                            className="flex items-center gap-4 p-4 bg-gradient-to-br from-gray-50 to-white rounded-xl border border-gray-200/50 hover:shadow-md transition-all"
                          >
                            <div className="flex-shrink-0 h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-lg flex items-center justify-center text-white font-bold">
                              {idx + 1}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-gray-900 truncate capitalize">
                                {asset.type.replace(/_/g, " ")}
                              </p>
                              <p className="text-xs text-gray-600 truncate">{preview}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-indigo-600">{asset.viewCount}</p>
                              <p className="text-xs text-gray-500">views</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Export Trends */}
                {campaignAnalyticsQuery.data.exportTrendsByType.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Download className="h-5 w-5 text-green-600" />
                      Export Trends by Content Type
                    </h3>
                    <div className="space-y-3">
                      {campaignAnalyticsQuery.data.exportTrendsByType.map((trend) => {
                        const percentage = Math.round((trend.count / Math.max(campaignAnalyticsQuery.data.totalExports, 1)) * 100);
                        return (
                          <div key={trend.type} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-gray-900 capitalize">
                                {trend.type.replace(/_/g, " ")}
                              </span>
                              <span className="text-gray-600">
                                {trend.count} exports ({percentage}%)
                              </span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* View Trends */}
                {campaignAnalyticsQuery.data.viewTrendsByType.length > 0 && (
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Target className="h-5 w-5 text-purple-600" />
                      View Trends by Content Type
                    </h3>
                    <div className="space-y-3">
                      {campaignAnalyticsQuery.data.viewTrendsByType.map((trend) => {
                        const percentage = Math.round((trend.count / Math.max(campaignAnalyticsQuery.data.totalAssetViews, 1)) * 100);
                        return (
                          <div key={trend.type} className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="font-semibold text-gray-900 capitalize">
                                {trend.type.replace(/_/g, " ")}
                              </span>
                              <span className="text-gray-600">
                                {trend.count} views ({percentage}%)
                              </span>
                            </div>
                            <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Generated Assets */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100 mb-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Generated Assets</h2>
                <div className="relative">
                  <button
                    onClick={() => setShowExportMenu(!showExportMenu)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                  >
                    <Download className="h-4 w-4" />
                    Download All
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  
                  {showExportMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10">
                      <button
                        onClick={() => handleExport("txt")}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                      >
                        <div className="font-medium text-gray-900">Text File (.txt)</div>
                        <div className="text-xs text-gray-500">Plain text format</div>
                      </button>
                      <button
                        onClick={() => handleExport("csv")}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                      >
                        <div className="font-medium text-gray-900">CSV (.csv)</div>
                        <div className="text-xs text-gray-500">Spreadsheet format</div>
                      </button>
                      <button
                        onClick={() => handleExport("json")}
                        className="w-full text-left px-4 py-2 hover:bg-gray-50 transition"
                      >
                        <div className="font-medium text-gray-900">JSON (.json)</div>
                        <div className="text-xs text-gray-500">Structured data</div>
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Text Assets */}
              {campaign.assets.filter((a) => a.type === "text").length > 0 && (
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Copy</h3>
                  {campaign.assets
                    .filter((a) => a.type === "text")
                    .map((asset) => {
                      const content = asset.content as any;
                      return (
                        <div
                          key={asset.id}
                          className="bg-gray-50 rounded-lg p-6 hover:bg-gray-100 transition-colors cursor-pointer"
                          onClick={() => handleTrackAssetView(asset.id)}
                        >
                          {content.tagline && (
                            <div className="mb-4">
                              <p className="text-xs font-semibold text-gray-500 mb-2">
                                TAGLINE
                              </p>
                              <p className="text-2xl font-bold text-gray-900">
                                {content.tagline}
                              </p>
                            </div>
                          )}
                          {content.description && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-2">
                                DESCRIPTION
                              </p>
                              <p className="text-gray-700 leading-relaxed">
                                {content.description}
                              </p>
                            </div>
                          )}
                          {asset.viewCount > 0 && (
                            <div className="mt-4 pt-4 border-t border-gray-200 flex items-center gap-2 text-sm text-gray-600">
                              <TrendingUp className="h-4 w-4" />
                              <span>{asset.viewCount} views</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Social Media Posts */}
              {campaign.assets.filter((a) => a.type === "social_media_post").length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Social Media Posts</h3>
                  {campaign.assets
                    .filter((a) => a.type === "social_media_post")
                    .map((asset) => {
                      const content = asset.content as any;
                      return (
                        <div key={asset.id} className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div
                              className="bg-blue-50 rounded-lg p-6 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              onClick={() => handleTrackAssetView(asset.id)}
                            >
                              <p className="text-xs font-semibold text-blue-900 mb-2">
                                TWITTER/X
                              </p>
                              <p className="text-sm text-gray-800">{content.twitter}</p>
                            </div>
                            
                            <div
                              className="bg-blue-50 rounded-lg p-6 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              onClick={() => handleTrackAssetView(asset.id)}
                            >
                              <p className="text-xs font-semibold text-blue-900 mb-2">
                                LINKEDIN
                              </p>
                              <p className="text-sm text-gray-800">{content.linkedin}</p>
                            </div>
                            
                            <div
                              className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-6 border border-pink-200 hover:from-pink-100 hover:to-purple-100 transition-colors cursor-pointer"
                              onClick={() => handleTrackAssetView(asset.id)}
                            >
                              <p className="text-xs font-semibold text-pink-900 mb-2">
                                INSTAGRAM
                              </p>
                              <p className="text-sm text-gray-800">{content.instagram}</p>
                            </div>
                            
                            <div
                              className="bg-blue-50 rounded-lg p-6 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                              onClick={() => handleTrackAssetView(asset.id)}
                            >
                              <p className="text-xs font-semibold text-blue-900 mb-2">
                                FACEBOOK
                              </p>
                              <p className="text-sm text-gray-800">{content.facebook}</p>
                            </div>
                          </div>
                          
                          {asset.viewCount > 0 && (
                            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
                              <TrendingUp className="h-4 w-4" />
                              <span>{asset.viewCount} views</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Ad Copy */}
              {campaign.assets.filter((a) => a.type === "ad_copy").length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Ad Copy</h3>
                  {campaign.assets
                    .filter((a) => a.type === "ad_copy")
                    .map((asset) => {
                      const content = asset.content as any;
                      return (
                        <div key={asset.id} className="space-y-4">
                          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                            <p className="text-xs font-semibold text-orange-900 mb-2">
                              HEADLINE
                            </p>
                            <p className="text-xl font-bold text-gray-900">{content.headline}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                              <p className="text-xs font-semibold text-orange-900 mb-2">
                                SHORT BODY (150 chars)
                              </p>
                              <p className="text-sm text-gray-800">{content.bodyShort}</p>
                            </div>
                            
                            <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                              <p className="text-xs font-semibold text-orange-900 mb-2">
                                CALL-TO-ACTION
                              </p>
                              <p className="text-base font-semibold text-gray-900">{content.cta}</p>
                            </div>
                          </div>
                          
                          <div className="bg-orange-50 rounded-lg p-6 border border-orange-200">
                            <p className="text-xs font-semibold text-orange-900 mb-2">
                              LONG BODY (300 chars)
                            </p>
                            <p className="text-sm text-gray-800">{content.bodyLong}</p>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Email Subject Lines */}
              {campaign.assets.filter((a) => a.type === "email_subject_lines").length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Subject Lines</h3>
                  {campaign.assets
                    .filter((a) => a.type === "email_subject_lines")
                    .map((asset) => {
                      const content = asset.content as any;
                      return (
                        <div key={asset.id} className="space-y-3">
                          {content.subjectLines?.map((subject: string, index: number) => (
                            <div key={index} className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                              <p className="text-xs font-semibold text-indigo-900 mb-1">
                                OPTION {index + 1}
                              </p>
                              <p className="text-base font-medium text-gray-900">{subject}</p>
                            </div>
                          ))}
                        </div>
                      );
                    })}
                </div>
              )}

              {/* Image Assets */}
              {campaign.assets.filter((a) => a.type === "image").length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Visuals</h3>
                    <button
                      onClick={() => setShowAllImages(!showAllImages)}
                      className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                    >
                      {showAllImages ? "Show Selected Only" : "Show All Images"}
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {campaign.assets
                      .filter((a) => a.type === "image")
                      .filter((a) => showAllImages || a.isSelected)
                      .map((asset) => (
                        <div
                          key={asset.id}
                          className={`relative rounded-lg overflow-hidden shadow-md group border-4 transition ${
                            asset.isSelected
                              ? "border-green-500"
                              : "border-gray-200 opacity-60"
                          }`}
                          onClick={() => handleTrackAssetView(asset.id)}
                        >
                          <div className="aspect-video">
                            <img
                              src={asset.url || ""}
                              alt="Generated visual"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          
                          {/* View Count Badge */}
                          {asset.viewCount > 0 && (
                            <div className="absolute bottom-2 left-2 bg-black/70 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 backdrop-blur-sm">
                              <TrendingUp className="h-3 w-3" />
                              {asset.viewCount} views
                            </div>
                          )}
                          
                          {/* Overlay Controls */}
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition flex items-center justify-center">
                            <div className="opacity-0 group-hover:opacity-100 transition flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleToggleSelection(asset.id, asset.isSelected);
                                }}
                                disabled={updateSelectionMutation.isPending}
                                className={`px-4 py-2 rounded-lg font-medium transition ${
                                  asset.isSelected
                                    ? "bg-red-600 hover:bg-red-700 text-white"
                                    : "bg-green-600 hover:bg-green-700 text-white"
                                }`}
                              >
                                {asset.isSelected ? "Deselect" : "Select"}
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRegenerateImage(asset.id);
                                }}
                                disabled={regenerateImageMutation.isPending}
                                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium transition"
                              >
                                Regenerate
                              </button>
                              <a
                                href={asset.url || ""}
                                download
                                onClick={(e) => e.stopPropagation()}
                                className="px-4 py-2 bg-white text-gray-900 rounded-lg font-medium hover:bg-gray-100 transition"
                              >
                                Download
                              </a>
                            </div>
                          </div>
                          
                          {/* Selection Badge */}
                          {asset.isSelected && (
                            <div className="absolute top-2 left-2 bg-green-500 text-white px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Selected
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                  
                  {!showAllImages && campaign.assets.filter((a) => a.type === "image" && !a.isSelected).length > 0 && (
                    <p className="mt-4 text-sm text-gray-500 text-center">
                      {campaign.assets.filter((a) => a.type === "image" && !a.isSelected).length} unselected image(s) hidden.{" "}
                      <button
                        onClick={() => setShowAllImages(true)}
                        className="text-indigo-600 hover:text-indigo-700 font-medium"
                      >
                        Show all
                      </button>
                    </p>
                  )}
                </div>
              )}

              {/* Email Templates */}
              {campaign.assets.filter((a) => a.type === "email").length > 0 && (
                <div className="mt-8">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Email Templates</h3>
                  {campaign.assets
                    .filter((a) => a.type === "email")
                    .map((asset) => {
                      const emailContent = asset.content as any;
                      return (
                        <div key={asset.id} className="space-y-4">
                          {/* Email Details */}
                          <div className="bg-gray-50 rounded-lg p-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">
                                  SUBJECT LINE
                                </p>
                                <p className="text-base font-semibold text-gray-900">
                                  {emailContent.subject}
                                </p>
                              </div>
                              <div>
                                <p className="text-xs font-semibold text-gray-500 mb-1">
                                  PREHEADER
                                </p>
                                <p className="text-sm text-gray-700">
                                  {emailContent.preheader}
                                </p>
                              </div>
                            </div>
                            
                            {/* Preview Tabs */}
                            <div className="border-t border-gray-200 pt-4">
                              <div className="flex gap-2 mb-4">
                                <button
                                  onClick={() => {
                                    const preview = document.getElementById(`email-preview-${asset.id}`);
                                    const plain = document.getElementById(`email-plain-${asset.id}`);
                                    if (preview && plain) {
                                      preview.style.display = "block";
                                      plain.style.display = "none";
                                    }
                                  }}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
                                >
                                  HTML Preview
                                </button>
                                <button
                                  onClick={() => {
                                    const preview = document.getElementById(`email-preview-${asset.id}`);
                                    const plain = document.getElementById(`email-plain-${asset.id}`);
                                    if (preview && plain) {
                                      preview.style.display = "none";
                                      plain.style.display = "block";
                                    }
                                  }}
                                  className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                                >
                                  Plain Text
                                </button>
                                <button
                                  onClick={() => {
                                    const blob = new Blob([emailContent.htmlBody], { type: "text/html" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `email-template-${asset.id}.html`;
                                    a.click();
                                    URL.revokeObjectURL(url);
                                  }}
                                  className="ml-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 transition"
                                >
                                  Download HTML
                                </button>
                              </div>
                              
                              {/* HTML Preview */}
                              <div
                                id={`email-preview-${asset.id}`}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                              >
                                <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-b border-gray-200">
                                  Email Preview
                                </div>
                                <div className="p-4 max-h-96 overflow-y-auto">
                                  <iframe
                                    srcDoc={emailContent.htmlBody}
                                    className="w-full h-96 border-0"
                                    title="Email Preview"
                                    sandbox="allow-same-origin"
                                  />
                                </div>
                              </div>
                              
                              {/* Plain Text */}
                              <div
                                id={`email-plain-${asset.id}`}
                                className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                                style={{ display: "none" }}
                              >
                                <div className="bg-gray-100 px-4 py-2 text-xs text-gray-600 border-b border-gray-200">
                                  Plain Text Version
                                </div>
                                <pre className="p-4 text-sm text-gray-700 whitespace-pre-wrap font-mono max-h-96 overflow-y-auto">
                                  {emailContent.plainTextBody}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Workflow Log */}
            <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-100">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                Workflow Log
              </h2>
              <p className="text-gray-600 mb-6">
                Detailed transparency into how our AI agents collaborated to create your campaign
              </p>

              <div className="space-y-4">
                {campaign.workflowLog.map((log, index) => (
                  <div
                    key={log.id}
                    className="border-l-4 border-indigo-500 bg-gray-50 rounded-r-lg p-6"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <h3 className="font-semibold text-gray-900">
                          {log.agentName}
                        </h3>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        {log.durationMs ? `${(log.durationMs / 1000).toFixed(1)}s` : "-"}
                      </div>
                    </div>

                    {log.outputSummary && (
                      <p className="text-gray-700 mb-3">{log.outputSummary}</p>
                    )}

                    {log.inputPayload && (
                      <details className="mt-3">
                        <summary className="text-sm font-medium text-gray-600 cursor-pointer hover:text-gray-900">
                          View technical details
                        </summary>
                        <div className="mt-3 space-y-2">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">
                              INPUT
                            </p>
                            <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                              {JSON.stringify(log.inputPayload, null, 2)}
                            </pre>
                          </div>
                          {log.outputPayload && (
                            <div>
                              <p className="text-xs font-semibold text-gray-500 mb-1">
                                OUTPUT
                              </p>
                              <pre className="text-xs bg-white p-3 rounded border border-gray-200 overflow-x-auto">
                                {JSON.stringify(log.outputPayload, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
