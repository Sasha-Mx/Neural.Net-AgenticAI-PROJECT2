import { experimental_generateImage as generateImage } from "ai";
import { openai } from "@ai-sdk/openai";
import { minioClient, minioBaseUrl } from "~/server/minio";
import { env } from "~/server/env";

async function testDalleIntegration() {
  console.log("=".repeat(60));
  console.log("DALL-E 3 Integration Test");
  console.log("=".repeat(60));
  console.log();

  // Step 1: Check API key configuration
  console.log("Step 1: Checking OpenAI API Key configuration...");
  const apiKey = env.OPENAI_API_KEY;
  
  if (!apiKey || apiKey === "skshame" || !apiKey.startsWith("sk-")) {
    console.error("❌ FAILED: Invalid or missing OPENAI_API_KEY");
    console.error(`   Current value: ${apiKey}`);
    console.error(`   Expected: A valid OpenAI API key starting with 'sk-'`);
    console.error();
    console.error("To fix this:");
    console.error("1. Get an API key from https://platform.openai.com/api-keys");
    console.error("2. Update the OPENAI_API_KEY in your .env file");
    console.error("3. Restart the application");
    process.exit(1);
  }
  
  console.log(`✓ API key configured: ${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}`);
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

  // Step 3: Test DALL-E 3 image generation
  console.log("Step 3: Testing DALL-E 3 image generation...");
  console.log("   Generating test image (this may take 10-30 seconds)...");
  
  const testPrompt = "A professional marketing campaign visual featuring a modern tech startup office, high quality, professional photography style";
  
  try {
    const startTime = Date.now();
    
    const { image } = await generateImage({
      model: openai.image("dall-e-3"),
      prompt: testPrompt,
      size: "1024x1024",
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    console.log(`✓ Image generated successfully in ${duration}s`);
    console.log();

    // Step 4: Upload to MinIO
    console.log("Step 4: Uploading test image to MinIO...");
    
    const imageBuffer = Buffer.from(image.base64, "base64");
    const fileName = `public/test-dalle-${Date.now()}.png`;
    
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

    // Success summary
    console.log("=".repeat(60));
    console.log("✅ ALL TESTS PASSED!");
    console.log("=".repeat(60));
    console.log();
    console.log("Your DALL-E 3 integration is working correctly.");
    console.log("You can now run the full campaign workflow.");
    console.log();
    console.log("Test image URL:");
    console.log(imageUrl);
    console.log();
    console.log("To test the full workflow:");
    console.log("1. Navigate to http://localhost:5173/campaign-builder");
    console.log("2. Fill out the campaign form");
    console.log("3. Submit to start the AI workflow");
    console.log("4. Watch real-time progress in the workspace view");
    console.log();
    
  } catch (error: any) {
    console.error("❌ FAILED: Error generating image with DALL-E 3");
    console.error(`   Error: ${error.message || error}`);
    console.error();
    
    if (error.message?.includes("401") || error.message?.includes("authentication")) {
      console.error("This looks like an authentication error.");
      console.error("Please verify your OPENAI_API_KEY is valid and has not expired.");
    } else if (error.message?.includes("quota") || error.message?.includes("rate limit")) {
      console.error("This looks like a quota or rate limit error.");
      console.error("Please check your OpenAI account billing and usage limits.");
    } else if (error.message?.includes("model")) {
      console.error("This looks like a model access error.");
      console.error("Please verify your API key has access to DALL-E 3.");
    }
    
    console.error();
    console.error("Full error details:");
    console.error(error);
    process.exit(1);
  }
}

testDalleIntegration()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error("Unexpected error:", error);
    process.exit(1);
  });
