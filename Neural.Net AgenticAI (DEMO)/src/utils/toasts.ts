import toast from "react-hot-toast";

type ToastType = "success" | "error" | "info" | "loading";

interface ToastOptions {
  duration?: number;
  position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
}

/**
 * Show a toast notification with consistent styling
 * @param type - The type of toast (success, error, info, loading)
 * @param message - The message to display
 * @param options - Optional configuration for duration and position
 */
export function showToast(
  type: ToastType,
  message: string,
  options?: ToastOptions
) {
  const defaultOptions = {
    duration: type === "loading" ? Infinity : 4000,
    position: "top-right" as const,
    ...options,
  };

  switch (type) {
    case "success":
      return toast.success(message, defaultOptions);
    case "error":
      return toast.error(message, defaultOptions);
    case "info":
      return toast(message, {
        ...defaultOptions,
        icon: "ℹ️",
      });
    case "loading":
      return toast.loading(message, defaultOptions);
  }
}

/**
 * Show a success toast
 */
export function showSuccessToast(message: string, options?: ToastOptions) {
  return showToast("success", message, options);
}

/**
 * Show an error toast
 */
export function showErrorToast(message: string, options?: ToastOptions) {
  return showToast("error", message, options);
}

/**
 * Show an info toast
 */
export function showInfoToast(message: string, options?: ToastOptions) {
  return showToast("info", message, options);
}

/**
 * Show a loading toast
 */
export function showLoadingToast(message: string, options?: ToastOptions) {
  return showToast("loading", message, options);
}

/**
 * Show a toast that follows a promise lifecycle (loading -> success/error)
 * @param promise - The promise to track
 * @param messages - Messages for each state
 */
export function showPromiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: any) => string);
  },
  options?: ToastOptions
) {
  return toast.promise(
    promise,
    {
      loading: messages.loading,
      success: messages.success,
      error: messages.error,
    },
    {
      position: "top-right",
      ...options,
    }
  );
}

/**
 * Dismiss a specific toast or all toasts
 * @param toastId - Optional ID of the toast to dismiss. If not provided, dismisses all toasts.
 */
export function dismissToast(toastId?: string) {
  if (toastId) {
    toast.dismiss(toastId);
  } else {
    toast.dismiss();
  }
}

/**
 * Auth-specific toast helpers with appropriate messaging
 */
export const authToasts = {
  loginSuccess: (userName: string) =>
    showSuccessToast(`Welcome back, ${userName}!`),
  loginError: (message?: string) =>
    showErrorToast(message || "Invalid email or password. Please try again."),
  signupSuccess: () =>
    showSuccessToast("Account created successfully! Welcome to Neural.Net!"),
  signupError: (message?: string) =>
    showErrorToast(message || "Failed to create account. Please try again."),
  logoutSuccess: () =>
    showInfoToast("You have been logged out successfully."),
  sessionExpired: () =>
    showErrorToast("Your session has expired. Please log in again."),
  unauthorized: () =>
    showErrorToast("You must be logged in to access this page."),
};

/**
 * Campaign-specific toast helpers
 */
export const campaignToasts = {
  createSuccess: (campaignName: string) =>
    showSuccessToast(`Campaign "${campaignName}" created! AI agents are starting work...`),
  createError: (message?: string) =>
    showErrorToast(message || "Failed to create campaign. Please try again."),
  updateSuccess: () =>
    showSuccessToast("Campaign updated successfully!"),
  updateError: (message?: string) =>
    showErrorToast(message || "Failed to update campaign. Please try again."),
  deleteSuccess: (campaignName: string) =>
    showSuccessToast(`Campaign "${campaignName}" deleted successfully!`),
  deleteError: (message?: string) =>
    showErrorToast(message || "Failed to delete campaign. Please try again."),
  exportSuccess: () =>
    showSuccessToast("Content exported successfully!"),
  exportError: (message?: string) =>
    showErrorToast(message || "Failed to export content. Please try again."),
  regenerateSuccess: (assetType: string) =>
    showSuccessToast(`${assetType} regenerated successfully!`),
  regenerateError: (message?: string) =>
    showErrorToast(message || "Failed to regenerate content. Please try again."),
};

/**
 * Image generation toast helpers
 */
export const imageToasts = {
  generating: (model?: string) =>
    showLoadingToast(
      model 
        ? `Hang tight! Your image is being generated with ${model}...`
        : "Hang tight! Your image is being generated..."
    ),
  success: (model?: string) =>
    showSuccessToast(
      model
        ? `Image generated successfully with ${model}!`
        : "Image generated successfully!"
    ),
  error: (message?: string) =>
    showErrorToast(
      message || 
      "Sorry, no image could be generated at the moment. Please try again or select a different model."
    ),
  noImageApology: () =>
    showErrorToast(
      "Sorry, no image could be generated at the moment. Please try again later or select a different model.",
      { duration: 6000 }
    ),
  timeout: () =>
    showErrorToast(
      "Image generation is taking longer than expected. Please try again or select a faster model.",
      { duration: 6000 }
    ),
  modelUnavailable: (model: string) =>
    showErrorToast(
      `The ${model} model is currently unavailable. Please try a different model.`,
      { duration: 6000 }
    ),
};

/**
 * Generic action toast helpers
 */
export const actionToasts = {
  saveSuccess: () =>
    showSuccessToast("Changes saved successfully!"),
  saveError: (message?: string) =>
    showErrorToast(message || "Failed to save changes. Please try again."),
  archiveSuccess: (count: number) =>
    showSuccessToast(`${count} campaign${count !== 1 ? "s" : ""} archived!`),
  duplicateSuccess: (count: number) =>
    showSuccessToast(`${count} campaign${count !== 1 ? "s" : ""} duplicated!`),
  genericError: (message?: string) =>
    showErrorToast(message || "An error occurred. Please try again."),
  networkError: () =>
    showErrorToast("Network error. Please check your connection and try again."),
};
