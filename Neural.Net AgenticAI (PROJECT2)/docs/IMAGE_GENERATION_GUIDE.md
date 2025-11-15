# Open-Source Image Generation Guide

This guide explains how to use and configure open-source image generation models in the campaign workflow.

## Overview

The application uses **open-source image generation models** instead of proprietary services like DALL-E 3. Users can choose from multiple models, each with different characteristics, speeds, and quality levels.

### Available Models

1. **Stable Diffusion XL (SDXL)** - Default, best overall quality
2. **FLUX.1 Schnell** - Ultra-fast generation via Replicate
3. **Stable Diffusion 2.1** - Reliable and consistent
4. **Playground v2.5** - Vibrant colors and artistic style
5. **Kandinsky 2.2** - Unique artistic style
6. **Stable Diffusion 1.5** - Fast and efficient

## Prerequisites

### 1. API Key Setup

The application supports two providers for open-source models:

#### HuggingFace Inference API (Recommended)

Supports: SDXL, Stable Diffusion 2.1, Stable Diffusion 1.5, Kandinsky 2.2, Playground v2.5

**Getting an API Key:**
1. Go to [HuggingFace Settings](https://huggingface.co/settings/tokens)
2. Sign in or create a free account
3. Click "New token" or "Create new token"
4. Give it a name (e.g., "Campaign Generator")
5. Select "Read" access (sufficient for inference)
6. Copy the token (starts with `hf_`)

**Configuring the API Key:**
1. Open the `.env` file in the project root
2. Find the line: `HUGGINGFACE_API_KEY=your_huggingface_api_key_here`
3. Replace with your actual API key:
   ```
   HUGGINGFACE_API_KEY=hf_xxxxxxxxxxxxxxxxxxxxx
   ```
4. Save the file
5. Restart the application

#### Replicate API (Optional)

Supports: FLUX.1 Schnell (ultra-fast generation)

**Getting an API Token:**
1. Go to [Replicate Account](https://replicate.com/account/api-tokens)
2. Sign in or create an account
3. Copy your API token
4. Note: Replicate has pay-as-you-go pricing (~$0.003 per image)

**Configuring the API Token:**
1. Open the `.env` file
2. Find: `REPLICATE_API_TOKEN=your_replicate_api_token_here`
3. Replace with your token:
   ```
   REPLICATE_API_TOKEN=r8_xxxxxxxxxxxxxxxxxxxxx
   ```
4. Save and restart

### 2. Model Access

- **HuggingFace**: Free tier includes generous limits for inference
- **Replicate**: Requires billing setup, pay-per-use pricing
- **Rate Limits**: Vary by provider and account tier

## Model Comparison

| Model | Provider | Speed | Quality | Best For |
|-------|----------|-------|---------|----------|
| **SDXL** | HuggingFace | Medium | Excellent | General use, high quality needed |
| **FLUX.1 Schnell** | Replicate | Fast | Great | Quick iterations, rapid testing |
| **SD 2.1** | HuggingFace | Medium | Great | Consistent results, general use |
| **Playground v2.5** | HuggingFace | Medium | Excellent | Creative campaigns, vibrant colors |
| **Kandinsky 2.2** | HuggingFace | Medium | Great | Abstract concepts, unique style |
| **SD 1.5** | HuggingFace | Fast | Good | Quick drafts, testing prompts |

## Testing the Integration

### Method 1: Campaign Builder Test

1. **Start the Application**
   ```bash
   npm run dev
   # or
   ./scripts/run
   ```

2. **Create a Test Campaign**
   - Navigate to http://localhost:5173/campaign-builder
   - Fill out the form with test data
   - **Select an image model** (defaults to SDXL)
   - Click "Generate Campaign with AI"

3. **Monitor Progress**
   - Watch the DesignerAgent generate images in real-time
   - Images appear one by one as they're created
   - Total time: 30-90 seconds for 3 images

4. **Verify Results**
   - Check that images match your campaign brief
   - Verify the selected model was used (shown in metadata)
   - Test regeneration with different models

### Method 2: Direct API Test

You can test the image generation directly via the tRPC endpoint:

```typescript
// In browser console or test file
const result = await trpc.regenerateImage.mutate({
  authToken: "your-token",
  assetId: 123,
  model: "sdxl",
  customPrompt: "A modern tech startup office, professional photography"
});
```

## Using Different Models

### In Campaign Builder

1. Scroll to "Image Generation" section
2. Select your preferred model from the grid
3. See speed and quality indicators
4. Model is saved with the campaign

### In Workspace (Regeneration)

1. Navigate to workspace view
2. Find the "Select Image Model" dropdown
3. Choose a different model
4. Click "Regenerate Image"
5. Optionally add custom prompt refinements

### In Brand Profiles

1. Go to Brand Profiles page
2. Create or edit a profile
3. Set "Preferred Image Generation Model"
4. This pre-fills when creating campaigns

## Prompt Engineering

The system automatically builds detailed prompts including:

- Campaign tagline and description
- Visual style (minimalist, vibrant, etc.)
- Imagery preference (photography, illustration, etc.)
- Brand colors
- Target audience
- Tone and aesthetic

### Custom Prompts

You can override with custom prompts:

**Good prompt example:**
```
A professional tech startup office with modern furniture, 
natural lighting, people collaborating, minimalist design, 
blue and white color scheme, photorealistic
```

**Bad prompt example:**
```
office
```

### Negative Prompts

Advanced users can specify what to avoid:
```
low quality, blurry, watermark, text, logo, signature, 
distorted, unrealistic, amateur
```

## Cost Estimation

### HuggingFace Inference API (Free Tier)
- **Cost**: Free for reasonable usage
- **Rate Limits**: ~1000 requests/day on free tier
- **Per Campaign**: 3 images = 3 requests
- **Monthly**: ~10,000 images free

### Replicate (Pay-as-you-go)
- **FLUX.1 Schnell**: ~$0.003 per image
- **Per Campaign**: 3 images = ~$0.009
- **100 Campaigns**: ~$0.90
- **1000 Campaigns**: ~$9.00

**Recommendation**: Start with HuggingFace (free), add Replicate for FLUX if you need ultra-fast generation.

## Troubleshooting

### Issue: "HUGGINGFACE_API_KEY is not configured"

**Symptoms:**
- Error during image generation
- Campaign workflow fails at DesignerAgent

**Solution:**
1. Verify `.env` file has `HUGGINGFACE_API_KEY` set
2. Ensure no extra spaces or quotes
3. Token should start with `hf_`
4. Restart the application after changing `.env`

### Issue: "Model is currently loading"

**Symptoms:**
- HuggingFace returns 503 error
- Message about model loading

**Solution:**
- This is normal for first request to a model
- Wait 20-30 seconds and try again
- Model will be cached for future requests
- Consider using a different model temporarily

### Issue: Images not generating

**Symptoms:**
- Workflow completes but no images
- Only 1-2 images instead of 3

**Solution:**
1. Check browser console for errors
2. Verify API keys are correct
3. Check HuggingFace/Replicate status pages
4. Try a different model
5. Check rate limits on your account

### Issue: Slow generation

**Symptoms:**
- Each image takes >60 seconds
- Workflow takes >5 minutes

**Solution:**
- HuggingFace can be slow during high demand
- Try FLUX.1 Schnell via Replicate (faster)
- Use SD 1.5 for quick drafts
- Check your internet connection

### Issue: Low quality images

**Symptoms:**
- Images don't match prompt
- Blurry or distorted results

**Solution:**
1. Try SDXL or Playground v2.5 (higher quality)
2. Improve your prompt with more details
3. Add negative prompts to avoid issues
4. Adjust brand colors and themes
5. Try regenerating with different model

### Issue: Rate limit exceeded

**Symptoms:**
- Error about quota or rate limits
- First few images work, then fail

**Solution:**
1. Check your HuggingFace account usage
2. Upgrade to Pro tier if needed ($9/month)
3. Wait for rate limit to reset (usually 1 hour)
4. Use Replicate as backup (pay-per-use)

## Advanced Configuration

### Adding New Models

To add support for additional open-source models:

1. **Update the ImageModel type** in `src/server/utils/image-generation.ts`:
   ```typescript
   export type ImageModel = 
     | "sdxl"
     | "your-new-model";
   ```

2. **Add model endpoint** to the appropriate provider function:
   ```typescript
   const modelEndpoints: Record<string, string> = {
     "your-new-model": "org/model-name",
   };
   ```

3. **Update routing logic** if using a new provider:
   ```typescript
   const huggingfaceModels: ImageModel[] = [
     "sdxl",
     "your-new-model",
   ];
   ```

4. **Add to ImageModelSelector** in `src/components/ImageModelSelector.tsx`:
   ```typescript
   {
     id: "your-new-model",
     name: "Your Model Name",
     description: "Description...",
     provider: "huggingface",
     speed: "medium",
     quality: "excellent",
   }
   ```

### Custom Parameters

Advanced users can pass model-specific parameters:

```typescript
await regenerateImageMutation.mutateAsync({
  authToken: token,
  assetId: imageAssetId,
  model: "sdxl",
  guidanceScale: 7.5,        // How closely to follow prompt (1-20)
  numInferenceSteps: 50,     // Quality vs speed trade-off
  negativePrompt: "blurry, low quality",
});
```

## Environment Variables Summary

### Required for Basic Functionality:
- `HUGGINGFACE_API_KEY` - For SDXL, SD 2.1, SD 1.5, Kandinsky, Playground

### Optional:
- `REPLICATE_API_TOKEN` - For FLUX.1 Schnell (ultra-fast)
- `OPENAI_API_KEY` - Legacy, no longer used for images

### Current Values:
After setup, verify your `.env` file looks like:
```env
HUGGINGFACE_API_KEY=hf_your_actual_key_here
REPLICATE_API_TOKEN=r8_your_actual_token_here  # optional
OPENAI_API_KEY=...  # legacy, can be removed
```

## Best Practices

1. **Start with SDXL** - Best quality for most use cases
2. **Use FLUX for speed** - When you need quick iterations
3. **Set brand profiles** - Save preferred models per brand
4. **Provide detailed prompts** - Better prompts = better images
5. **Use negative prompts** - Avoid common issues
6. **Monitor costs** - HuggingFace free tier is generous
7. **Test different models** - Each has unique strengths
8. **Save successful prompts** - Reuse what works

## Support

If you encounter issues not covered here:

1. Check the workflow logs in campaign details
2. Review server logs for detailed errors
3. Verify environment variables are set correctly
4. Test with a simple prompt first
5. Check HuggingFace/Replicate status pages
6. Try a different model as fallback

## Migration from DALL-E

If you previously used DALL-E 3:

1. Remove or comment out `OPENAI_API_KEY` in `.env`
2. Add `HUGGINGFACE_API_KEY` to `.env`
3. Existing campaigns will continue to work
4. New campaigns use open-source models
5. Image quality is comparable or better
6. Costs are significantly lower (free tier available)
7. More control over model selection
