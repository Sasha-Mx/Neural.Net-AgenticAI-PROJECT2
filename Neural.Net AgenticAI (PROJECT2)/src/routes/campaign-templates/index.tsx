import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Sparkles, ArrowLeft, Plus, Edit2, Trash2, FileText, Lock } from "lucide-react";

export const Route = createFileRoute("/campaign-templates/")({
  component: CampaignTemplatesPage,
});

const templateSchema = z.object({
  name: z.string().min(1, "Template name is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  defaultGoal: z.string().min(10, "Please provide more detail about the default goal"),
  defaultTone: z.string().min(1, "Default tone is required"),
  defaultAudience: z.string().min(1, "Default audience is required"),
  defaultKeywords: z.string().optional(),
  promptInstructions: z.string().min(10, "Please provide detailed prompt instructions"),
});

type TemplateForm = z.infer<typeof templateSchema>;

function CampaignTemplatesPage() {
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  const [editingTemplateId, setEditingTemplateId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    if (!token) {
      void navigate({ to: "/login" });
    }
  }, [token, navigate]);

  const templatesQuery = useQuery(
    trpc.getCampaignTemplates.queryOptions(
      { authToken: token || "" },
      { enabled: !!token }
    )
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TemplateForm>({
    resolver: zodResolver(templateSchema),
  });

  const createMutation = useMutation(
    trpc.createCampaignTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("Template created!");
        void templatesQuery.refetch();
        setShowForm(false);
        reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to create template");
      },
    })
  );

  const updateMutation = useMutation(
    trpc.updateCampaignTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("Template updated!");
        void templatesQuery.refetch();
        setEditingTemplateId(null);
        setShowForm(false);
        reset();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to update template");
      },
    })
  );

  const deleteMutation = useMutation(
    trpc.deleteCampaignTemplate.mutationOptions({
      onSuccess: () => {
        toast.success("Template deleted!");
        void templatesQuery.refetch();
      },
      onError: (error) => {
        toast.error(error.message || "Failed to delete template");
      },
    })
  );

  const onSubmit = (data: TemplateForm) => {
    if (!token) return;
    
    if (editingTemplateId) {
      updateMutation.mutate({
        authToken: token,
        templateId: editingTemplateId,
        ...data,
      });
    } else {
      createMutation.mutate({
        authToken: token,
        ...data,
      });
    }
  };

  const handleEdit = (template: any) => {
    setEditingTemplateId(template.id);
    setShowForm(true);
    reset({
      name: template.name,
      description: template.description,
      category: template.category,
      defaultGoal: template.defaultGoal,
      defaultTone: template.defaultTone,
      defaultAudience: template.defaultAudience,
      defaultKeywords: template.defaultKeywords || "",
      promptInstructions: template.promptInstructions,
    });
  };

  const handleDelete = (templateId: number) => {
    if (!token) return;
    if (confirm("Are you sure you want to delete this template?")) {
      deleteMutation.mutate({ authToken: token, templateId });
    }
  };

  const handleNewTemplate = () => {
    setEditingTemplateId(null);
    setShowForm(true);
    reset({
      name: "",
      description: "",
      category: "product_launch",
      defaultGoal: "",
      defaultTone: "professional",
      defaultAudience: "",
      defaultKeywords: "",
      promptInstructions: "",
    });
  };

  if (!token) {
    return null;
  }

  // Separate user templates from system templates
  const userTemplates = templatesQuery.data?.filter((t) => !t.isDefault) || [];
  const systemTemplates = templatesQuery.data?.filter((t) => t.isDefault) || [];

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
              <FileText className="h-8 w-8 text-indigo-600" />
              <h1 className="text-4xl font-bold text-gray-900">Campaign Templates</h1>
            </div>
            <p className="text-xl text-gray-600">
              Create and manage reusable campaign templates
            </p>
          </div>
          <button
            onClick={handleNewTemplate}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition"
          >
            <Plus className="h-5 w-5" />
            New Template
          </button>
        </div>

        {/* Form */}
        {showForm && (
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">
              {editingTemplateId ? "Edit Template" : "Create Template"}
            </h2>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Template Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-semibold text-gray-900 mb-2">
                  Template Name
                </label>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="e.g., Product Launch Template, Holiday Sale Template"
                />
                {errors.name && (
                  <p className="mt-2 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-gray-900 mb-2">
                  Description
                </label>
                <textarea
                  id="description"
                  {...register("description")}
                  rows={2}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  placeholder="Brief description of what this template is for..."
                />
                {errors.description && (
                  <p className="mt-2 text-sm text-red-600">{errors.description.message}</p>
                )}
              </div>

              {/* Category */}
              <div>
                <label htmlFor="category" className="block text-sm font-semibold text-gray-900 mb-2">
                  Category
                </label>
                <select
                  id="category"
                  {...register("category")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                >
                  <option value="product_launch">Product Launch</option>
                  <option value="seasonal_sale">Seasonal Sale</option>
                  <option value="brand_awareness">Brand Awareness</option>
                  <option value="event_promotion">Event Promotion</option>
                  <option value="content_marketing">Content Marketing</option>
                  <option value="customer_engagement">Customer Engagement</option>
                  <option value="other">Other</option>
                </select>
                {errors.category && (
                  <p className="mt-2 text-sm text-red-600">{errors.category.message}</p>
                )}
              </div>

              {/* Default Goal */}
              <div>
                <label htmlFor="defaultGoal" className="block text-sm font-semibold text-gray-900 mb-2">
                  Default Campaign Goal
                </label>
                <textarea
                  id="defaultGoal"
                  {...register("defaultGoal")}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  placeholder="Describe the default goal for campaigns using this template..."
                />
                {errors.defaultGoal && (
                  <p className="mt-2 text-sm text-red-600">{errors.defaultGoal.message}</p>
                )}
              </div>

              {/* Default Tone */}
              <div>
                <label htmlFor="defaultTone" className="block text-sm font-semibold text-gray-900 mb-2">
                  Default Tone & Style
                </label>
                <select
                  id="defaultTone"
                  {...register("defaultTone")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                >
                  <option value="professional">Professional & Corporate</option>
                  <option value="friendly">Friendly & Conversational</option>
                  <option value="bold">Bold & Energetic</option>
                  <option value="elegant">Elegant & Sophisticated</option>
                  <option value="playful">Playful & Fun</option>
                  <option value="inspirational">Inspirational & Motivating</option>
                </select>
                {errors.defaultTone && (
                  <p className="mt-2 text-sm text-red-600">{errors.defaultTone.message}</p>
                )}
              </div>

              {/* Default Audience */}
              <div>
                <label htmlFor="defaultAudience" className="block text-sm font-semibold text-gray-900 mb-2">
                  Default Target Audience
                </label>
                <input
                  id="defaultAudience"
                  type="text"
                  {...register("defaultAudience")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="e.g., Tech-savvy millennials, Small business owners"
                />
                {errors.defaultAudience && (
                  <p className="mt-2 text-sm text-red-600">{errors.defaultAudience.message}</p>
                )}
              </div>

              {/* Default Keywords */}
              <div>
                <label htmlFor="defaultKeywords" className="block text-sm font-semibold text-gray-900 mb-2">
                  Default Keywords <span className="text-gray-500 font-normal">(Optional)</span>
                </label>
                <input
                  id="defaultKeywords"
                  type="text"
                  {...register("defaultKeywords")}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                  placeholder="innovation, sustainability, growth"
                />
                <p className="mt-2 text-sm text-gray-500">
                  Comma-separated keywords to guide the AI
                </p>
              </div>

              {/* Prompt Instructions */}
              <div>
                <label htmlFor="promptInstructions" className="block text-sm font-semibold text-gray-900 mb-2">
                  AI Prompt Instructions
                </label>
                <textarea
                  id="promptInstructions"
                  {...register("promptInstructions")}
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition resize-none"
                  placeholder="Special instructions for AI agents when using this template. Be specific about what makes this template unique..."
                />
                {errors.promptInstructions && (
                  <p className="mt-2 text-sm text-red-600">{errors.promptInstructions.message}</p>
                )}
                <p className="mt-2 text-sm text-gray-500">
                  These instructions help AI agents understand the specific requirements for this template type
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
                    : editingTemplateId
                    ? "Update Template"
                    : "Create Template"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingTemplateId(null);
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

        {/* User Templates */}
        {userTemplates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 hover:shadow-xl transition"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-900 mb-1">{template.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                        {template.category.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleEdit(template)}
                        className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-semibold">Tone:</span> {template.defaultTone}</p>
                    <p><span className="font-semibold">Audience:</span> {template.defaultAudience}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* System Templates */}
        {systemTemplates.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">System Templates</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {systemTemplates.map((template) => (
                <div
                  key={template.id}
                  className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl shadow-lg p-6 border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-xl font-bold text-gray-900">{template.name}</h3>
                        <Lock className="h-4 w-4 text-gray-400" title="System template" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{template.description}</p>
                      <span className="inline-block px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded-full">
                        {template.category.replace(/_/g, " ")}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p><span className="font-semibold">Tone:</span> {template.defaultTone}</p>
                    <p><span className="font-semibold">Audience:</span> {template.defaultAudience}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {templatesQuery.isLoading ? (
          <div className="text-center py-12">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading templates...</p>
          </div>
        ) : userTemplates.length === 0 && systemTemplates.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl shadow-lg border border-gray-100">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">No templates yet</p>
            <button
              onClick={handleNewTemplate}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg font-semibold hover:from-indigo-700 hover:to-purple-700 transition"
            >
              <Plus className="h-5 w-5" />
              Create Your First Template
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}
