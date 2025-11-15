import { minioClient } from "~/server/minio";
import { db } from "~/server/db";

async function setup() {
  // Create campaign-assets bucket for storing generated images
  const bucketName = "campaign-assets";
  const bucketExists = await minioClient.bucketExists(bucketName);
  
  if (!bucketExists) {
    await minioClient.makeBucket(bucketName);
    console.log(`Created bucket: ${bucketName}`);
    
    // Set policy to allow public read access for files with 'public/' prefix
    const policy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: { AWS: ["*"] },
          Action: ["s3:GetObject"],
          Resource: [`arn:aws:s3:::${bucketName}/public/*`],
        },
      ],
    };
    
    await minioClient.setBucketPolicy(bucketName, JSON.stringify(policy));
    console.log(`Set public read policy for ${bucketName}/public/*`);
  }

  // Seed default campaign templates
  const templates = [
    {
      name: "Product Launch",
      description: "Perfect for launching a new product or service with maximum impact",
      category: "product_launch",
      defaultGoal: "Generate excitement and drive pre-orders for our new product launch",
      defaultTone: "bold",
      defaultAudience: "Early adopters and tech enthusiasts",
      defaultKeywords: "innovation, new, exclusive, revolutionary",
      promptInstructions: "Focus on highlighting unique features, creating urgency, and building anticipation. Emphasize the innovative aspects and early-bird benefits.",
      isDefault: true,
    },
    {
      name: "Seasonal Sale",
      description: "Drive sales during seasonal promotions and special events",
      category: "seasonal_sale",
      defaultGoal: "Maximize sales during our seasonal promotion with compelling offers",
      defaultTone: "friendly",
      defaultAudience: "Value-conscious shoppers and existing customers",
      defaultKeywords: "sale, limited time, savings, special offer",
      promptInstructions: "Create urgency with time-limited offers. Emphasize savings and value. Use warm, inviting language that encourages immediate action.",
      isDefault: true,
    },
    {
      name: "Brand Awareness",
      description: "Build recognition and establish your brand identity in the market",
      category: "brand_awareness",
      defaultGoal: "Increase brand visibility and establish our unique position in the market",
      defaultTone: "inspirational",
      defaultAudience: "Potential customers and industry influencers",
      defaultKeywords: "mission, values, story, community",
      promptInstructions: "Tell the brand story authentically. Focus on values, mission, and what makes the brand unique. Create emotional connections rather than pushing sales.",
      isDefault: true,
    },
  ];

  for (const template of templates) {
    const existing = await db.campaignTemplate.findFirst({
      where: { name: template.name, isDefault: true },
    });
    
    if (!existing) {
      await db.campaignTemplate.create({ data: template });
      console.log(`Created template: ${template.name}`);
    }
  }
}

setup()
  .then(() => {
    console.log("setup.ts complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
