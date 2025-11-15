import { env } from "~/server/env";

export type ImageModel = 
  | "sdxl"
  | "stable-diffusion-2-1"
  | "stable-diffusion-1-5"
  | "kandinsky-2-2"
  | "playground-v2"
  | "flux-schnell";

interface ImageGenerationOptions {
  model: ImageModel;
  prompt: string;
  negativePrompt?: string;
  width?: number;
  height?: number;
  guidanceScale?: number;
  numInferenceSteps?: number;
}

interface ImageGenerationResult {
  base64: string;
  model: ImageModel;
  provider: string;
}

/**
 * Creates a promise that rejects after a specified timeout
 * @param ms - Timeout in milliseconds
 * @param errorMessage - Error message to throw on timeout
 */
function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * Generate image using HuggingFace Inference API
 * Supports: SDXL, Stable Diffusion 2.1, Stable Diffusion 1.5, Kandinsky 2.2, Playground v2
 * 
 * @throws {Error} If API key is missing, request fails, or times out
 */
async function generateImageHuggingFace(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const modelEndpoints: Record<string, string> = {
    "sdxl": "stabilityai/stable-diffusion-xl-base-1.0",
    "stable-diffusion-2-1": "stabilityai/stable-diffusion-2-1",
    "stable-diffusion-1-5": "runwayml/stable-diffusion-v1-5",
    "kandinsky-2-2": "kandinsky-community/kandinsky-2-2-decoder",
    "playground-v2": "playgroundai/playground-v2.5-1024px-aesthetic",
  };

  const modelId = modelEndpoints[options.model];
  if (!modelId) {
    throw new Error(`Model ${options.model} is not supported by HuggingFace. Please select a different model.`);
  }

  const apiKey = env.HUGGINGFACE_API_KEY;
  if (!apiKey) {
    throw new Error(
      "HuggingFace API key is not configured. Please contact support or try a different model."
    );
  }

  try {
    // Wrap the fetch in a timeout (60 seconds)
    const response = await withTimeout(
      fetch(
        `https://router.huggingface.co/hf-inference/models/${modelId}`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            inputs: options.prompt,
            parameters: {
              negative_prompt: options.negativePrompt || "low quality, blurry, watermark, text, logo, signature",
              width: options.width || 1024,
              height: options.height || 1024,
              guidance_scale: options.guidanceScale || 7.5,
              num_inference_steps: options.numInferenceSteps || 50,
            },
          }),
        }
      ),
      60000, // 60 second timeout
      `Image generation with ${options.model} timed out after 60 seconds. Please try again or select a faster model like FLUX Schnell.`
    );

    if (!response.ok) {
      const errorText = await response.text();
      
      // Parse HuggingFace error for better messages
      let userMessage = `HuggingFace API error (${response.status})`;
      
      if (response.status === 503) {
        userMessage = `The ${options.model} model is currently loading or unavailable. Please wait a moment and try again, or select a different model.`;
      } else if (response.status === 401 || response.status === 403) {
        userMessage = "Authentication error with HuggingFace. Please contact support.";
      } else if (response.status === 429) {
        userMessage = "Rate limit exceeded. Please wait a moment before trying again.";
      } else if (errorText.includes("Model") && errorText.includes("is currently loading")) {
        userMessage = `The ${options.model} model is warming up. Please try again in a moment.`;
      }
      
      console.error(`HuggingFace API error for ${options.model}:`, errorText);
      throw new Error(userMessage);
    }

    // HuggingFace returns image as blob
    const imageBlob = await response.blob();
    
    // Validate that we got actual image data
    if (!imageBlob || imageBlob.size === 0) {
      throw new Error(
        `No image data received from ${options.model}. Please try again or select a different model.`
      );
    }

    const arrayBuffer = await imageBlob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Validate base64 is not empty
    if (!base64 || base64.length < 100) {
      throw new Error(
        `Invalid image data received from ${options.model}. Please try again.`
      );
    }

    return {
      base64,
      model: options.model,
      provider: "huggingface",
    };
  } catch (error: any) {
    // If it's already our custom error, re-throw it
    if (error.message.includes(options.model) || error.message.includes("timed out")) {
      throw error;
    }
    
    // Otherwise, wrap it with context
    console.error(`HuggingFace generation error for ${options.model}:`, error);
    throw new Error(
      `Failed to generate image with ${options.model}: ${error.message || "Unknown error"}. Please try again or select a different model.`
    );
  }
}

/**
 * Generate image using Replicate API
 * Supports: FLUX.1 Schnell and other Replicate models
 * 
 * @throws {Error} If API key is missing, request fails, or times out
 */
async function generateImageReplicate(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  const modelVersions: Record<string, string> = {
    "flux-schnell": "black-forest-labs/flux-schnell",
  };

  const modelId = modelVersions[options.model];
  if (!modelId) {
    throw new Error(`Model ${options.model} is not supported by Replicate. Please select a different model.`);
  }

  const apiKey = env.REPLICATE_API_TOKEN;
  if (!apiKey) {
    throw new Error(
      "Replicate API key is not configured. Please contact support or try a different model."
    );
  }

  try {
    // Start the prediction
    const startResponse = await withTimeout(
      fetch("https://api.replicate.com/v1/predictions", {
        method: "POST",
        headers: {
          "Authorization": `Token ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: modelId,
          input: {
            prompt: options.prompt,
            width: options.width || 1024,
            height: options.height || 1024,
            num_inference_steps: options.numInferenceSteps || 4, // FLUX Schnell is optimized for 4 steps
            guidance_scale: options.guidanceScale || 0, // FLUX Schnell doesn't use guidance
          },
        }),
      }),
      10000, // 10 second timeout for starting prediction
      `Failed to start image generation with ${options.model}. Please try again.`
    );

    if (!startResponse.ok) {
      const errorText = await startResponse.text();
      
      let userMessage = `Replicate API error (${startResponse.status})`;
      
      if (startResponse.status === 401 || startResponse.status === 403) {
        userMessage = "Authentication error with Replicate. Please contact support.";
      } else if (startResponse.status === 429) {
        userMessage = "Rate limit exceeded. Please wait a moment before trying again.";
      } else if (startResponse.status === 402) {
        userMessage = "Replicate account billing issue. Please contact support.";
      }
      
      console.error(`Replicate API error for ${options.model}:`, errorText);
      throw new Error(userMessage);
    }

    const prediction = await startResponse.json();
    const predictionId = prediction.id;

    if (!predictionId) {
      throw new Error(`Failed to start prediction for ${options.model}. Please try again.`);
    }

    // Poll for completion (max 60 seconds)
    let attempts = 0;
    const maxAttempts = 60;
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      const statusResponse = await fetch(
        `https://api.replicate.com/v1/predictions/${predictionId}`,
        {
          headers: {
            "Authorization": `Token ${apiKey}`,
          },
        }
      );

      if (!statusResponse.ok) {
        console.error(`Failed to check prediction status: ${statusResponse.status}`);
        throw new Error(`Failed to check generation status. Please try again.`);
      }

      const status = await statusResponse.json();

      if (status.status === "succeeded") {
        // Validate output exists
        if (!status.output || !Array.isArray(status.output) || status.output.length === 0) {
          throw new Error(
            `No image was generated by ${options.model}. Please try again or select a different model.`
          );
        }

        // Download the image and convert to base64
        const imageUrl = status.output[0];
        
        if (!imageUrl || typeof imageUrl !== "string") {
          throw new Error(
            `Invalid image URL received from ${options.model}. Please try again.`
          );
        }

        const imageResponse = await withTimeout(
          fetch(imageUrl),
          30000, // 30 second timeout for downloading image
          `Timed out downloading image from ${options.model}. Please try again.`
        );

        if (!imageResponse.ok) {
          throw new Error(`Failed to download generated image. Please try again.`);
        }

        const imageBlob = await imageResponse.blob();
        
        // Validate blob
        if (!imageBlob || imageBlob.size === 0) {
          throw new Error(
            `No image data received from ${options.model}. Please try again.`
          );
        }

        const arrayBuffer = await imageBlob.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const base64 = buffer.toString("base64");

        // Validate base64
        if (!base64 || base64.length < 100) {
          throw new Error(
            `Invalid image data from ${options.model}. Please try again.`
          );
        }

        return {
          base64,
          model: options.model,
          provider: "replicate",
        };
      } else if (status.status === "failed") {
        const errorDetail = status.error || "Unknown error";
        console.error(`Replicate prediction failed for ${options.model}:`, errorDetail);
        throw new Error(
          `Image generation failed: ${errorDetail}. Please try again or select a different model.`
        );
      } else if (status.status === "canceled") {
        throw new Error(`Image generation was canceled. Please try again.`);
      }

      attempts++;
    }

    throw new Error(
      `Image generation with ${options.model} timed out after 60 seconds. Please try again or select a different model.`
    );
  } catch (error: any) {
    // If it's already our custom error, re-throw it
    if (error.message.includes(options.model) || error.message.includes("timed out")) {
      throw error;
    }
    
    // Otherwise, wrap it with context
    console.error(`Replicate generation error for ${options.model}:`, error);
    throw new Error(
      `Failed to generate image with ${options.model}: ${error.message || "Unknown error"}. Please try again or select a different model.`
    );
  }
}

/**
 * Generate an image using the specified open-source model
 * This is the main entry point for image generation
 * 
 * **Workflow:**
 * 1. Routes request to appropriate provider (HuggingFace or Replicate) based on model
 * 2. Handles API calls with timeout protection
 * 3. Validates response data
 * 4. Returns base64-encoded image with metadata
 * 
 * **To add a new model:**
 * 1. Add the model ID to the ImageModel type
 * 2. Add the model endpoint/version to the appropriate provider function
 * 3. Update the routing logic below if using a new provider
 * 
 * **Error Handling:**
 * - All errors are caught and re-thrown with user-friendly messages
 * - Timeouts are handled gracefully with suggestions
 * - Empty/null responses are detected and reported
 * - API key issues are caught early
 * 
 * @throws {Error} With user-friendly message describing what went wrong and how to fix it
 */
export async function generateOpenSourceImage(
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> {
  // Validate input
  if (!options.prompt || options.prompt.trim().length === 0) {
    throw new Error("Image prompt cannot be empty. Please provide a description.");
  }

  // Route to appropriate provider based on model
  const replicateModels: ImageModel[] = ["flux-schnell"];
  const huggingfaceModels: ImageModel[] = [
    "sdxl",
    "stable-diffusion-2-1",
    "stable-diffusion-1-5",
    "kandinsky-2-2",
    "playground-v2",
  ];

  try {
    console.log(`Starting image generation with ${options.model}...`);
    
    if (replicateModels.includes(options.model)) {
      return await generateImageReplicate(options);
    } else if (huggingfaceModels.includes(options.model)) {
      return await generateImageHuggingFace(options);
    } else {
      throw new Error(
        `Unknown model: ${options.model}. Please select a supported model from the dropdown.`
      );
    }
  } catch (error: any) {
    // Log the full error for debugging
    console.error(`Image generation failed for model ${options.model}:`, {
      error: error.message,
      stack: error.stack,
      prompt: options.prompt?.substring(0, 100),
    });
    
    // Re-throw with context preserved
    // The error message is already user-friendly from the provider functions
    throw error;
  }
}

/**
 * Build a detailed, brand-aware image prompt for open-source models
 * This ensures prompts work well across different model architectures
 */
export function buildOpenSourceImagePrompt(
  baseContext: string,
  brief: any,
  tagline: string,
  description: string
): string {
  const parts: string[] = [baseContext];

  // Add imagery preference with model-optimized descriptions
  if (brief.imageryPreference) {
    const imageryStyles: Record<string, string> = {
      photography: "photorealistic, high-quality photography style, professional camera",
      illustration: "digital illustration style, artistic, hand-drawn aesthetic",
      abstract: "abstract and conceptual art style, modern art",
      geometric: "geometric patterns and shapes, structured design, clean lines",
      mixed: "mixed media approach, creative fusion, collage style",
      "3d": "3D rendered, modern CGI style, volumetric lighting",
    };
    parts.push(imageryStyles[brief.imageryPreference] || brief.imageryPreference);
  }

  // Add visual style with enhanced descriptions
  if (brief.visualStyle) {
    const visualDescriptors: Record<string, string> = {
      minimalist: "minimalist design, clean lines, simple composition, negative space",
      vibrant: "vibrant and energetic, bold colors, dynamic, high saturation",
      corporate: "professional and polished, business-appropriate, clean",
      artistic: "artistic and creative, expressive, unique perspective, painterly",
      modern: "modern and contemporary, sleek design, trendy",
      vintage: "vintage aesthetic, retro inspired, nostalgic feel, aged",
      luxurious: "luxurious and premium, high-end, sophisticated, elegant",
      organic: "organic and natural, earthy, authentic, textured",
    };
    parts.push(visualDescriptors[brief.visualStyle] || brief.visualStyle);
  }

  // Add brand colors
  const colors: string[] = [];
  if (brief.brandColorPrimary) {
    colors.push(brief.brandColorPrimary);
  }
  if (brief.brandColorSecondary) {
    colors.push(brief.brandColorSecondary);
  }
  if (colors.length > 0) {
    parts.push(`color palette featuring ${colors.join(" and ")}`);
  }

  // Add brand themes
  if (brief.brandThemes) {
    parts.push(`incorporating visual elements: ${brief.brandThemes}`);
  }

  // Add tone
  parts.push(`${brief.tone} tone`);

  // Add target audience context
  parts.push(`designed to appeal to ${brief.audience}`);

  // Add quality enhancers for open-source models
  parts.push("professional marketing quality, high resolution, visually striking, detailed, sharp focus");

  return parts.join(", ") + ". No watermarks, no text, no logos.";
}
