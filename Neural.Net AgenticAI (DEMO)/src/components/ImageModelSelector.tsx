import { useState } from "react";
import { Zap, Award, Filter, X } from "lucide-react";

export type ImageModel = 
  | "sdxl"
  | "stable-diffusion-2-1"
  | "stable-diffusion-1-5"
  | "kandinsky-2-2"
  | "playground-v2"
  | "flux-schnell";

interface ImageModelOption {
  id: ImageModel;
  name: string;
  description: string;
  provider: "huggingface" | "replicate";
  speed: "fast" | "medium" | "slow";
  quality: "good" | "great" | "excellent";
  recommended?: boolean;
  bestFor?: string[];
}

const IMAGE_MODELS: ImageModelOption[] = [
  {
    id: "sdxl",
    name: "Stable Diffusion XL",
    description: "High-quality images with excellent detail and composition. Best overall choice.",
    provider: "huggingface",
    speed: "medium",
    quality: "excellent",
    recommended: true,
    bestFor: ["Product photos", "Marketing visuals", "Professional content"],
  },
  {
    id: "flux-schnell",
    name: "FLUX.1 Schnell",
    description: "Ultra-fast generation with great quality. Perfect for quick iterations.",
    provider: "replicate",
    speed: "fast",
    quality: "great",
    recommended: true,
    bestFor: ["Quick drafts", "Rapid prototyping", "Testing ideas"],
  },
  {
    id: "stable-diffusion-2-1",
    name: "Stable Diffusion 2.1",
    description: "Reliable and consistent results. Good for general use.",
    provider: "huggingface",
    speed: "medium",
    quality: "great",
    bestFor: ["General purpose", "Consistent style", "Reliable output"],
  },
  {
    id: "playground-v2",
    name: "Playground v2.5",
    description: "Vibrant colors and artistic style. Great for creative campaigns.",
    provider: "huggingface",
    speed: "medium",
    quality: "excellent",
    bestFor: ["Creative campaigns", "Vibrant visuals", "Artistic style"],
  },
  {
    id: "kandinsky-2-2",
    name: "Kandinsky 2.2",
    description: "Unique artistic style with strong composition. Good for abstract concepts.",
    provider: "huggingface",
    speed: "medium",
    quality: "great",
    bestFor: ["Abstract concepts", "Artistic projects", "Unique style"],
  },
  {
    id: "stable-diffusion-1-5",
    name: "Stable Diffusion 1.5",
    description: "Fast and efficient. Good for quick drafts and testing.",
    provider: "huggingface",
    speed: "fast",
    quality: "good",
    bestFor: ["Quick tests", "Draft versions", "Fast iterations"],
  },
];

interface ImageModelSelectorProps {
  value?: ImageModel;
  onChange: (value: ImageModel) => void;
  label?: string;
  showDetails?: boolean;
  compact?: boolean;
}

export function ImageModelSelector({ 
  value = "sdxl", 
  onChange, 
  label = "Image Generation Model",
  showDetails = true,
  compact = false,
}: ImageModelSelectorProps) {
  const [showFilters, setShowFilters] = useState(false);
  const [speedFilter, setSpeedFilter] = useState<string | null>(null);
  const [qualityFilter, setQualityFilter] = useState<string | null>(null);
  const [providerFilter, setProviderFilter] = useState<string | null>(null);

  const selectedModel = IMAGE_MODELS.find((m) => m.id === value) || IMAGE_MODELS[0]!;

  const filteredModels = IMAGE_MODELS.filter((model) => {
    if (speedFilter && model.speed !== speedFilter) return false;
    if (qualityFilter && model.quality !== qualityFilter) return false;
    if (providerFilter && model.provider !== providerFilter) return false;
    return true;
  });

  const hasActiveFilters = speedFilter || qualityFilter || providerFilter;

  const clearFilters = () => {
    setSpeedFilter(null);
    setQualityFilter(null);
    setProviderFilter(null);
  };

  const getSpeedColor = (speed: string) => {
    switch (speed) {
      case "fast": return "text-green-600 bg-green-100";
      case "medium": return "text-blue-600 bg-blue-100";
      case "slow": return "text-orange-600 bg-orange-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  const getQualityColor = (quality: string) => {
    switch (quality) {
      case "excellent": return "text-purple-600 bg-purple-100";
      case "great": return "text-indigo-600 bg-indigo-100";
      case "good": return "text-blue-600 bg-blue-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  if (compact) {
    return (
      <div className="space-y-2">
        {label && (
          <label className="block text-sm font-semibold text-gray-900">
            {label}
          </label>
        )}
        <select
          value={value}
          onChange={(e) => onChange(e.target.value as ImageModel)}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition text-sm"
        >
          {IMAGE_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} - {model.speed} / {model.quality}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-900">
            {label}
          </label>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition"
          >
            <Filter className="h-3 w-3" />
            {hasActiveFilters ? `Filters (${[speedFilter, qualityFilter, providerFilter].filter(Boolean).length})` : "Filter"}
          </button>
        </div>
      )}

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-700">Filter Models</p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>

          {/* Speed Filter */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Speed:</p>
            <div className="flex gap-2">
              {["fast", "medium", "slow"].map((speed) => (
                <button
                  key={speed}
                  type="button"
                  onClick={() => setSpeedFilter(speedFilter === speed ? null : speed)}
                  className={`px-2 py-1 text-xs rounded-full transition ${
                    speedFilter === speed
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {speed}
                </button>
              ))}
            </div>
          </div>

          {/* Quality Filter */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Quality:</p>
            <div className="flex gap-2">
              {["good", "great", "excellent"].map((quality) => (
                <button
                  key={quality}
                  type="button"
                  onClick={() => setQualityFilter(qualityFilter === quality ? null : quality)}
                  className={`px-2 py-1 text-xs rounded-full transition ${
                    qualityFilter === quality
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {quality}
                </button>
              ))}
            </div>
          </div>

          {/* Provider Filter */}
          <div>
            <p className="text-xs font-medium text-gray-600 mb-1">Provider:</p>
            <div className="flex gap-2">
              {["huggingface", "replicate"].map((provider) => (
                <button
                  key={provider}
                  type="button"
                  onClick={() => setProviderFilter(providerFilter === provider ? null : provider)}
                  className={`px-2 py-1 text-xs rounded-full transition capitalize ${
                    providerFilter === provider
                      ? "bg-indigo-600 text-white"
                      : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {provider}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Model Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredModels.map((model) => (
          <button
            key={model.id}
            type="button"
            onClick={() => onChange(model.id)}
            className={`text-left p-4 rounded-lg border-2 transition-all relative ${
              value === model.id
                ? "border-indigo-600 bg-indigo-50 shadow-md"
                : "border-gray-200 bg-white hover:border-indigo-300 hover:shadow-sm"
            }`}
          >
            {/* Recommended Badge */}
            {model.recommended && (
              <div className="absolute top-2 right-2">
                <span className="flex items-center gap-1 text-xs px-2 py-0.5 bg-gradient-to-r from-amber-400 to-orange-500 text-white rounded-full font-bold shadow-sm">
                  <Award className="h-3 w-3" />
                  Top Pick
                </span>
              </div>
            )}

            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm pr-16">{model.name}</h4>
              {value === model.id && (
                <span className="text-indigo-600 text-xs font-bold absolute top-4 right-4">✓</span>
              )}
            </div>
            
            {showDetails && (
              <>
                <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                  {model.description}
                </p>
                
                <div className="flex gap-2 mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium flex items-center gap-1 ${getSpeedColor(model.speed)}`}>
                    <Zap className="h-3 w-3" />
                    {model.speed}
                  </span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${getQualityColor(model.quality)}`}>
                    {model.quality}
                  </span>
                </div>

                {/* Best For Tags */}
                {model.bestFor && model.bestFor.length > 0 && (
                  <div className="pt-2 border-t border-gray-200">
                    <p className="text-xs font-semibold text-gray-500 mb-1">Best for:</p>
                    <div className="flex flex-wrap gap-1">
                      {model.bestFor.slice(0, 2).map((use, idx) => (
                        <span
                          key={idx}
                          className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                        >
                          {use}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </button>
        ))}
      </div>

      {filteredModels.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <p className="text-sm">No models match your filters</p>
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium mt-2"
          >
            Clear filters
          </button>
        </div>
      )}

      {/* Selected Model Info */}
      {showDetails && (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4 border border-indigo-100">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              <p className="text-sm font-semibold text-indigo-900 mb-1">
                Selected: {selectedModel.name}
              </p>
              <p className="text-xs text-indigo-700">
                {selectedModel.description}
              </p>
            </div>
            {selectedModel.recommended && (
              <Award className="h-5 w-5 text-amber-500 flex-shrink-0" />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { IMAGE_MODELS };
export type { ImageModelOption };
