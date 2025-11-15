import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSubscription } from "@trpc/tanstack-react-query";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTRPC } from "~/trpc/react";
import { useAuthStore } from "~/stores/auth";
import { useWorkspaceStore } from "~/stores/workspace";
import { useEffect, useState, Fragment } from "react";
import { Sparkles, CheckCircle, Loader2, ArrowRight, Edit2, RefreshCw, Save, X, Wand2, History, ImageIcon } from "lucide-react";
import toast from "react-hot-toast";
import { Dialog, Transition } from "@headlessui/react";
import { ImageModelSelector, type ImageModel } from "~/components/ImageModelSelector";
import { PromptSuggestions } from "~/components/PromptSuggestions";
import { ImageHistory, type ImageHistoryEntry } from "~/components/ImageHistory";
import { imageToasts, campaignToasts, actionToasts } from "~/utils/toasts";

/**
 * WORKSPACE PAGE - MULTI-AGENT CREATIVE STUDIO
 * 
 * This is the main workspace where users interact with AI-generated campaign content.
 * 
 * **REGENERATE WORKFLOW (TEXT CONTENT):**
 * 1. User clicks "Regenerate" button for tagline, social posts, or ad copy
 * 2. Modal opens allowing user to provide feedback and preferences
 * 3. handleRegenerateContent() is called, which:
 *    - Validates inputs and gets the correct asset ID
 *    - Calls regenerateTextMutation with preferences
 *    - Backend (regenerateTextContent.ts) uses AI to generate new content
 *    - On success: Updates editableContent state, pushes to workspace store history, refetches campaign
 *    - On error: Shows user-friendly error toast
 * 4. User can undo/redo changes using the workspace store
 * 5. User clicks "Save" to persist changes via updateTextMutation
 * 
 * **REGENERATE WORKFLOW (IMAGES):**
 * 1. User selects a model from ImageModelSelector
 * 2. User optionally enters a custom prompt or uses PromptSuggestions
 * 3. handleRegenerateImage() is called, which:
 *    - Validates inputs (assetId, token)
 *    - Calls regenerateImageMutation with model and prompt
 *    - Backend (regenerateImage.ts) calls generateOpenSourceImage utility
 *    - Image generation happens via HuggingFace or Replicate API
 *    - Generated image is uploaded to MinIO storage
 *    - Asset record is updated with new URL
 *    - On success: Updates generatedImages state, refetches image history
 *    - On error: Shows user-friendly error toast with suggestions
 * 4. User can view image history and select previous generations
 * 5. Selected image is automatically saved to the campaign
 * 
 * **SAVE WORKFLOW:**
 * 1. User edits content in text areas
 * 2. User clicks "Save" button
 * 3. handleSaveContent() is called, which:
 *    - Validates inputs and gets the correct asset ID
 *    - Pushes current state to workspace store (for undo/redo)
 *    - Calls updateTextMutation to save to backend
 *    - Backend (updateTextAsset.ts) updates the asset record
 *    - On success: Refetches campaign data, shows success toast
 *    - On error: Shows error toast, does not update workspace store
 * 4. Changes are now persisted and will appear on the campaign details page
 * 
 * **ERROR HANDLING:**
 * - All async operations are wrapped in try/catch blocks
 * - User-friendly error messages are shown via toast notifications
 * - Errors are logged to console for debugging
 * - Failed operations do not leave the UI in an inconsistent state
 * - Users can always retry failed operations
 * 
 * **STATE MANAGEMENT:**
 * - editableContent: Local state for current content being edited
 * - workspace store: Manages undo/redo history
 * - generatedImages: Array of generated image URLs
 * - Various asset IDs: Track which backend assets to update
 * - Mutations: Handle all backend communication with loading/error states
 * 
 * **KEY COMPONENTS:**
 * - ImageModelSelector: Allows users to choose image generation model
 * - PromptSuggestions: Provides AI-powered prompt suggestions
 * - ImageHistory: Shows history of generated images
 * - Regenerate Modal: Collects user preferences for content regeneration
 */

export const Route = createFileRoute("/workspace/$campaignId/")({
  component: WorkspacePage,
});

type AgentStatus = {
  agent: string;
  status: "pending" | "working" | "completed";
  message?: string;
  output?: any;
};

function WorkspacePage() {
  const { campaignId } = Route.useParams();
  const navigate = useNavigate();
  const trpc = useTRPC();
  const { token } = useAuthStore();
  
  // Extract Zustand store state and methods (stable references)
  const {
    pushState,
    undo,
    redo,
    canUndo: canUndoFn,
    canRedo: canRedoFn,
    getCurrentState,
    reset,
    currentIndex,
  } = useWorkspaceStore();
  
  const canUndo = canUndoFn();
  const canRedo = canRedoFn();
  
  // All state declarations first
  const [agents, setAgents] = useState<AgentStatus[]>([
    { agent: "WriterAgent", status: "pending" },
    { agent: "BrandCheckerAgent", status: "pending" },
    { agent: "LegalAgent", status: "pending" },
    { agent: "DesignerAgent", status: "pending" },
  ]);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const [editableContent, setEditableContent] = useState<{
    tagline: string;
    socialMediaPosts: {
      twitter: string;
      linkedin: string;
      instagram: string;
      facebook: string;
    };
    adCopy: {
      headline: string;
      bodyShort: string;
      bodyLong: string;
      cta: string;
    };
    emailSubjectLines: string[];
  }>({
    tagline: "",
    socialMediaPosts: {
      twitter: "",
      linkedin: "",
      instagram: "",
      facebook: "",
    },
    adCopy: {
      headline: "",
      bodyShort: "",
      bodyLong: "",
      cta: "",
    },
    emailSubjectLines: [],
  });
  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [customImagePrompt, setCustomImagePrompt] = useState("");
  const [selectedImageModel, setSelectedImageModel] = useState<ImageModel>("sdxl");
  const [textAssetId, setTextAssetId] = useState<number | null>(null);
  const [imageAssetId, setImageAssetId] = useState<number | null>(null);
  const [socialMediaAssetId, setSocialMediaAssetId] = useState<number | null>(null);
  const [adCopyAssetId, setAdCopyAssetId] = useState<number | null>(null);
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regeneratingContentType, setRegeneratingContentType] = useState<'tagline' | 'social' | 'adCopy' | null>(null);
  const [regeneratePreferences, setRegeneratePreferences] = useState({
    feedback: "",
    tone: "",
    length: "",
    tags: [] as string[],
    customInstructions: "",
  });
  const [availableTags] = useState([
    "SEO-optimized",
    "Punchy",
    "Emotional",
    "Humorous",
    "Data-driven",
    "Storytelling",
    "Action-oriented",
    "Conversational",
  ]);
  const [showImageHistory, setShowImageHistory] = useState(false);

  // All queries and mutations
  const campaignQuery = useQuery(
    trpc.getCampaign.queryOptions({
      authToken: token || "",
      campaignId: parseInt(campaignId),
    })
  );

  const imageHistoryQuery = useQuery(
    trpc.getImageHistory.queryOptions({
      authToken: token || "",
      campaignId: parseInt(campaignId),
    })
  );

  const updateTextMutation = useMutation(
    trpc.updateTextAsset.mutationOptions({
      onSuccess: async () => {
        setEditingSection(null);
        // Refetch campaign data to show updated content
        await campaignQuery.refetch();
        actionToasts.saveSuccess();
      },
      onError: (error) => {
        actionToasts.saveError(error.message);
      },
    })
  );

  const updateImageSelectionMutation = useMutation(
    trpc.updateImageSelection.mutationOptions({
      onSuccess: () => {
        void imageHistoryQuery.refetch();
      },
    })
  );

  const regenerateImageMutation = useMutation(
    trpc.regenerateImage.mutationOptions({
      onSuccess: (data) => {
        // Update the displayed images with the new one at the front
        setGeneratedImages((prev) => [data.url, ...prev.slice(0, 2)]);
        setCustomImagePrompt("");
        imageToasts.success(data.model);
        // Refetch image history to show the new image
        void imageHistoryQuery.refetch();
      },
      onError: (error) => {
        console.error("Image generation error:", error);
        // Show user-friendly error message
        imageToasts.error(error.message);
      },
    })
  );

  const regenerateTextMutation = useMutation(
    trpc.regenerateTextContent.mutationOptions({
      onSuccess: (data) => {
        // Update the editable content with regenerated content
        if (data.contentType === 'tagline') {
          setEditableContent((prev) => ({
            ...prev,
            tagline: data.content.tagline,
          }));
        } else if (data.contentType === 'social') {
          setEditableContent((prev) => ({
            ...prev,
            socialMediaPosts: data.content,
          }));
        } else if (data.contentType === 'adCopy') {
          setEditableContent((prev) => ({
            ...prev,
            adCopy: data.content,
          }));
        }
        
        // Push to undo/redo history with the complete updated state
        const updatedContent = {
          ...editableContent,
          ...(data.contentType === 'tagline' && { tagline: data.content.tagline }),
          ...(data.contentType === 'social' && { socialMediaPosts: data.content }),
          ...(data.contentType === 'adCopy' && { adCopy: data.content }),
        };
        pushState(updatedContent);
        
        // Close modal and reset preferences
        setRegenerateModalOpen(false);
        setRegeneratePreferences({
          feedback: "",
          tone: "",
          length: "",
          tags: [],
          customInstructions: "",
        });
        
        campaignToasts.regenerateSuccess(
          data.contentType === 'tagline' ? 'Tagline' : 
          data.contentType === 'social' ? 'Social Media Posts' : 
          'Ad Copy'
        );
        
        // Refetch campaign to ensure consistency
        void campaignQuery.refetch();
      },
      onError: (error) => {
        console.error("Text regeneration error:", error);
        campaignToasts.regenerateError(error.message);
      },
    })
  );

  const subscription = useSubscription(
    trpc.campaignProgress.subscriptionOptions(
      {
        authToken: token || "",
        campaignId: parseInt(campaignId),
      },
      {
        enabled: !!token,
        onData: (data) => {
          if (data.type === "agent_start") {
            setAgents((prev) =>
              prev.map((a) =>
                a.agent === data.agent
                  ? { ...a, status: "working", message: data.message }
                  : a
              )
            );
          } else if (data.type === "agent_complete") {
            setAgents((prev) =>
              prev.map((a) =>
                a.agent === data.agent
                  ? { ...a, status: "completed", output: data.output }
                  : a
              )
            );
          } else if (data.type === "image_generated") {
            setGeneratedImages((prev) => [...prev, data.imageUrl]);
          } else if (data.type === "complete") {
            setIsComplete(true);
          }
        },
        onError: (error) => {
          console.error("Subscription error:", error);
        },
      }
    )
  );

  // All useEffect hooks
  useEffect(() => {
    if (!token) {
      void navigate({ to: "/login" });
    }
  }, [token, navigate]);

  useEffect(() => {
    const writerAgent = agents.find((a) => a.agent === "WriterAgent");
    if (writerAgent?.status === "completed" && writerAgent.output) {
      const currentState = getCurrentState();
      const output = writerAgent.output;
      
      if (!currentState || currentState.tagline !== output.tagline) {
        pushState({
          tagline: output.tagline || "",
          socialMediaPosts: output.socialMediaPosts || {
            twitter: "",
            linkedin: "",
            instagram: "",
            facebook: "",
          },
          adCopy: output.adCopy || {
            headline: "",
            bodyShort: "",
            bodyLong: "",
            cta: "",
          },
          emailSubjectLines: output.emailSubjectLines || [],
        });
        
        setEditableContent({
          tagline: output.tagline || "",
          socialMediaPosts: output.socialMediaPosts || {
            twitter: "",
            linkedin: "",
            instagram: "",
            facebook: "",
          },
          adCopy: output.adCopy || {
            headline: "",
            bodyShort: "",
            bodyLong: "",
            cta: "",
          },
          emailSubjectLines: output.emailSubjectLines || [],
        });
      }
    }
  }, [agents, getCurrentState, pushState]);

  useEffect(() => {
    const currentState = getCurrentState();
    if (currentState) {
      setEditableContent({
        tagline: currentState.tagline,
        socialMediaPosts: currentState.socialMediaPosts,
        adCopy: currentState.adCopy,
        emailSubjectLines: currentState.emailSubjectLines,
      });
    }
  }, [currentIndex, getCurrentState]);

  useEffect(() => {
    if (campaignQuery.data?.assets) {
      const textAsset = campaignQuery.data.assets.find((a) => a.type === "text");
      const imageAsset = campaignQuery.data.assets.find((a) => a.type === "image");
      const socialAsset = campaignQuery.data.assets.find((a) => a.type === "social_media_post");
      const adAsset = campaignQuery.data.assets.find((a) => a.type === "ad_copy");
      
      if (textAsset) setTextAssetId(textAsset.id);
      if (imageAsset) setImageAssetId(imageAsset.id);
      if (socialAsset) setSocialMediaAssetId(socialAsset.id);
      if (adAsset) setAdCopyAssetId(adAsset.id);
    }
  }, [campaignQuery.data?.assets]);

  useEffect(() => {
    return () => {
      reset();
    };
  }, [reset]);

  // Handler functions
  const handleSaveContent = async (contentType: 'tagline' | 'social' | 'adCopy') => {
    if (!token) {
      actionToasts.genericError("You must be logged in to save changes");
      return;
    }

    let assetId: number | null = null;
    let content: any = {};

    if (contentType === 'tagline' && textAssetId) {
      assetId = textAssetId;
      // For tagline, preserve the description if it exists
      const currentTextAsset = campaignQuery.data?.assets.find((a) => a.type === "text");
      const existingContent = currentTextAsset?.content as any || {};
      content = { 
        ...existingContent,
        tagline: editableContent.tagline 
      };
    } else if (contentType === 'social' && socialMediaAssetId) {
      assetId = socialMediaAssetId;
      content = editableContent.socialMediaPosts;
    } else if (contentType === 'adCopy' && adCopyAssetId) {
      assetId = adCopyAssetId;
      content = editableContent.adCopy;
    }

    if (!assetId) {
      const assetTypeName = contentType === 'tagline' ? 'Tagline' : contentType === 'social' ? 'Social Media Posts' : 'Ad Copy';
      actionToasts.genericError(`${assetTypeName} is not ready yet. Please wait for the campaign to finish generating.`);
      return;
    }

    try {
      // Update workspace store before saving
      pushState(editableContent);
      
      // Save to backend
      await updateTextMutation.mutateAsync({
        authToken: token,
        assetId,
        content,
      });
      
      // Success is handled by the mutation's onSuccess callback
    } catch (error: any) {
      console.error("Save error:", error);
      // Error is handled by the mutation's onError callback
    }
  };

  const handleUndo = () => {
    undo();
  };

  const handleRedo = () => {
    redo();
  };

  const handleRegenerateImage = async () => {
    if (!imageAssetId || !token) {
      imageToasts.error("Image generation is not ready yet. Please wait for the campaign to finish generating, then try again.");
      return;
    }

    try {
      // Clear any previous errors by resetting state
      // Note: We don't clear generatedImages here to show the old image while loading
      
      await regenerateImageMutation.mutateAsync({
        authToken: token,
        assetId: imageAssetId,
        customPrompt: customImagePrompt || undefined,
        model: selectedImageModel,
      });
      
      // Success is handled by the mutation's onSuccess callback
    } catch (error: any) {
      console.error("Image regeneration error:", error);
      // Error is handled by the mutation's onError callback
    }
  };

  const handleSelectFromHistory = async (url: string, imageId: number) => {
    // Update the displayed image
    setGeneratedImages((prev) => [url, ...prev.filter((u) => u !== url).slice(0, 2)]);
    
    // Update the selected image in the database
    if (imageAssetId && token) {
      try {
        await updateImageSelectionMutation.mutateAsync({
          authToken: token,
          assetId: imageId,
        });
        toast.success("Image selected from history!");
      } catch (error) {
        console.error("Failed to update image selection:", error);
      }
    }
  };

  const handleOpenRegenerateModal = (contentType: 'tagline' | 'social' | 'adCopy') => {
    setRegeneratingContentType(contentType);
    setRegenerateModalOpen(true);
  };

  const handleRegenerateContent = async () => {
    if (!token || !regeneratingContentType) {
      actionToasts.genericError("Unable to regenerate content. Please try again.");
      return;
    }

    let assetId: number | null = null;
    
    if (regeneratingContentType === 'tagline' && textAssetId) {
      assetId = textAssetId;
    } else if (regeneratingContentType === 'social' && socialMediaAssetId) {
      assetId = socialMediaAssetId;
    } else if (regeneratingContentType === 'adCopy' && adCopyAssetId) {
      assetId = adCopyAssetId;
    }

    if (!assetId) {
      const assetTypeName = regeneratingContentType === 'tagline' ? 'Tagline' : regeneratingContentType === 'social' ? 'Social Media Posts' : 'Ad Copy';
      actionToasts.genericError(`${assetTypeName} is not ready yet. Please wait for the campaign to finish generating, then try again.`);
      setRegenerateModalOpen(false);
      return;
    }

    const hasPreferences = 
      regeneratePreferences.feedback ||
      regeneratePreferences.tone ||
      regeneratePreferences.length ||
      regeneratePreferences.tags.length > 0 ||
      regeneratePreferences.customInstructions;

    try {
      await regenerateTextMutation.mutateAsync({
        authToken: token,
        assetId,
        contentType: regeneratingContentType,
        preferences: hasPreferences ? {
          feedback: regeneratePreferences.feedback || undefined,
          tone: regeneratePreferences.tone || undefined,
          length: regeneratePreferences.length || undefined,
          tags: regeneratePreferences.tags.length > 0 ? regeneratePreferences.tags : undefined,
          customInstructions: regeneratePreferences.customInstructions || undefined,
        } : undefined,
      });
      
      // Success is handled by the mutation's onSuccess callback
    } catch (error: any) {
      console.error("Content regeneration error:", error);
      // Error is handled by the mutation's onError callback
    }
  };

  const toggleTag = (tag: string) => {
    setRegeneratePreferences((prev) => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter((t) => t !== tag)
        : [...prev.tags, tag],
    }));
  };

  // Early return after all hooks
  if (!token) {
    return null;
  }

  // Extract agent references after all hooks
  const writerAgent = agents.find((a) => a.agent === "WriterAgent");
  const designerAgent = agents.find((a) => a.agent === "DesignerAgent");
  const otherAgents = agents.filter(
    (a) => a.agent !== "WriterAgent" && a.agent !== "DesignerAgent"
  );

  const campaignName = campaignQuery.data?.name || "Loading...";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      {/* Enhanced Header */}
      <header className="border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
                Creative Workspace
              </h1>
              <p className="text-sm text-gray-600">
                Campaign: <span className="font-semibold text-gray-900">{campaignName}</span>
              </p>
            </div>
            
            {/* Undo/Redo Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleUndo}
                disabled={!canUndo}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="Undo (Ctrl+Z)"
              >
                <ArrowRight className="h-4 w-4 rotate-180" />
                Undo
              </button>
              
              <button
                onClick={handleRedo}
                disabled={!canRedo}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition text-gray-700 font-medium disabled:opacity-40 disabled:cursor-not-allowed shadow-sm"
                title="Redo (Ctrl+Y)"
              >
                Redo
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Agent Status Bar */}
      {otherAgents.length > 0 && (
        <div className="border-b border-gray-200 bg-white/50 backdrop-blur-sm">
          <div className="mx-auto max-w-7xl px-6 py-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-sm font-semibold text-gray-700">AI Agents:</span>
              {otherAgents.map((agent) => (
                <div
                  key={agent.agent}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    agent.status === "completed"
                      ? "bg-green-100 text-green-700 border border-green-200"
                      : agent.status === "working"
                      ? "bg-purple-100 text-purple-700 border border-purple-200"
                      : "bg-gray-100 text-gray-600 border border-gray-200"
                  }`}
                >
                  {agent.status === "completed" ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : agent.status === "working" ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <div className="h-4 w-4 rounded-full bg-gray-400"></div>
                  )}
                  <span>{agent.agent.replace("Agent", "")}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Writer Agent Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tagline Section */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Campaign Tagline
                </h2>
              </div>
              <div className="p-6">
                {writerAgent?.status === "working" ? (
                  <div className="flex items-center gap-3 text-gray-600">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
                    <span>{writerAgent.message}</span>
                  </div>
                ) : writerAgent?.output ? (
                  <div className="space-y-4">
                    {editingSection === "tagline" ? (
                      <>
                        <textarea
                          value={editableContent.tagline}
                          onChange={(e) =>
                            setEditableContent((prev) => ({
                              ...prev,
                              tagline: e.target.value,
                            }))
                          }
                          className="w-full rounded-lg px-4 py-3 text-lg font-semibold border-2 border-indigo-300 focus:border-indigo-500 focus:outline-none resize-none"
                          rows={2}
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleSaveContent('tagline')}
                            disabled={updateTextMutation.isPending || !textAssetId}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                            title={!textAssetId ? "Tagline not ready yet" : ""}
                          >
                            <Save className="h-4 w-4" />
                            {updateTextMutation.isPending ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => {
                              setEditingSection(null);
                              const currentState = getCurrentState();
                              if (currentState) {
                                setEditableContent((prev) => ({
                                  ...prev,
                                  tagline: currentState.tagline,
                                }));
                              }
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                          >
                            Cancel
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="group">
                        <div className="flex items-start justify-between gap-4">
                          <p className="text-2xl font-bold text-gray-900 flex-1">
                            "{editableContent.tagline}"
                          </p>
                          <div className="flex gap-1">
                            <button
                              onClick={() => setEditingSection("tagline")}
                              disabled={!textAssetId}
                              className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                              title={textAssetId ? "Edit tagline" : "Tagline not ready yet"}
                            >
                              <Edit2 className="h-5 w-5 text-gray-600" />
                            </button>
                            <button
                              onClick={() => handleOpenRegenerateModal('tagline')}
                              disabled={!textAssetId}
                              className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                              title={textAssetId ? "Regenerate tagline" : "Tagline not ready yet"}
                            >
                              <Wand2 className="h-5 w-5 text-purple-600" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-400">
                    <p className="text-sm">Waiting for WriterAgent...</p>
                  </div>
                )}
              </div>
            </div>

            {/* Social Media Posts Section */}
            {writerAgent?.output?.socialMediaPosts && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-500 to-cyan-600 px-6 py-4">
                  <h2 className="text-lg font-bold text-white">Social Media Posts</h2>
                </div>
                <div className="p-6 space-y-4">
                  {editingSection === "social" ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Twitter/X <span className="text-gray-500 font-normal">(max 280 characters)</span>
                          </label>
                          <textarea
                            value={editableContent.socialMediaPosts.twitter}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                socialMediaPosts: {
                                  ...prev.socialMediaPosts,
                                  twitter: e.target.value.slice(0, 280),
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-blue-300 focus:border-blue-500 focus:outline-none resize-none"
                            rows={3}
                            maxLength={280}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {editableContent.socialMediaPosts.twitter.length}/280 characters
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            LinkedIn
                          </label>
                          <textarea
                            value={editableContent.socialMediaPosts.linkedin}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                socialMediaPosts: {
                                  ...prev.socialMediaPosts,
                                  linkedin: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-blue-300 focus:border-blue-500 focus:outline-none resize-none"
                            rows={4}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Instagram
                          </label>
                          <textarea
                            value={editableContent.socialMediaPosts.instagram}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                socialMediaPosts: {
                                  ...prev.socialMediaPosts,
                                  instagram: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-blue-300 focus:border-blue-500 focus:outline-none resize-none"
                            rows={4}
                          />
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Facebook
                          </label>
                          <textarea
                            value={editableContent.socialMediaPosts.facebook}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                socialMediaPosts: {
                                  ...prev.socialMediaPosts,
                                  facebook: e.target.value,
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-blue-300 focus:border-blue-500 focus:outline-none resize-none"
                            rows={4}
                          />
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSaveContent('social')}
                          disabled={updateTextMutation.isPending || !socialMediaAssetId}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!socialMediaAssetId ? "Social media posts not ready yet" : ""}
                        >
                          <Save className="h-4 w-4" />
                          {updateTextMutation.isPending ? "Saving..." : "Save All"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingSection(null);
                            const currentState = getCurrentState();
                            if (currentState) {
                              setEditableContent((prev) => ({
                                ...prev,
                                socialMediaPosts: currentState.socialMediaPosts,
                              }));
                            }
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="group space-y-4">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-sm text-gray-600">Platform-optimized content for social media</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingSection("social")}
                            disabled={!socialMediaAssetId}
                            className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                            title={socialMediaAssetId ? "Edit social media posts" : "Social media posts not ready yet"}
                          >
                            <Edit2 className="h-5 w-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleOpenRegenerateModal('social')}
                            disabled={!socialMediaAssetId}
                            className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                            title={socialMediaAssetId ? "Regenerate social media posts" : "Social media posts not ready yet"}
                          >
                            <Wand2 className="h-5 w-5 text-purple-600" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-xs font-bold text-blue-900 mb-2">TWITTER/X</p>
                          <p className="text-sm text-gray-800">{editableContent.socialMediaPosts.twitter}</p>
                        </div>
                        
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-xs font-bold text-blue-900 mb-2">LINKEDIN</p>
                          <p className="text-sm text-gray-800 line-clamp-4">{editableContent.socialMediaPosts.linkedin}</p>
                        </div>
                        
                        <div className="bg-gradient-to-br from-pink-50 to-purple-50 rounded-lg p-4 border border-pink-200">
                          <p className="text-xs font-bold text-pink-900 mb-2">INSTAGRAM</p>
                          <p className="text-sm text-gray-800 line-clamp-4">{editableContent.socialMediaPosts.instagram}</p>
                        </div>
                        
                        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                          <p className="text-xs font-bold text-blue-900 mb-2">FACEBOOK</p>
                          <p className="text-sm text-gray-800 line-clamp-4">{editableContent.socialMediaPosts.facebook}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Ad Copy Section */}
            {writerAgent?.output?.adCopy && (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-600 px-6 py-4">
                  <h2 className="text-lg font-bold text-white">Ad Copy</h2>
                </div>
                <div className="p-6 space-y-4">
                  {editingSection === "adCopy" ? (
                    <>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Headline <span className="text-gray-500 font-normal">(max 60 characters)</span>
                          </label>
                          <input
                            type="text"
                            value={editableContent.adCopy.headline}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                adCopy: {
                                  ...prev.adCopy,
                                  headline: e.target.value.slice(0, 60),
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-orange-300 focus:border-orange-500 focus:outline-none"
                            maxLength={60}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {editableContent.adCopy.headline.length}/60 characters
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Short Body <span className="text-gray-500 font-normal">(max 150 characters)</span>
                          </label>
                          <textarea
                            value={editableContent.adCopy.bodyShort}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                adCopy: {
                                  ...prev.adCopy,
                                  bodyShort: e.target.value.slice(0, 150),
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-orange-300 focus:border-orange-500 focus:outline-none resize-none"
                            rows={3}
                            maxLength={150}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {editableContent.adCopy.bodyShort.length}/150 characters
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Long Body <span className="text-gray-500 font-normal">(max 300 characters)</span>
                          </label>
                          <textarea
                            value={editableContent.adCopy.bodyLong}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                adCopy: {
                                  ...prev.adCopy,
                                  bodyLong: e.target.value.slice(0, 300),
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-orange-300 focus:border-orange-500 focus:outline-none resize-none"
                            rows={4}
                            maxLength={300}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {editableContent.adCopy.bodyLong.length}/300 characters
                          </p>
                        </div>
                        
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Call-to-Action <span className="text-gray-500 font-normal">(max 20 characters)</span>
                          </label>
                          <input
                            type="text"
                            value={editableContent.adCopy.cta}
                            onChange={(e) =>
                              setEditableContent((prev) => ({
                                ...prev,
                                adCopy: {
                                  ...prev.adCopy,
                                  cta: e.target.value.slice(0, 20),
                                },
                              }))
                            }
                            className="w-full rounded-lg px-4 py-3 border-2 border-orange-300 focus:border-orange-500 focus:outline-none"
                            maxLength={20}
                          />
                          <p className="text-xs text-gray-500 mt-1">
                            {editableContent.adCopy.cta.length}/20 characters
                          </p>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 pt-2">
                        <button
                          onClick={() => handleSaveContent('adCopy')}
                          disabled={updateTextMutation.isPending || !adCopyAssetId}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg font-medium hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                          title={!adCopyAssetId ? "Ad copy not ready yet" : ""}
                        >
                          <Save className="h-4 w-4" />
                          {updateTextMutation.isPending ? "Saving..." : "Save All"}
                        </button>
                        <button
                          onClick={() => {
                            setEditingSection(null);
                            const currentState = getCurrentState();
                            if (currentState) {
                              setEditableContent((prev) => ({
                                ...prev,
                                adCopy: currentState.adCopy,
                              }));
                            }
                          }}
                          className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </>
                  ) : (
                    <div className="group space-y-4">
                      <div className="flex items-start justify-between mb-4">
                        <p className="text-sm text-gray-600">Ready-to-use ad copy for various formats</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditingSection("adCopy")}
                            disabled={!adCopyAssetId}
                            className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                            title={adCopyAssetId ? "Edit ad copy" : "Ad copy not ready yet"}
                          >
                            <Edit2 className="h-5 w-5 text-gray-600" />
                          </button>
                          <button
                            onClick={() => handleOpenRegenerateModal('adCopy')}
                            disabled={!adCopyAssetId}
                            className="opacity-0 group-hover:opacity-100 transition p-2 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
                            title={adCopyAssetId ? "Regenerate ad copy" : "Ad copy not ready yet"}
                          >
                            <Wand2 className="h-5 w-5 text-purple-600" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <p className="text-xs font-bold text-orange-900 mb-2">HEADLINE</p>
                          <p className="text-lg font-bold text-gray-900">{editableContent.adCopy.headline}</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                            <p className="text-xs font-bold text-orange-900 mb-2">SHORT BODY</p>
                            <p className="text-sm text-gray-800">{editableContent.adCopy.bodyShort}</p>
                          </div>
                          
                          <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                            <p className="text-xs font-bold text-orange-900 mb-2">CALL-TO-ACTION</p>
                            <p className="text-sm font-semibold text-gray-900">{editableContent.adCopy.cta}</p>
                          </div>
                        </div>
                        
                        <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                          <p className="text-xs font-bold text-orange-900 mb-2">LONG BODY</p>
                          <p className="text-sm text-gray-800">{editableContent.adCopy.bodyLong}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Designer Agent & Campaign Status */}
          <div className="space-y-6">
            {/* Designer Agent */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    Designer Agent
                    {designerAgent?.status === "working" && (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    )}
                    {designerAgent?.status === "completed" && (
                      <CheckCircle className="h-5 w-5" />
                    )}
                  </h2>
                  {imageHistoryQuery.data && imageHistoryQuery.data.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowImageHistory(!showImageHistory)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-lg text-sm font-medium transition backdrop-blur-sm"
                    >
                      <History className="h-4 w-4" />
                      {showImageHistory ? "Hide" : "Show"} History
                    </button>
                  )}
                </div>
              </div>

              <div className="p-6">
                {designerAgent?.status !== "pending" && (
                  <div className="mb-4">
                    <p className="text-sm text-gray-600">
                      {designerAgent?.message || "Creating visual concepts..."}
                    </p>
                  </div>
                )}

                {/* Image History View */}
                {showImageHistory && (
                  <div className="mb-6 border-b border-gray-200 pb-6">
                    <ImageHistory
                      images={imageHistoryQuery.data || []}
                      currentImageUrl={generatedImages[0]}
                      onSelectImage={handleSelectFromHistory}
                      isLoading={imageHistoryQuery.isLoading}
                    />
                  </div>
                )}

                <div className="aspect-square rounded-lg bg-gray-900 flex items-center justify-center overflow-hidden">
                  {regenerateImageMutation.isPending ? (
                    <div className="text-center text-white p-8">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4"></div>
                      <p className="text-sm font-medium">Generating your image...</p>
                      <p className="text-xs text-gray-400 mt-2">This may take 10-30 seconds</p>
                      <p className="text-xs text-gray-500 mt-1">Using {selectedImageModel.toUpperCase()}</p>
                    </div>
                  ) : generatedImages.length > 0 ? (
                    <img
                      src={generatedImages[0]}
                      alt="Generated visual"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        console.error("Image failed to load:", generatedImages[0]);
                        // Remove the failed image from the list
                        setGeneratedImages((prev) => prev.slice(1));
                        imageToasts.error("Failed to load image. Please try regenerating.");
                      }}
                    />
                  ) : regenerateImageMutation.isError ? (
                    <div className="text-center text-white p-8">
                      <div className="h-12 w-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                        <X className="h-6 w-6 text-red-400" />
                      </div>
                      <p className="text-sm font-medium mb-2">Image generation failed</p>
                      <p className="text-xs text-gray-400 mb-4">
                        Please try again or select a different model
                      </p>
                      <button
                        onClick={handleRegenerateImage}
                        disabled={regenerateImageMutation.isPending}
                        className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition"
                      >
                        Try Again
                      </button>
                    </div>
                  ) : designerAgent?.status === "working" ? (
                    <div className="text-center text-white p-8">
                      <div className="h-12 w-12 animate-spin rounded-full border-4 border-white border-t-transparent mx-auto mb-4"></div>
                      <p className="text-sm">Creating initial visuals...</p>
                      <p className="text-xs text-gray-400 mt-2">Designer Agent is working</p>
                    </div>
                  ) : (
                    <div className="text-center text-gray-400 p-8">
                      <ImageIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="text-sm">No image generated yet</p>
                      <p className="text-xs text-gray-500 mt-2">Visuals will appear here once generated</p>
                    </div>
                  )}
                </div>

                {generatedImages.length > 1 && (
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    {generatedImages.slice(1, 3).map((url, index) => (
                      <div key={index} className="aspect-square rounded-lg overflow-hidden">
                        <img
                          src={url}
                          alt={`Generated visual ${index + 2}`}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}

                {designerAgent?.status === "completed" && (
                  <div className="mt-4 space-y-4">
                    {/* Model Selector */}
                    <div>
                      <ImageModelSelector
                        value={selectedImageModel}
                        onChange={setSelectedImageModel}
                        label="Select Image Model"
                        showDetails={false}
                      />
                    </div>

                    {/* Prompt Suggestions */}
                    <div className="border-t border-gray-200 pt-4">
                      <PromptSuggestions
                        currentPrompt={customImagePrompt}
                        onSelectPrompt={setCustomImagePrompt}
                        campaignContext={
                          writerAgent?.output
                            ? {
                                tagline: editableContent.tagline,
                                goal: campaignQuery.data?.brief?.goal || "",
                                tone: campaignQuery.data?.brief?.tone || "",
                                audience: campaignQuery.data?.brief?.audience || "",
                                visualStyle: campaignQuery.data?.brief?.visualStyle,
                              }
                            : undefined
                        }
                      />
                    </div>

                    {/* Custom Prompt */}
                    <div>
                      <label className="text-sm font-medium text-gray-700 block mb-2">
                        Custom Prompt
                      </label>
                      <textarea
                        value={customImagePrompt}
                        onChange={(e) => setCustomImagePrompt(e.target.value)}
                        placeholder="Describe modifications or enter a custom prompt..."
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        rows={3}
                      />
                    </div>

                    {/* Regenerate Button */}
                    <button
                      onClick={handleRegenerateImage}
                      disabled={regenerateImageMutation.isPending || !imageAssetId}
                      className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                      title={!imageAssetId ? "Image asset not ready" : "Generate a new image"}
                    >
                      <RefreshCw className={`h-4 w-4 ${regenerateImageMutation.isPending ? "animate-spin" : ""}`} />
                      {regenerateImageMutation.isPending ? "Generating..." : "Regenerate Image"}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Campaign Progress */}
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-bold text-gray-900">Campaign Progress</h3>
              </div>
              <div className="p-6">
                <div className="space-y-3">
                  {agents.map((agent) => (
                    <div key={agent.agent} className="flex items-center gap-3">
                      {agent.status === "completed" ? (
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                      ) : agent.status === "working" ? (
                        <Loader2 className="h-5 w-5 text-purple-600 animate-spin flex-shrink-0" />
                      ) : (
                        <div className="h-5 w-5 rounded-full bg-gray-300 flex-shrink-0"></div>
                      )}
                      <span className="text-sm font-medium text-gray-700">
                        {agent.agent.replace("Agent", "")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Complete Button */}
            {isComplete && (
              <button
                onClick={() =>
                  void navigate({
                    to: "/campaign/$campaignId",
                    params: { campaignId },
                  })
                }
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-xl font-bold hover:from-indigo-700 hover:to-purple-700 transition shadow-lg"
              >
                View Complete Campaign
                <ArrowRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Regeneration Modal */}
      <Transition appear show={regenerateModalOpen} as={Fragment}>
        <Dialog
          as="div"
          className="relative z-50"
          onClose={() => setRegenerateModalOpen(false)}
        >
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-6">
                    <Dialog.Title className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Wand2 className="h-6 w-6 text-purple-600" />
                      Regenerate {regeneratingContentType === 'tagline' ? 'Tagline' : regeneratingContentType === 'social' ? 'Social Media Posts' : 'Ad Copy'}
                    </Dialog.Title>
                    <button
                      onClick={() => setRegenerateModalOpen(false)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition"
                    >
                      <X className="h-5 w-5 text-gray-500" />
                    </button>
                  </div>

                  <div className="space-y-5">
                    <p className="text-sm text-gray-600">
                      Provide instructions to tailor the content to your needs. All fields are optional.
                    </p>

                    {/* Feedback */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        What would you like to improve?
                      </label>
                      <textarea
                        value={regeneratePreferences.feedback}
                        onChange={(e) =>
                          setRegeneratePreferences((prev) => ({
                            ...prev,
                            feedback: e.target.value,
                          }))
                        }
                        placeholder="E.g., Make it more catchy, Add a sense of urgency, Focus on benefits..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={3}
                      />
                    </div>

                    {/* Tone */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Tone Adjustment
                      </label>
                      <input
                        type="text"
                        value={regeneratePreferences.tone}
                        onChange={(e) =>
                          setRegeneratePreferences((prev) => ({
                            ...prev,
                            tone: e.target.value,
                          }))
                        }
                        placeholder="E.g., More casual, More professional, Friendlier..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Length */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Length Preference
                      </label>
                      <input
                        type="text"
                        value={regeneratePreferences.length}
                        onChange={(e) =>
                          setRegeneratePreferences((prev) => ({
                            ...prev,
                            length: e.target.value,
                          }))
                        }
                        placeholder="E.g., Shorter, Longer, More concise..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>

                    {/* Tags */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Style Tags
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {availableTags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${
                              regeneratePreferences.tags.includes(tag)
                                ? "bg-purple-600 text-white"
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Custom Instructions */}
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">
                        Additional Instructions
                      </label>
                      <textarea
                        value={regeneratePreferences.customInstructions}
                        onChange={(e) =>
                          setRegeneratePreferences((prev) => ({
                            ...prev,
                            customInstructions: e.target.value,
                          }))
                        }
                        placeholder="Any other specific requirements or preferences..."
                        className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={2}
                      />
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200">
                    <button
                      onClick={() => setRegenerateModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleRegenerateContent}
                      disabled={regenerateTextMutation.isPending}
                      className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-medium hover:from-purple-700 hover:to-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Wand2 className={`h-5 w-5 ${regenerateTextMutation.isPending ? "animate-spin" : ""}`} />
                      {regenerateTextMutation.isPending ? "Regenerating..." : "Regenerate"}
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  );
}
