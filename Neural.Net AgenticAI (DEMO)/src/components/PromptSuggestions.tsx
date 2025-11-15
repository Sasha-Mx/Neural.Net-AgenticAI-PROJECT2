import { useState } from "react";
import { Sparkles, Wand2, Loader2, Copy, Check } from "lucide-react";
import toast from "react-hot-toast";

interface PromptSuggestionsProps {
  currentPrompt: string;
  onSelectPrompt: (prompt: string) => void;
  campaignContext?: {
    tagline: string;
    goal: string;
    tone: string;
    audience: string;
    visualStyle?: string;
  };
}

const EXAMPLE_PROMPTS = [
  {
    label: "Product Showcase",
    template: "Professional product photography, clean white background, studio lighting, high detail",
  },
  {
    label: "Lifestyle Scene",
    template: "Lifestyle photography, natural lighting, authentic moment, warm atmosphere",
  },
  {
    label: "Abstract Concept",
    template: "Abstract visualization, modern art style, bold colors, dynamic composition",
  },
  {
    label: "Tech & Innovation",
    template: "Futuristic technology concept, sleek design, glowing elements, digital aesthetic",
  },
  {
    label: "Nature & Organic",
    template: "Natural elements, organic textures, earthy tones, peaceful atmosphere",
  },
  {
    label: "Urban & Modern",
    template: "Urban landscape, modern architecture, city life, contemporary style",
  },
];

const QUICK_ENHANCEMENTS = [
  { label: "More Vibrant", modifier: "with vibrant colors and high saturation" },
  { label: "Add Depth", modifier: "with depth of field and layered composition" },
  { label: "Professional", modifier: "professional quality, polished, high-end" },
  { label: "Dramatic", modifier: "dramatic lighting, strong contrast, cinematic" },
  { label: "Minimalist", modifier: "minimalist style, clean, simple composition" },
  { label: "Warm Tones", modifier: "warm color palette, inviting atmosphere" },
];

export function PromptSuggestions({
  currentPrompt,
  onSelectPrompt,
  campaignContext,
}: PromptSuggestionsProps) {
  const [copiedPrompt, setCopiedPrompt] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const handleCopyPrompt = (prompt: string) => {
    navigator.clipboard.writeText(prompt);
    setCopiedPrompt(prompt);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const handleSelectPrompt = (prompt: string) => {
    onSelectPrompt(prompt);
    toast.success("Prompt applied!");
  };

  const handleQuickEnhancement = (modifier: string) => {
    const enhanced = currentPrompt
      ? `${currentPrompt}, ${modifier}`
      : modifier;
    onSelectPrompt(enhanced);
    toast.success("Enhancement applied!");
  };

  return (
    <div className="space-y-4">
      {/* Quick Enhancements */}
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2 flex items-center gap-2">
          <Wand2 className="h-4 w-4 text-purple-600" />
          Quick Enhancements
        </label>
        <div className="flex flex-wrap gap-2">
          {QUICK_ENHANCEMENTS.map((enhancement) => (
            <button
              key={enhancement.label}
              type="button"
              onClick={() => handleQuickEnhancement(enhancement.modifier)}
              className="px-3 py-1.5 text-sm bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition border border-purple-200 font-medium"
            >
              + {enhancement.label}
            </button>
          ))}
        </div>
      </div>

      {/* Example Prompts */}
      <div>
        <button
          type="button"
          onClick={() => setShowExamples(!showExamples)}
          className="text-sm font-semibold text-gray-700 flex items-center gap-2 hover:text-gray-900 transition"
        >
          <Sparkles className="h-4 w-4 text-indigo-600" />
          Example Prompts
          <span className="text-xs text-gray-500">
            ({showExamples ? "Hide" : "Show"})
          </span>
        </button>

        {showExamples && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2">
            {EXAMPLE_PROMPTS.map((example) => (
              <div
                key={example.label}
                className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-lg p-3 border border-indigo-100"
              >
                <div className="flex items-start justify-between mb-2">
                  <h4 className="text-xs font-bold text-indigo-900">
                    {example.label}
                  </h4>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => handleCopyPrompt(example.template)}
                      className="p-1 hover:bg-indigo-100 rounded transition"
                      title="Copy prompt"
                    >
                      {copiedPrompt === example.template ? (
                        <Check className="h-3 w-3 text-green-600" />
                      ) : (
                        <Copy className="h-3 w-3 text-indigo-600" />
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-700 mb-2 line-clamp-2">
                  {example.template}
                </p>
                <button
                  type="button"
                  onClick={() => handleSelectPrompt(example.template)}
                  className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition"
                >
                  Use this prompt →
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context-based suggestion */}
      {campaignContext && (
        <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg p-4 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-900 mb-2 flex items-center gap-2">
            <Sparkles className="h-3 w-3" />
            Suggested for your campaign
          </p>
          <p className="text-xs text-gray-700 mb-3">
            Based on your {campaignContext.tone} tone and {campaignContext.audience} audience
          </p>
          <button
            type="button"
            onClick={() => {
              const contextPrompt = `${campaignContext.visualStyle || "professional"} style image representing "${campaignContext.tagline}", ${campaignContext.tone} tone, designed for ${campaignContext.audience}`;
              handleSelectPrompt(contextPrompt);
            }}
            className="text-xs font-medium text-emerald-700 hover:text-emerald-800 transition"
          >
            Use campaign context →
          </button>
        </div>
      )}
    </div>
  );
}
