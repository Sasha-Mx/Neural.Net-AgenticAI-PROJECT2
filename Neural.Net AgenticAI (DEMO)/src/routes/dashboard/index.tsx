import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { useEffect, useState } from "react";
import { Sparkles, Plus, TrendingUp, Image, LogOut, User, Palette, Eye, Download, FileText, Award, Archive, Copy, Calendar, CheckSquare, Square, FileDown, Trash2, BarChart3, Zap } from "lucide-react";
import { authToasts, campaignToasts, actionToasts } from "~/utils/toasts";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token, user, clearAuth } = useAuthStore();

  const [selectedCampaignIds, setSelectedCampaignIds] = useState<number[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  const [dateRange, setDateRange] = useState<"all" | "7days" | "30days" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      void navigate({ to: "/login" });
    }
  }, [token, navigate]);

  const campaignsQuery = useQuery(
    trpc.getCampaigns.queryOptions(
      { authToken: token || "", includeArchived: showArchived },
      { enabled: !!token }
    )
  );

  // Calculate date range for analytics
  const getDateRange = () => {
    const now = new Date();
    let startDate: string | undefined;
    let endDate: string | undefined;

    if (dateRange === "7days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 7);
      startDate = start.toISOString();
      endDate = now.toISOString();
    } else if (dateRange === "30days") {
      const start = new Date(now);
      start.setDate(start.getDate() - 30);
      startDate = start.toISOString();
      endDate = now.toISOString();
    } else if (dateRange === "custom" && customStartDate && customEndDate) {
      startDate = new Date(customStartDate).toISOString();
      endDate = new Date(customEndDate).toISOString();
    }

    return { startDate, endDate };
  };

  const { startDate, endDate } = getDateRange();

  const analyticsQuery = useQuery(
    trpc.getPerformanceAnalytics.queryOptions(
      { authToken: token || "", startDate, endDate },
      { enabled: !!token }
    )
  );

  const bulkArchiveMutation = useMutation(
    trpc.bulkArchiveCampaigns.mutationOptions({
      onSuccess: (data) => {
        actionToasts.archiveSuccess(selectedCampaignIds.length);
        setSelectedCampaignIds([]);
        void campaignsQuery.refetch();
      },
      onError: (error) => {
        actionToasts.genericError(error.message || "Failed to archive campaigns");
      },
    })
  );

  const bulkDuplicateMutation = useMutation(
    trpc.bulkDuplicateCampaigns.mutationOptions({
      onSuccess: (data) => {
        actionToasts.duplicateSuccess(selectedCampaignIds.length);
        setSelectedCampaignIds([]);
        void campaignsQuery.refetch();
      },
      onError: (error) => {
        actionToasts.genericError(error.message || "Failed to duplicate campaigns");
      },
    })
  );

  const deleteCampaignMutation = useMutation(
    trpc.deleteCampaign.mutationOptions({
      onSuccess: (data) => {
        campaignToasts.deleteSuccess(data.campaignName);
        void campaignsQuery.refetch();
      },
      onError: (error) => {
        campaignToasts.deleteError(error.message);
      },
    })
  );

  const handleToggleSelectCampaign = (campaignId: number) => {
    setSelectedCampaignIds((prev) =>
      prev.includes(campaignId)
        ? prev.filter((id) => id !== campaignId)
        : [...prev, campaignId]
    );
  };

  const handleSelectAllCampaigns = () => {
    if (selectedCampaignIds.length === campaignsQuery.data?.campaigns.length) {
      setSelectedCampaignIds([]);
    } else {
      setSelectedCampaignIds(campaignsQuery.data?.campaigns.map((c) => c.id) || []);
    }
  };

  const handleBulkArchive = () => {
    if (!token || selectedCampaignIds.length === 0) return;
    if (confirm(`Archive ${selectedCampaignIds.length} campaign(s)?`)) {
      bulkArchiveMutation.mutate({ authToken: token, campaignIds: selectedCampaignIds });
    }
  };

  const handleBulkDuplicate = () => {
    if (!token || selectedCampaignIds.length === 0) return;
    if (confirm(`Duplicate ${selectedCampaignIds.length} campaign(s)?`)) {
      bulkDuplicateMutation.mutate({ authToken: token, campaignIds: selectedCampaignIds });
    }
  };

  const handleBulkExport = async (format: "csv" | "txt" | "json") => {
    if (!token || selectedCampaignIds.length === 0) return;
    
    try {
      const result = await trpc.bulkExportCampaigns.query({
        authToken: token,
        campaignIds: selectedCampaignIds,
        format,
      });

      // Create download
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      campaignToasts.exportSuccess();
    } catch (error: any) {
      campaignToasts.exportError(error.message);
    }
  };

  const handleDeleteCampaign = (campaignId: number, campaignName: string) => {
    if (!token) return;
    if (confirm(`Are you sure you want to permanently delete "${campaignName}"? This action cannot be undone.`)) {
      deleteCampaignMutation.mutate({
        authToken: token,
        campaignId,
      });
    }
  };

  const handleLogout = () => {
    clearAuth();
    authToasts.logoutSuccess();
    void navigate({ to: "/login" });
  };

  if (!token || !user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-lg border-b border-gray-200/50 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 group">
              <div className="relative">
                <Sparkles className="h-8 w-8 text-indigo-600 transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 bg-indigo-600/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity"></div>
              </div>
              <span className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Neural.Net
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/campaign-templates"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-indigo-50 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <FileText className="h-5 w-5 text-indigo-600" />
                <span className="hidden sm:inline font-medium">Templates</span>
              </Link>
              <Link
                to="/brand-profiles"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-purple-50 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <Palette className="h-5 w-5 text-purple-600" />
                <span className="hidden sm:inline font-medium">Brand Profiles</span>
              </Link>
              <Link
                to="/profile"
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-blue-50 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <User className="h-5 w-5 text-blue-600" />
                <span className="hidden sm:inline font-medium">{user.name}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-red-50 rounded-xl transition-all duration-200 hover:scale-105"
              >
                <LogOut className="h-5 w-5 text-red-600" />
                <span className="hidden sm:inline font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Welcome Section */}
        <div className="animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-gray-900 via-indigo-900 to-purple-900 bg-clip-text text-transparent mb-3">
            Welcome back, {user.name}!
          </h1>
          <p className="text-lg text-gray-600">
            Manage your campaigns and create stunning content with AI ✨
          </p>
        </div>

        {/* Date Range Filter */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-6 border border-gray-100/50 hover:shadow-xl transition-all duration-300">
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-indigo-600" />
            Analytics Time Period
          </h2>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setDateRange("all")}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  dateRange === "all"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                }`}
              >
                All Time
              </button>
              <button
                onClick={() => setDateRange("7days")}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  dateRange === "7days"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                }`}
              >
                Last 7 Days
              </button>
              <button
                onClick={() => setDateRange("30days")}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  dateRange === "30days"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                }`}
              >
                Last 30 Days
              </button>
              <button
                onClick={() => setDateRange("custom")}
                className={`px-5 py-2.5 rounded-xl font-medium transition-all duration-200 ${
                  dateRange === "custom"
                    ? "bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-lg shadow-indigo-500/30 scale-105"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:scale-105"
                }`}
              >
                Custom Range
              </button>
            </div>
            
            {dateRange === "custom" && (
              <div className="flex gap-4 items-center animate-fade-in">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Start Date</label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">End Date</label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="group bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-3xl shadow-lg p-6 border border-indigo-400/20 hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-semibold mb-2">Total Campaigns</p>
                  <p className="text-5xl font-bold text-white mb-1">
                    {campaignsQuery.data?.analytics.totalCampaigns || 0}
                  </p>
                  {campaignsQuery.data && campaignsQuery.data.campaigns.length > 0 && (
                    <p className="text-xs text-indigo-200 mt-2 flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {campaignsQuery.data.campaigns.filter(c => c.status === "completed").length} completed
                    </p>
                  )}
                </div>
                <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <TrendingUp className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-purple-500 to-purple-600 rounded-3xl shadow-lg p-6 border border-purple-400/20 hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-semibold mb-2">Images Generated</p>
                  <p className="text-5xl font-bold text-white mb-1">
                    {campaignsQuery.data?.analytics.totalImages || 0}
                  </p>
                  {campaignsQuery.data && campaignsQuery.data.analytics.totalImages > 0 && (
                    <p className="text-xs text-purple-200 mt-2 flex items-center gap-1">
                      <BarChart3 className="h-3 w-3" />
                      {Math.round((campaignsQuery.data.analytics.totalImages / Math.max(campaignsQuery.data.analytics.totalCampaigns, 1)) * 10) / 10} per campaign
                    </p>
                  )}
                </div>
                <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Image className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl shadow-lg p-6 border border-blue-400/20 hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-semibold mb-2">Total Views</p>
                  <p className="text-5xl font-bold text-white mb-1">
                    {analyticsQuery.data?.totalViews || 0}
                  </p>
                  {analyticsQuery.data && analyticsQuery.data.totalViews > 0 && (
                    <p className="text-xs text-blue-200 mt-2 flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      {Math.round((analyticsQuery.data.totalViews / Math.max(campaignsQuery.data?.analytics.totalCampaigns || 1, 1)) * 10) / 10} per campaign
                    </p>
                  )}
                </div>
                <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Eye className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>

          <div className="group bg-gradient-to-br from-green-500 to-green-600 rounded-3xl shadow-lg p-6 border border-green-400/20 hover:shadow-2xl hover:scale-105 transition-all duration-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-semibold mb-2">Total Exports</p>
                  <p className="text-5xl font-bold text-white mb-1">
                    {analyticsQuery.data?.totalExports || 0}
                  </p>
                  {analyticsQuery.data && analyticsQuery.data.mostExportedContentTypes.length > 0 && (
                    <p className="text-xs text-green-200 mt-2 flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {analyticsQuery.data.mostExportedContentTypes[0]?.type.replace(/_/g, " ")} most popular
                    </p>
                  )}
                </div>
                <div className="h-16 w-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Download className="h-8 w-8 text-white" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Performance Insights */}
        {analyticsQuery.data && (analyticsQuery.data.mostViewedCampaigns.length > 0 || analyticsQuery.data.mostExportedContentTypes.length > 0 || analyticsQuery.data.mostUsedTemplates.length > 0) && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-8 border border-gray-100/50 hover:shadow-xl transition-all duration-300">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center">
                <BarChart3 className="h-6 w-6 text-white" />
              </div>
              Performance Insights
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Most Viewed Campaigns */}
              {analyticsQuery.data.mostViewedCampaigns.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-600" />
                    Most Viewed Campaigns
                  </h3>
                  <div className="space-y-3">
                    {analyticsQuery.data.mostViewedCampaigns.map((campaign, idx) => (
                      <Link
                        key={campaign.id}
                        to="/campaign/$campaignId"
                        params={{ campaignId: campaign.id.toString() }}
                        className="block p-4 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl hover:from-blue-100 hover:to-indigo-100 transition-all duration-200 border border-blue-100/50 hover:shadow-md hover:scale-105 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-indigo-600 transition-colors">
                              {campaign.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-blue-600 ml-3 bg-blue-100 px-2.5 py-1 rounded-lg">
                            {campaign.viewCount} views
                          </span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Most Exported Content Types */}
              {analyticsQuery.data.mostExportedContentTypes.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600" />
                    Most Exported Content
                  </h3>
                  <div className="space-y-3">
                    {analyticsQuery.data.mostExportedContentTypes.map((item, idx) => (
                      <div
                        key={item.type}
                        className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl border border-green-100/50 hover:shadow-md transition-all duration-200 hover:scale-105"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 capitalize">
                              {item.type.replace(/_/g, " ")}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-green-600 bg-green-100 px-2.5 py-1 rounded-lg">
                            {item.count} exports
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Most Used Templates */}
              {analyticsQuery.data.mostUsedTemplates.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <Award className="h-4 w-4 text-purple-600" />
                    Most Used Templates
                  </h3>
                  <div className="space-y-3">
                    {analyticsQuery.data.mostUsedTemplates.map((template, idx) => (
                      <div
                        key={idx}
                        className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border border-purple-100/50 hover:shadow-md transition-all duration-200 hover:scale-105"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="flex-shrink-0 h-8 w-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center text-white font-bold text-sm">
                              {idx + 1}
                            </div>
                            <span className="text-sm font-semibold text-gray-900 truncate">
                              {template.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold text-purple-600 bg-purple-100 px-2.5 py-1 rounded-lg ml-3">
                            {template.count} campaigns
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Campaigns Section */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-lg p-8 border border-gray-100/50 hover:shadow-xl transition-all duration-300">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <h2 className="text-3xl font-bold text-gray-900">Your Campaigns</h2>
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors">
                <input
                  type="checkbox"
                  checked={showArchived}
                  onChange={(e) => setShowArchived(e.target.checked)}
                  className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 transition-all"
                />
                <span className="font-medium">Show archived</span>
              </label>
            </div>
            <Link
              to="/campaign-builder"
              className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105"
            >
              <Plus className="h-5 w-5" />
              New Campaign
            </Link>
          </div>

          {/* Bulk Operations Toolbar */}
          {campaignsQuery.data && campaignsQuery.data.campaigns.length > 0 && (
            <div className="mb-8 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-5 border border-gray-200/50">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSelectAllCampaigns}
                    className="flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
                  >
                    {selectedCampaignIds.length === campaignsQuery.data.campaigns.length ? (
                      <CheckSquare className="h-5 w-5 text-indigo-600" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                    {selectedCampaignIds.length > 0
                      ? `${selectedCampaignIds.length} selected`
                      : "Select all"}
                  </button>
                </div>

                {selectedCampaignIds.length > 0 && (
                  <div className="flex items-center gap-2 animate-fade-in">
                    <button
                      onClick={handleBulkArchive}
                      disabled={bulkArchiveMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 hover:scale-105"
                    >
                      <Archive className="h-4 w-4" />
                      Archive
                    </button>
                    <button
                      onClick={handleBulkDuplicate}
                      disabled={bulkDuplicateMutation.isPending}
                      className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 disabled:opacity-50 hover:scale-105"
                    >
                      <Copy className="h-4 w-4" />
                      Duplicate
                    </button>
                    <div className="relative group">
                      <button className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:scale-105">
                        <FileDown className="h-4 w-4" />
                        Export
                      </button>
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => handleBulkExport("csv")}
                          className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 rounded-t-xl transition-colors font-medium"
                        >
                          Export as CSV
                        </button>
                        <button
                          onClick={() => handleBulkExport("txt")}
                          className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 transition-colors font-medium"
                        >
                          Export as TXT
                        </button>
                        <button
                          onClick={() => handleBulkExport("json")}
                          className="block w-full text-left px-4 py-3 text-sm text-gray-700 hover:bg-indigo-50 rounded-b-xl transition-colors font-medium"
                        >
                          Export as JSON
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {campaignsQuery.isLoading ? (
            <div className="text-center py-16">
              <div className="inline-block relative">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-indigo-200 border-t-indigo-600"></div>
                <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full border-4 border-indigo-400 opacity-20"></div>
              </div>
              <p className="mt-6 text-gray-600 font-medium">Loading campaigns...</p>
            </div>
          ) : campaignsQuery.data?.campaigns.length === 0 ? (
            <div className="text-center py-16">
              <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-100 to-purple-100 animate-bounce">
                <Sparkles className="h-10 w-10 text-indigo-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">
                No campaigns yet
              </h3>
              <p className="text-gray-600 mb-8 text-lg">
                Create your first campaign to get started with AI-powered content
              </p>
              <Link
                to="/campaign-builder"
                className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:scale-105"
              >
                <Plus className="h-5 w-5" />
                Create Campaign
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaignsQuery.data?.campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className={`relative bg-gradient-to-br from-white to-gray-50 rounded-2xl p-6 border border-gray-200/50 hover:shadow-xl transition-all duration-300 group hover:scale-105 ${
                    campaign.isArchived ? "opacity-60" : ""
                  }`}
                >
                  <div className="absolute top-4 left-4 z-10">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleToggleSelectCampaign(campaign.id);
                      }}
                      className="bg-white rounded-xl p-2 shadow-md hover:bg-gray-50 transition-all hover:scale-110"
                    >
                      {selectedCampaignIds.includes(campaign.id) ? (
                        <CheckSquare className="h-5 w-5 text-indigo-600" />
                      ) : (
                        <Square className="h-5 w-5 text-gray-400" />
                      )}
                    </button>
                  </div>

                  <div className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-all">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        handleDeleteCampaign(campaign.id, campaign.name);
                      }}
                      disabled={deleteCampaignMutation.isPending}
                      className="bg-red-600 hover:bg-red-700 text-white rounded-xl p-2 shadow-md transition-all disabled:opacity-50 hover:scale-110"
                      title="Delete campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <Link
                    to="/campaign/$campaignId"
                    params={{ campaignId: campaign.id.toString() }}
                    className="block ml-10 mr-10"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-tight">
                        {campaign.name}
                      </h3>
                      <div className="flex flex-col gap-2 items-end">
                        <span
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold shadow-sm ${
                            campaign.status === "completed"
                              ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white"
                              : campaign.status === "generating"
                              ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white"
                              : "bg-gradient-to-r from-red-500 to-pink-500 text-white"
                          }`}
                        >
                          {campaign.status}
                        </span>
                        {campaign.isArchived && (
                          <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-gray-300 text-gray-700 shadow-sm">
                            archived
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm text-gray-600 font-medium">
                      <span className="flex items-center gap-1">
                        <Image className="h-4 w-4" />
                        {campaign.assetCount} assets
                      </span>
                      <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
