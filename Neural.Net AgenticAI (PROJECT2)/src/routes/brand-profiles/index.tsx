import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Sparkles, ArrowLeft, Plus, Edit2, Trash2, Palette } from "lucide-react";
import { ColorPicker } from "~/components/ColorPicker";
import { FontPicker } from "~/components/FontPicker";
import { ImageModelSelector, type ImageModel } from "~/components/ImageModelSelector";

export const Route = createFileRoute("/brand-profiles/")({
  component: BrandProfilesPage,
});

const profileSchema = z.object({
  name: z.string().min(1, "Profile name is required"),
  brandColorPrimary: z.string().optional(),
  brandColorSecondary: z.string().optional(),
  visualStyle: z.string().optional(),
  imageryPreference: z.string().optional(),
  brandThemes: z.string().optional(),
  fontFamily: z.string().optional(),
  preferredImageModel: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

function BrandProfilesPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>("sdxl");

  useEffect(() => {
    if (!token) {
      void navigate({ to: "/login" });
    }
  }, [token, navigate]);

  const profilesQuery = useQuery(
    trpc.getBrandProfiles.queryOptions(
      { authToken: token || "" },
      { enabled: !!token }
    )
  );

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
  });

  const createMutation = useMutation(
    trpc.createBrandProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Brand profile created!");
        void profilesQuery.refetch();
        setShowForm(false);
        reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create profile");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateBrandProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Brand profile updated!");
        void profilesQuery.refetch();
        setEditingProfileId(null);
        setShowForm(false);
        reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update profile");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteBrandProfile.mutationOptions({
      onSuccess: () => {
        toast.success("Brand profile deleted!");
        void profilesQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete profile");
      },
    })
  );

  const onSubmit = (data: ProfileForm) => {
    if (!token) return;
    
    if (editingProfileId) {
      updateMutation.mutate({
        authToken: token,
        profileId: editingProfileId,
        ...data,
        preferredImageModel: selectedImageModel,
      });
    } else {
      createMutation.mutate({
        authToken: token,
        ...data,
        preferredImageModel: selectedImageModel,
      });
    }
  };

  const handleEdit = (profile: any) => {
    setEditingProfileId(profile.id);
    setShowForm(true);
    setSelectedImageModel((profile.preferredImageModel as ImageModel) || "sdxl");
    reset({
      name: profile.name,
      brandColorPrimary: profile.brandColorPrimary || "#4F46E5",
      brandColorSecondary: profile.brandColorSecondary || "#7C3AED",
      visualStyle: profile.visualStyle || "",
      imageryPreference: profile.imageryPreference || "",
      brandThemes: profile.brandThemes || "",
      fontFamily: profile.fontFamily || "system-ui, -apple-system, sans-serif",
      preferredImageModel: profile.preferredImageModel || "sdxl",
    });
  };

  const handleDelete = (profileId: number) => {
    if (!token) return;
    if (confirm("Are you sure you want to delete this brand profile?")) {
      deleteMutation.mutate({ authToken: token, profileId });
    }
  };

  const handleNewProfile = () => {
    setEditingProfileId(null);
    setShowForm(true);
    setSelectedImageModel("sdxl");
    reset({
      name: "",
      brandColorPrimary: "#4F46E5",
      brandColorSecondary: "#7C3AED",
      visualStyle: "",
      imageryPreference: "",
      brandThemes: "",
      fontFamily: "system-ui, -apple-system, sans-serif",
      preferredImageModel: "sdxl",
    });
  };

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
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
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Palette className="h-8 w-8 text-indigo-600" />
              <h1 className="text-4xl font-bold text-gray-900">Brand Profiles</h1>
            </div>
            <p className="text-xl text-gray-600">
              Save and reuse your brand settings across campaigns
            </p>
          </div>
          <button
            onClick={handleNewProfile}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition"
          >
            <Plus className="h-5 w-5" />
            New Profile
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingProfileId ? "Edit Brand Profile" : "Create Brand Profile"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Profile Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                  Profile Name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="e.g., Tech Startup Brand, Luxury Fashion, Eco-Friendly"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Brand Colors */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Controller
                  name="brandColorPrimary"
                  control={control}
                  render={({ field }) => (
                    <ColorPicker
                      label="Primary Brand Color"
                      value={field.value || "#4F46E5"}
                      onChange={field.onChange}
                    />
                  )}
                />
                <Controller
                  name="brandColorSecondary"
                  control={control}
                  render={({ field }) => (
                    <ColorPicker
                      label="Secondary Brand Color"
                      value={field.value || "#7C3AED"}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>

              {/* Font Family */}
              <Controller
                name="fontFamily"
                control={control}
                render={({ field }) => (
                  <FontPicker
                    label="Brand Font"
                    value={field.value || "system-ui, -apple-system, sans-serif"}
                    onChange={field.onChange}
                  />
                )}
              />

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
                  placeholder="e.g., mountains, technology icons, nature elements, urban landscapes..."
                />
              </div>

              {/* Preferred Image Model */}
              <div>
                <ImageModelSelector
                  value={selectedImageModel}
                  onChange={(model) => {
                    setSelectedImageModel(model);
                  }}
                  label="Preferred Image Generation Model"
                  showDetails={true}
                />
                <p className="mt-2 text-sm text-gray-500">
                  This model will be pre-selected when creating campaigns with this brand profile
                </p>
              </div>

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? "Saving..."
                    : editingProfileId
                    ? "Update Profile"
                    : "Create Profile"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingProfileId(null);
                    reset();
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Profiles List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {profilesQuery.isLoading ? (
            <div className="col-span-full text-center py-12">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading profiles...</p>
            </div>
          ) : profilesQuery.data?.length === 0 ? (
            <div className="col-span-full text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-100">
              <Palette className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">No brand profiles yet</p>
              <button
                onClick={handleNewProfile}
                className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition"
              >
                <Plus className="h-5 w-5" />
                Create Your First Profile
              </button>
            </div>
          ) : (
            profilesQuery.data?.map((profile) => (
              <div
                key={profile.id}
                className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition"
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{profile.name}</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(profile)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(profile.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Color Preview */}
                <div className="flex gap-2 mb-4">
                  {profile.brandColorPrimary && (
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: profile.brandColorPrimary }}
                      title="Primary Color"
                    />
                  )}
                  {profile.brandColorSecondary && (
                    <div
                      className="w-12 h-12 rounded-lg border-2 border-gray-200 shadow-sm"
                      style={{ backgroundColor: profile.brandColorSecondary }}
                      title="Secondary Color"
                    />
                  )}
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {profile.visualStyle && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Style:</span> {profile.visualStyle}
                    </p>
                  )}
                  {profile.imageryPreference && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Imagery:</span> {profile.imageryPreference}
                    </p>
                  )}
                  {profile.fontFamily && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Font:</span>{" "}
                      <span style={{ fontFamily: profile.fontFamily }}>
                        {profile.fontFamily.split(",")[0]}
                      </span>
                    </p>
                  )}
                  {profile.preferredImageModel && (
                    <p className="text-gray-600">
                      <span className="font-semibold">Image Model:</span> {profile.preferredImageModel.toUpperCase()}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
