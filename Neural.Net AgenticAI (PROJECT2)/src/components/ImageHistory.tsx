import { useState } from "react";
import { Clock, ImageIcon, Check, Filter, X } from "lucide-react";
import { IMAGE_MODELS, type ImageModel } from "./ImageModelSelector";

export interface ImageHistoryEntry {
  id: number;
  url: string;
  model: ImageModel;
  provider: string;
  prompt: string;
  generatedAt: string;
  isSelected: boolean;
}

interface ImageHistoryProps {
  images: ImageHistoryEntry[];
  currentImageUrl?: string;
  onSelectImage: (url: string, imageId: number) => void;
  isLoading?: boolean;
}

export function ImageHistory({
  images,
  currentImageUrl,
  onSelectImage,
  isLoading = false,
}: ImageHistoryProps) {
  const [filterModel, setFilterModel] = useState<ImageModel | "all">("all");
  const [showFilters, setShowFilters] = useState(false);

  const filteredImages = images.filter((img) => {
    if (filterModel === "all") return true;
    return img.model === filterModel;
  });

  const getModelInfo = (modelId: ImageModel) => {
    return IMAGE_MODELS.find((m) => m.id === modelId);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent mx-auto mb-2"></div>
          <p className="text-sm text-gray-600">Loading history...</p>
        </div>
      </div>
    );
  }

  if (images.length === 0) {
    return (
      <div className="text-center py-8 px-4">
        <ImageIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm font-medium text-gray-700 mb-1">No images yet</p>
        <p className="text-xs text-gray-500">
          Generated images will appear here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-gray-600" />
          <h3 className="text-sm font-semibold text-gray-900">
            Generation History
          </h3>
          <span className="text-xs text-gray-500">
            ({filteredImages.length} {filteredImages.length === 1 ? "image" : "images"})
          </span>
        </div>
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition"
        >
          <Filter className="h-3 w-3" />
          Filter
        </button>
      </div>

      {/* Filter options */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 mb-2">Filter by model:</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setFilterModel("all")}
              className={`px-3 py-1 text-xs rounded-full transition ${
                filterModel === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              }`}
            >
              All Models
            </button>
            {IMAGE_MODELS.map((model) => (
              <button
                key={model.id}
                type="button"
                onClick={() => setFilterModel(model.id)}
                className={`px-3 py-1 text-xs rounded-full transition ${
                  filterModel === model.id
                    ? "bg-indigo-600 text-white"
                    : "bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
                }`}
              >
                {model.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Image grid */}
      <div className="grid grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2">
        {filteredImages.map((image) => {
          const modelInfo = getModelInfo(image.model);
          const isCurrentImage = image.url === currentImageUrl;

          return (
            <button
              key={image.id}
              type="button"
              onClick={() => onSelectImage(image.url, image.id)}
              className={`relative group rounded-lg overflow-hidden border-2 transition ${
                isCurrentImage
                  ? "border-emerald-500 ring-2 ring-emerald-200"
                  : "border-gray-200 hover:border-indigo-300"
              }`}
            >
              {/* Image */}
              <div className="aspect-square bg-gray-900">
                <img
                  src={image.url}
                  alt="Generated image"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Overlay with info */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="absolute bottom-0 left-0 right-0 p-2">
                  <p className="text-xs font-semibold text-white mb-1 line-clamp-2">
                    {image.prompt}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-white/80">
                      {formatDate(image.generatedAt)}
                    </span>
                    {modelInfo && (
                      <span className="text-xs px-2 py-0.5 bg-white/20 text-white rounded-full">
                        {modelInfo.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Selected indicator */}
              {isCurrentImage && (
                <div className="absolute top-2 right-2 bg-emerald-500 text-white rounded-full p-1">
                  <Check className="h-3 w-3" />
                </div>
              )}

              {/* Model badge (always visible) */}
              {modelInfo && (
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 text-white text-xs rounded-full backdrop-blur-sm">
                  {modelInfo.name.split(" ")[0]}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
