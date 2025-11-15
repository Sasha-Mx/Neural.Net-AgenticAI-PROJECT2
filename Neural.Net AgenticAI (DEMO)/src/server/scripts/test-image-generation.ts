import { generateOpenSourceImage, type ImageModel } from "~/server/utils/image-generation";
import { minioClient, minioBaseUrl } from "~/server/minio";
import { env } from "~/server/env";

async function testImageGeneration() {
  console.log("=".repeat(60));
  console.log("Open-Source Image Generation Integration Test");
  console.log("=".repeat(60));
  console.log();

  // Step 1: Check API key configuration
  console.log("Step 1: Checking API Key configuration...");
  
  const huggingfaceKey = env.HUGGINGFACE_API_KEY;
  const replicateToken = env.REPLICATE_API_TOKEN;
  
  if (!huggingfaceKey && !replicateToken) {
    console.error("❌ FAILED: No image generation API keys configured");
    console.error();
    console.error("You need at least one of:");
    console.error("1. HUGGINGFACE_API_KEY - For SDXL, SD 2.1, SD 1.5, Kandinsky, Playground");
    console.error("2. REPLICATE_API_TOKEN - For FLUX.1 Schnell");
    console.error();
    console.error("To get started:");
    console.error("1. HuggingFace (FREE): https://huggingface.co/settings/tokens");
    console.error("2. Replicate (Pay-as-you-go): https://replicate.com/account/api-tokens");
    console.error();
    console.error("Add to your .env file and restart the application.");
    process.exit(1);
  }
  
  if (huggingfaceKey) {
    console.log(`✓ HuggingFace API key configured: ${huggingfaceKey.substring(0, 7)}...`);
  }
  if (replicateToken) {
    console.log(`✓ Replicate API token configured: ${replicateToken.substring(0, 7)}...`);
  }
  console.log();

  // Step 2: Check MinIO connectivity
  console.log("Step 2: Checking MinIO connectivity...");
  try {
    const bucketExists = await minioClient.bucketExists("campaign-assets");
    if (!bucketExists) {
      console.error("❌ FAILED: campaign-assets bucket does not exist");
      console.error("   Run the setup script to create the bucket");
      process.exit(1);
    }
    console.log("✓ MinIO bucket 'campaign-assets' is accessible");
    console.log();
  } catch (error) {
    console.error("❌ FAILED: Cannot connect to MinIO");
    console.error(`   Error: ${error}`);
    process.exit(1);
  }

  // Step 3: Test image generation with available models
  console.log("Step 3: Testing image generation with available models...");
  console.log();

  const testPrompt = "A professional marketing campaign visual featuring a modern tech startup office, high quality, professional photography style";
  
  // Determine which models to test based on available API keys
  const modelsToTest: ImageModel[] = [];
  
  if (huggingfaceKey) {
    modelsToTest.push("sdxl"); // Test SDXL as the default
  }
  
  if (replicateToken) {
    modelsToTest.push("flux-schnell"); // Test FLUX if Replicate is available
  }

  let successCount = 0;
  const results: Array<{ model: ImageModel; success: boolean; url?: string; error?: string }> = [];

  for (const model of modelsToTest) {
    console.log(`Testing ${model.toUpperCase()}...`);
    console.log(`   Generating test image (this may take 10-60 seconds)...`);
    
    try {
      const startTime = Date.now();
      
      const imageResult = await generateOpenSourceImage({
        model: model,
        prompt: testPrompt,
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`✓ Image generated successfully in ${duration}s`);

      // Upload to MinIO
      const imageBuffer = Buffer.from(imageResult.base64, "base64");
      const fileName = `public/test-${model}-${Date.now()}.png`;
      
      await minioClient.putObject(
        "campaign-assets",
        fileName,
        imageBuffer,
        imageBuffer.length,
        {
          "Content-Type": "image/png",
        }
      );
      
      const imageUrl = `${minioBaseUrl}/campaign-assets/${fileName}`;
      console.log(`✓ Image uploaded successfully`);
      console.log(`   URL: ${imageUrl}`);
      console.log();
      
      successCount++;
      results.push({ model, success: true, url: imageUrl });
      
    } catch (error: any) {
      console.error(`✗ Failed to generate image with ${model}`);
      console.error(`   Error: ${error.message || error}`);
      console.log();
      
      results.push({ model, success: false, error: error.message || String(error) });
      
      if (error.message?.includes("401") || error.message?.includes("authentication")) {
        console.error("This looks like an authentication error.");
        console.error(`Please verify your ${model === "flux-schnell" ? "REPLICATE_API_TOKEN" : "HUGGINGFACE_API_KEY"} is valid.`);
      } else if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
        console.error("This looks like a quota or rate limit error.");
        console.error("Please check your account usage limits.");
      } else if (error.message?.includes("loading")) {
        console.error("The model is currently loading on the server.");
        console.error("Wait 20-30 seconds and try again.");
      }
      console.log();
    }
  }

  // Summary
  console.log("=".repeat(60));
  if (successCount === modelsToTest.length) {
    console.log("✅ ALL TESTS PASSED!");
  } else if (successCount > 0) {
    console.log("⚠️  PARTIAL SUCCESS");
  } else {
    console.log("❌ ALL TESTS FAILED");
  }
  console.log("=".repeat(60));
  console.log();

  console.log("Test Results:");
  console.log();
  for (const result of results) {
    if (result.success) {
      console.log(`✓ ${result.model.toUpperCase()}: SUCCESS`);
      console.log(`  URL: ${result.url}`);
    } else {
      console.log(`✗ ${result.model.toUpperCase()}: FAILED`);
      console.log(`  Error: ${result.error}`);
    }
    console.log();
  }

  if (successCount > 0) {
    console.log("Your open-source image generation is working!");
    console.log("You can now run the full campaign workflow.");
    console.log();
    console.log("To test the full workflow:");
    console.log("1. Navigate to http://localhost:5173/campaign-builder");
    console.log("2. Fill out the campaign form");
    console.log("3. Select your preferred image model");
    console.log("4. Submit to start the AI workflow");
    console.log("5. Watch real-time progress in the workspace view");
    console.log();
  } else {
    console.log("Please fix the errors above and try again.");
    console.log();
    console.log("Common solutions:");
    console.log("- Verify API keys are correct in .env file");
    console.log("- Restart the application after changing .env");
    console.log("- Check HuggingFace/Replicate service status");
    console.log("- Wait a few minutes if models are loading");
    console.log();
  }

  process.exit(successCount > 0 ? 0 : 1);
}

testImageGeneration()
  .then(() => {
    // Exit handled in function
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
