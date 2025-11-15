import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Sparkles, ArrowLeft, Wand2 } from "lucide-react";
import { ImageModelSelector, type ImageModel } from "~/components/ImageModelSelector";

export const Route = createFileRoute("/campaign-builder/")({
  component: CampaignBuilderPage,
});

const campaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required"),
  goal: z.string().min(10, "Please provide more detail about your goal"),
  tone: z.string().min(1, "Tone is required"),
  audience: z.string().min(1, "Target audience is required"),
  keywords: z.string().optional(),
  // New branding fields for better image generation
  brandColorPrimary: z.string().optional(),
  brandColorSecondary: z.string().optional(),
  visualStyle: z.string().optional(),
  imageryPreference: z.string().optional(),
  brandThemes: z.string().optional(),
  imageModel: z.string().optional().default("sdxl"),
  templateId: z.number().optional(),
});

type CampaignForm = z.infer<typeof campaignSchema>;

function CampaignBuilderPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>("sdxl");

  // Redirect if not authenticated
  useEffect(() => {
    if (!token) {
      void navigate({ to: "/login" });
    }
  }, [token, navigate]);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
  });

  const profilesQuery = useQuery(
    trpc.getBrandProfiles.queryOptions(
      { authToken: token || "" },
      { enabled: !!token }
    )
  );

  const templatesQuery = useQuery(
    trpc.getCampaignTemplates.queryOptions(
      { authToken: token || "" },
      { enabled: !!token }
    )
  );

  // Separate user templates from system templates
  const userTemplates = templatesQuery.data?.filter((t) => !t.isDefault) || [];
  const systemTemplates = templatesQuery.data?.filter((t) => t.isDefault) || [];

  const createCampaignMutation = useMutation(
    trpc.createCampaign.mutationOptions({
      onSuccess: (data) => {
        toast.success("Campaign created! AI agents are starting work...");
        void navigate({
          to: "/workspace/$campaignId",
          params: { campaignId: data.id.toString() },
        });
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create campaign");
      },
    })
  );

  const handleProfileSelect = (profileId: string) => {
    if (!profileId) return;
    
    const profile = profilesQuery.data?.find((p) => p.id === parseInt(profileId));
    if (!profile) return;

    // Auto-fill form fields with profile data
    if (profile.brandColorPrimary) setValue("brandColorPrimary", profile.brandColorPrimary);
    if (profile.brandColorSecondary) setValue("brandColorSecondary", profile.brandColorSecondary);
    if (profile.visualStyle) setValue("visualStyle", profile.visualStyle);
    if (profile.imageryPreference) setValue("imageryPreference", profile.imageryPreference);
    if (profile.brandThemes) setValue("brandThemes", profile.brandThemes);
    if (profile.preferredImageModel) {
      setValue("imageModel", profile.preferredImageModel);
      setSelectedImageModel(profile.preferredImageModel as ImageModel);
    }
    
    toast.success(`Applied brand profile: ${profile.name}`);
  };

  const handleTemplateSelect = (templateId: number) => {
    const template = templatesQuery.data?.find((t) => t.id === templateId);
    if (!template) return;

    setSelectedTemplateId(templateId);
    setValue("templateId", templateId);
    setValue("goal", template.defaultGoal);
    setValue("tone", template.defaultTone);
    setValue("audience", template.defaultAudience);
    if (template.defaultKeywords) {
      setValue("keywords", template.defaultKeywords);
    }
    
    toast.success(`Applied template: ${template.name}`);
  };

  const onSubmit = (data: CampaignForm) => {
    if (!token) return;
    createCampaignMutation.mutate({
      authToken: token,
      ...data,
      imageModel: selectedImageModel,
      templateId: selectedTemplateId || undefined,
    });
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/dashboard"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition"
            >
              <ArrowLeft className="h-5 w-5" />
              Back to Dashboard
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center h-16 w-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-4">
            <Wand2 className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-3">
            Create a New Campaign
          </h1>
          <p className="text-xl text-gray-600">
            Tell us about your vision, and our AI agents will bring it to life
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Template Selection */}
            {templatesQuery.data && templatesQuery.data.length > 0 && (
              <div className="border-b border-gray-200 pb-6 mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    Start with a Template <span className="text-gray-500 font-normal text-sm">(Optional)</span>
                  </h3>
                  <Link
                    to="/campaign-templates"
                    className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Manage Templates →
                  </Link>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Choose a pre-built template to quickly get started with proven campaign structures
                </p>
                
                {/* User Templates */}
                {userTemplates.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Your Templates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {userTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateSelect(template.id)}
                          className={`text-left p-4 rounded-lg border-2 transition ${
                            selectedTemplateId === template.id
                              ? "border-indigo-600 bg-indigo-50"
                              : "border-indigo-200 bg-indigo-50/50 hover:border-indigo-300"
                          }`}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{template.name}</h4>
                            <span className="text-xs px-2 py-1 bg-indigo-100 text-indigo-700 rounded-full">
                              Custom
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          <span className="text-xs text-gray-500 capitalize">
                            {template.category.replace(/_/g, " ")}
                          </span>
                          {selectedTemplateId === template.id && (
                            <span className="block mt-2 text-xs font-medium text-indigo-600">
                              ✓ Selected
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* System Templates */}
                {systemTemplates.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">System Templates</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {systemTemplates.map((template) => (
                        <button
                          key={template.id}
                          type="button"
                          onClick={() => handleTemplateSelect(template.id)}
                          className={`text-left p-4 rounded-lg border-2 transition ${
                            selectedTemplateId === template.id
                              ? "border-indigo-600 bg-indigo-50"
                              : "border-gray-200 hover:border-indigo-300 bg-white"
                          }`}
                        >
                          <h4 className="font-semibold text-gray-900 mb-1">{template.name}</h4>
                          <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                          <span className="text-xs text-gray-500 capitalize">
                            {template.category.replace(/_/g, " ")}
                          </span>
                          {selectedTemplateId === template.id && (
                            <span className="block mt-2 text-xs font-medium text-indigo-600">
                              ✓ Selected
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Campaign Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                Campaign Name
              </label>
              <input
                id="name"
                type="text"
                {...register("name")}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="e.g., Summer Product Launch 2024"
              />
              {errors.name && (
                <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Goal */}
            <div>
              <label htmlFor="goal" className="block text-sm font-semibold text-gray-900 mb-2">
                Campaign Goal
              </label>
              <textarea
                id="goal"
                {...register("goal")}
                rows={4}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                placeholder="Describe what you want to achieve with this campaign. Be specific about your objectives, key messages, and desired outcomes..."
              />
              {errors.goal && (
                <p className="mt-2 text-sm text-red-600">{errors.goal.message}</p>
              )}
            </div>

            {/* Tone */}
            <div>
              <label htmlFor="tone" className="block text-sm font-semibold text-gray-900 mb-2">
                Tone & Style
              </label>
              <select
                id="tone"
                {...register("tone")}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="">Select a tone...</option>
                <option value="professional">Professional & Corporate</option>
                <option value="friendly">Friendly & Conversational</option>
                <option value="bold">Bold & Energetic</option>
                <option value="elegant">Elegant & Sophisticated</option>
                <option value="playful">Playful & Fun</option>
                <option value="inspirational">Inspirational & Motivating</option>
              </select>
              {errors.tone && (
                <p className="mt-2 text-sm text-red-600">{errors.tone.message}</p>
              )}
            </div>

            {/* Target Audience */}
            <div>
              <label htmlFor="audience" className="block text-sm font-semibold text-gray-900 mb-2">
                Target Audience
              </label>
              <input
                id="audience"
                type="text"
                {...register("audience")}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="e.g., Tech-savvy millennials, Small business owners, Fashion enthusiasts"
              />
              {errors.audience && (
                <p className="mt-2 text-sm text-red-600">{errors.audience.message}</p>
              )}
            </div>

            {/* Keywords (Optional) */}
            <div>
              <label htmlFor="keywords" className="block text-sm font-semibold text-gray-900 mb-2">
                Keywords <span className="text-gray-500 font-normal">(Optional)</span>
              </label>
              <input
                id="keywords"
                type="text"
                {...register("keywords")}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                placeholder="innovation, sustainability, growth"
              />
              <p className="mt-2 text-sm text-gray-500">
                Comma-separated keywords to guide the AI
              </p>
            </div>

            {/* Brand Profile Selector */}
            {profilesQuery.data && profilesQuery.data.length > 0 && (
              <div className="border-t border-gray-200 pt-6">
                <div className="bg-indigo-50 rounded-xl p-6 border border-indigo-100">
                  <h3 className="text-lg font-semibold text-indigo-900 mb-3">
                    Quick Start: Use a Brand Profile
                  </h3>
                  <p className="text-sm text-indigo-700 mb-4">
                    Select a saved brand profile to auto-fill your brand identity settings
                  </p>
                  <div className="flex gap-3">
                    <select
                      onChange={(e) => handleProfileSelect(e.target.value)}
                      className="flex-1 px-4 py-3 rounded-lg border border-indigo-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition bg-white"
                      defaultValue=""
                    >
                      <option value="">Choose a brand profile...</option>
                      {profilesQuery.data.map((profile) => (
                        <option key={profile.id} value={profile.id}>
                          {profile.name}
                        </option>
                      ))}
                    </select>
                    <Link
                      to="/brand-profiles"
                      className="px-6 py-3 bg-white border border-indigo-200 text-indigo-700 rounded-lg font-medium hover:bg-indigo-50 transition whitespace-nowrap"
                    >
                      Manage Profiles
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Brand Colors */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Brand Identity <span className="text-gray-500 font-normal text-sm">(Optional but recommended)</span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Help our AI generate images that match your brand's visual identity
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="brandColorPrimary" className="block text-sm font-semibold text-gray-900 mb-2">
                    Primary Brand Color
                  </label>
                  <input
                    id="brandColorPrimary"
                    type="text"
                    {...register("brandColorPrimary")}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="e.g., navy blue, #FF5733, vibrant red"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Color name or hex code
                  </p>
                </div>
                
                <div>
                  <label htmlFor="brandColorSecondary" className="block text-sm font-semibold text-gray-900 mb-2">
                    Secondary Brand Color
                  </label>
                  <input
                    id="brandColorSecondary"
                    type="text"
                    {...register("brandColorSecondary")}
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                    placeholder="e.g., gold, #FFC300, warm orange"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Color name or hex code
                  </p>
                </div>
              </div>
            </div>

            {/* Visual Style */}
            <div>
              <label htmlFor="visualStyle" className="block text-sm font-semibold text-gray-900 mb-2">
                Visual Style
              </label>
              <select
                id="visualStyle"
                {...register("visualStyle")}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="">Select a visual style...</option>
                <option value="minimalist">Minimalist & Clean</option>
                <option value="vibrant">Vibrant & Colorful</option>
                <option value="corporate">Corporate & Professional</option>
                <option value="artistic">Artistic & Creative</option>
                <option value="modern">Modern & Sleek</option>
                <option value="vintage">Vintage & Retro</option>
                <option value="luxurious">Luxurious & Premium</option>
                <option value="organic">Organic & Natural</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                The overall aesthetic for your campaign visuals
              </p>
            </div>

            {/* Imagery Preference */}
            <div>
              <label htmlFor="imageryPreference" className="block text-sm font-semibold text-gray-900 mb-2">
                Imagery Preference
              </label>
              <select
                id="imageryPreference"
                {...register("imageryPreference")}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
              >
                <option value="">Select imagery type...</option>
                <option value="photography">Photorealistic Photography</option>
                <option value="illustration">Digital Illustration</option>
                <option value="abstract">Abstract & Conceptual</option>
                <option value="geometric">Geometric & Patterns</option>
                <option value="mixed">Mixed Media</option>
                <option value="3d">3D Rendered</option>
              </select>
              <p className="mt-2 text-sm text-gray-500">
                The type of imagery that best represents your brand
              </p>
            </div>

            {/* Brand Themes */}
            <div>
              <label htmlFor="brandThemes" className="block text-sm font-semibold text-gray-900 mb-2">
                Visual Themes & Motifs
              </label>
              <textarea
                id="brandThemes"
                {...register("brandThemes")}
                rows={3}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                placeholder="e.g., mountains, technology icons, nature elements, urban landscapes, geometric shapes..."
              />
              <p className="mt-2 text-sm text-gray-500">
                Specific visual elements or themes that represent your brand
              </p>
            </div>

            {/* Image Generation Model */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                Image Generation <span className="text-gray-500 font-normal text-sm">(Optional)</span>
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Choose which AI model to use for generating campaign visuals. All models are open-source and free to use.
              </p>
              
              <ImageModelSelector
                value={selectedImageModel}
                onChange={(model) => {
                  setSelectedImageModel(model);
                  setValue("imageModel", model);
                }}
                label="Preferred Image Model"
                showDetails={true}
              />
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={createCampaignMutation.isPending}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 group"
              >
                {createCampaignMutation.isPending ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                    Creating Campaign...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
                    Generate Campaign with AI
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Info Section */}
        <div className="mt-8 bg-indigo-50 rounded-xl p-6 border border-indigo-100">
          <h3 className="font-semibold text-indigo-900 mb-3">What happens next?</h3>
          <ul className="space-y-2 text-indigo-800">
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-1">•</span>
              <span>Our WriterAgent will craft compelling copy based on your brief</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-1">•</span>
              <span>BrandCheckerAgent validates tone and brand consistency</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-1">•</span>
              <span>LegalAgent reviews content for compliance</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-indigo-600 mt-1">•</span>
              <span>DesignerAgent creates stunning visuals to match your message</span>
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
