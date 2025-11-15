# DALL-E 3 Testing Guide (DEPRECATED)

⚠️ **This guide is deprecated as of the latest version.**

The application has been updated to use **open-source image generation models** instead of DALL-E 3.

## What Changed?

- ✅ **Replaced DALL-E 3** with multiple open-source models (SDXL, FLUX, Stable Diffusion, etc.)
- ✅ **User-selectable models** - Choose your preferred model for each campaign
- ✅ **Lower costs** - Free tier available via HuggingFace
- ✅ **More control** - Customize prompts, negative prompts, and generation parameters
- ✅ **Better quality** - Access to latest open-source models with excellent results

## Migration Guide

If you were using DALL-E 3:

1. The `OPENAI_API_KEY` environment variable is no longer required (but kept for backward compatibility)
2. Add `HUGGINGFACE_API_KEY` to your `.env` file (see new guide below)
3. Optionally add `REPLICATE_API_TOKEN` for FLUX.1 Schnell (ultra-fast generation)
4. Existing campaigns will continue to work
5. New campaigns automatically use open-source models

## New Documentation

Please refer to the **new comprehensive guide**:

📖 **[Open-Source Image Generation Guide](./IMAGE_GENERATION_GUIDE.md)**

This guide covers:
- Setting up HuggingFace and Replicate API keys
- Choosing the right model for your needs
- Testing the integration
- Prompt engineering best practices
- Troubleshooting common issues
- Cost comparison and optimization
- Adding new models to the system

## Quick Start

1. Get a free HuggingFace API key: https://huggingface.co/settings/tokens
2. Add to `.env`: `HUGGINGFACE_API_KEY=hf_your_key_here`
3. Restart the application
4. Create a campaign and select your preferred model (defaults to SDXL)
5. Enjoy high-quality, cost-effective image generation!

## Benefits of Open-Source Models

| Feature | DALL-E 3 | Open-Source Models |
|---------|----------|-------------------|
| **Cost** | ~$0.04-0.08 per image | Free (HuggingFace) or ~$0.003 (Replicate) |
| **Model Choice** | Single model | 6+ models to choose from |
| **Customization** | Limited | Full control over parameters |
| **Quality** | Excellent | Excellent (comparable or better) |
| **Speed** | 10-30 seconds | 5-60 seconds (model dependent) |
| **Privacy** | Sent to OpenAI | HuggingFace/Replicate or self-hosted |

## Support

For questions about the new system, please refer to the [IMAGE_GENERATION_GUIDE.md](./IMAGE_GENERATION_GUIDE.md) or check the troubleshooting section.

---

**Last Updated:** [Current Date]  
**Status:** Deprecated - Use IMAGE_GENERATION_GUIDE.md instead
