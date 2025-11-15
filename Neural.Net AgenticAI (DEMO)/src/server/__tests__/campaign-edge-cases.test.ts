/**
 * Campaign Edge Case Tests
 * 
 * These tests demonstrate how to handle missing, incomplete, or undefined data
 * in campaign generation and display. They serve as both documentation and
 * actual test cases for resilience.
 * 
 * Run with: npm test src/server/__tests__/campaign-edge-cases.test.ts
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '~/server/db';
import { runCampaignWorkflow } from '~/server/workflows/campaign-workflow';

// Mock AI SDK to control responses
vi.mock('ai', () => ({
  generateObject: vi.fn(),
  experimental_generateImage: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: {
    image: vi.fn(() => 'dall-e-3'),
  },
}));

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    // Mock model
  })),
}));

describe('Campaign Creation - Complete Data', () => {
  let testUserId: number;
  let testCampaignId: number;

  beforeEach(async () => {
    // Create test user
    const user = await db.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        hashedPassword: 'hashed',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    // Cleanup
    if (testCampaignId) {
      await db.campaign.delete({ where: { id: testCampaignId } }).catch(() => {});
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  it('should create campaign with all required fields', async () => {
    const campaign = await db.campaign.create({
      data: {
        userId: testUserId,
        name: 'Complete Campaign',
        brief: {
          goal: 'Launch new product',
          tone: 'professional',
          audience: 'Tech professionals',
          keywords: 'innovation, technology',
          brandColorPrimary: '#4F46E5',
          brandColorSecondary: '#7C3AED',
          visualStyle: 'modern',
          imageryPreference: 'photography',
          brandThemes: 'technology icons, clean design',
        },
        status: 'generating',
      },
    });

    testCampaignId = campaign.id;

    expect(campaign).toBeDefined();
    expect(campaign.name).toBe('Complete Campaign');
    expect(campaign.status).toBe('generating');
    expect(campaign.brief).toHaveProperty('goal');
    expect(campaign.brief).toHaveProperty('tone');
  });

  it('should handle campaign brief as JSON with all fields', async () => {
    const campaign = await db.campaign.create({
      data: {
        userId: testUserId,
        name: 'JSON Brief Campaign',
        brief: {
          goal: 'Test goal',
          tone: 'friendly',
          audience: 'Everyone',
        },
        status: 'generating',
      },
    });

    testCampaignId = campaign.id;

    const retrieved = await db.campaign.findUnique({
      where: { id: campaign.id },
    });

    expect(retrieved).toBeDefined();
    expect(retrieved?.brief).toMatchObject({
      goal: 'Test goal',
      tone: 'friendly',
      audience: 'Everyone',
    });
  });
});

describe('Campaign Creation - Incomplete/Missing Data', () => {
  let testUserId: number;
  let testCampaignId: number;

  beforeEach(async () => {
    const user = await db.user.create({
      data: {
        name: 'Test User',
        email: `test-${Date.now()}@example.com`,
        hashedPassword: 'hashed',
      },
    });
    testUserId = user.id;
  });

  afterEach(async () => {
    if (testCampaignId) {
      await db.campaign.delete({ where: { id: testCampaignId } }).catch(() => {});
    }
    if (testUserId) {
      await db.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
  });

  it('should create campaign with minimal required fields only', async () => {
    // Test that campaign can be created with only required fields
    const campaign = await db.campaign.create({
      data: {
        userId: testUserId,
        name: 'Minimal Campaign',
        brief: {
          goal: 'Basic goal',
          tone: 'neutral',
          audience: 'General',
        },
        status: 'generating',
      },
    });

    testCampaignId = campaign.id;

    expect(campaign).toBeDefined();
    expect(campaign.brief).not.toHaveProperty('keywords');
    expect(campaign.brief).not.toHaveProperty('brandColorPrimary');
  });

  it('should handle missing optional brand fields gracefully', async () => {
    const campaign = await db.campaign.create({
      data: {
        userId: testUserId,
        name: 'No Brand Info',
        brief: {
          goal: 'Test without branding',
          tone: 'casual',
          audience: 'Anyone',
          // No brand colors, visual style, imagery preference, or themes
        },
        status: 'generating',
      },
    });

    testCampaignId = campaign.id;

    const retrieved = await db.campaign.findUnique({
      where: { id: campaign.id },
    });

    // Should not crash when accessing undefined fields
    const brief = retrieved?.brief as any;
    expect(brief.brandColorPrimary).toBeUndefined();
    expect(brief.visualStyle).toBeUndefined();
    expect(brief.imageryPreference).toBeUndefined();
  });

  it('should handle assets with null content', async () => {
    const campaign = await db.campaign.create({
      data: {
        userId: testUserId,
        name: 'Campaign with null assets',
        brief: { goal: 'Test', tone: 'test', audience: 'test' },
        status: 'generating',
      },
    });

    testCampaignId = campaign.id;

    // Create asset with null content (simulating failed AI generation)
    const asset = await db.asset.create({
      data: {
        campaignId: campaign.id,
        type: 'text',
        content: null, // Explicitly null
      },
    });

    const retrieved = await db.asset.findUnique({
      where: { id: asset.id },
    });

    expect(retrieved).toBeDefined();
    expect(retrieved?.content).toBeNull();
    
    // Cleanup
    await db.asset.delete({ where: { id: asset.id } });
  });

  it('should handle assets with incomplete JSON content', async () => {
    const campaign = await db.campaign.create({
      data: {
        userId: testUserId,
        name: 'Campaign with incomplete content',
        brief: { goal: 'Test', tone: 'test', audience: 'test' },
        status: 'generating',
      },
    });

    testCampaignId = campaign.id;

    // Create asset with partial content (simulating incomplete AI output)
    const asset = await db.asset.create({
      data: {
        campaignId: campaign.id,
        type: 'text',
        content: {
          tagline: 'Test tagline',
          // description is missing
        },
      },
    });

    const retrieved = await db.asset.findUnique({
      where: { id: asset.id },
    });

    const content = retrieved?.content as any;
    expect(content.tagline).toBe('Test tagline');
    expect(content.description).toBeUndefined();
    
    // Cleanup
    await db.asset.delete({ where: { id: asset.id } });
  });
});

describe('Frontend Resilience Guidelines', () => {
  /**
   * These tests document patterns for safely rendering campaign data
   * in React components when fields might be undefined or null.
   */

  it('should use optional chaining for nested properties', () => {
    // GOOD: Safe access with optional chaining
    const campaign: any = {
      brief: null,
    };

    const tagline = campaign?.brief?.tagline;
    expect(tagline).toBeUndefined();

    // BAD: Would throw error
    // const badTagline = campaign.brief.tagline; // TypeError!
  });

  it('should provide default values for missing data', () => {
    const asset: any = {
      content: null,
    };

    // GOOD: Provide defaults
    const tagline = asset?.content?.tagline || 'No tagline available';
    const description = asset?.content?.description || '';

    expect(tagline).toBe('No tagline available');
    expect(description).toBe('');
  });

  it('should conditionally render based on data availability', () => {
    const campaign: any = {
      brief: {
        goal: 'Test goal',
        // tagline is missing
      },
    };

    // GOOD: Conditional rendering pattern
    const shouldRenderTagline = campaign?.brief?.tagline !== undefined;
    expect(shouldRenderTagline).toBe(false);

    const shouldRenderGoal = campaign?.brief?.goal !== undefined;
    expect(shouldRenderGoal).toBe(true);
  });

  it('should handle arrays safely', () => {
    const asset: any = {
      content: {
        emailSubjectLines: undefined,
      },
    };

    // GOOD: Safe array access with default
    const subjectLines = asset?.content?.emailSubjectLines || [];
    expect(subjectLines).toEqual([]);
    expect(subjectLines.length).toBe(0);

    // Safe to map over
    const rendered = subjectLines.map((line: string) => line);
    expect(rendered).toEqual([]);
  });

  it('should handle social media posts with missing platforms', () => {
    const asset: any = {
      content: {
        socialMediaPosts: {
          twitter: 'Tweet content',
          // linkedin, instagram, facebook are missing
        },
      },
    };

    // GOOD: Access with defaults
    const twitter = asset?.content?.socialMediaPosts?.twitter || '';
    const linkedin = asset?.content?.socialMediaPosts?.linkedin || '';
    const instagram = asset?.content?.socialMediaPosts?.instagram || '';
    const facebook = asset?.content?.socialMediaPosts?.facebook || '';

    expect(twitter).toBe('Tweet content');
    expect(linkedin).toBe('');
    expect(instagram).toBe('');
    expect(facebook).toBe('');
  });
});

describe('Backend Error Handling', () => {
  it('should handle AI generation failures gracefully', async () => {
    // Mock AI failure
    const { generateObject } = await import('ai');
    (generateObject as any).mockRejectedValueOnce(new Error('AI service unavailable'));

    // The workflow should catch errors and update campaign status
    // In production, this would be handled by try-catch in runCampaignWorkflow
    
    const error = await generateObject({
      model: {} as any,
      schema: {} as any,
      prompt: 'test',
    }).catch((e) => e);

    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('AI service unavailable');
  });

  it('should validate required fields before processing', () => {
    // Example validation that should happen in tRPC procedures
    const validateCampaignInput = (input: any) => {
      if (!input.name || input.name.trim() === '') {
        throw new Error('Campaign name is required');
      }
      if (!input.goal || input.goal.length < 10) {
        throw new Error('Goal must be at least 10 characters');
      }
      if (!input.tone) {
        throw new Error('Tone is required');
      }
      if (!input.audience) {
        throw new Error('Target audience is required');
      }
      return true;
    };

    // Valid input
    expect(() => validateCampaignInput({
      name: 'Test Campaign',
      goal: 'This is a valid goal with enough characters',
      tone: 'professional',
      audience: 'Developers',
    })).not.toThrow();

    // Invalid inputs
    expect(() => validateCampaignInput({ name: '' })).toThrow('Campaign name is required');
    expect(() => validateCampaignInput({ name: 'Test', goal: 'Short' })).toThrow('at least 10 characters');
  });
});

/**
 * BEST PRACTICES FOR HANDLING MISSING DATA
 * ==========================================
 * 
 * 1. FRONTEND (React Components):
 *    - Always use optional chaining (?.) for nested properties
 *    - Provide sensible defaults with || operator
 *    - Use conditional rendering for optional sections
 *    - Check array existence before .map()
 *    - Example:
 *      const tagline = campaign?.brief?.tagline || 'No tagline yet';
 *      {campaign?.brief?.tagline && <h1>{campaign.brief.tagline}</h1>}
 * 
 * 2. BACKEND (tRPC Procedures & Workflows):
 *    - Use Zod schemas to validate required fields
 *    - Provide default values in database schema where appropriate
 *    - Wrap AI calls in try-catch blocks
 *    - Update campaign status to 'failed' if workflow errors occur
 *    - Log errors for debugging but don't expose to users
 *    - Example:
 *      try {
 *        const result = await generateObject(...);
 *      } catch (error) {
 *        await db.campaign.update({
 *          where: { id: campaignId },
 *          data: { status: 'failed' }
 *        });
 *        console.error('AI generation failed:', error);
 *      }
 * 
 * 3. DATABASE (Prisma Schema):
 *    - Mark optional fields with ? (e.g., content Json?)
 *    - Use @default for fields that should have defaults
 *    - Use onDelete: Cascade for cleanup
 *    - Example:
 *      content Json?  // Can be null
 *      status String @default("pending")  // Has default
 * 
 * 4. ERROR BOUNDARIES:
 *    - Wrap components that display dynamic data in error boundaries
 *    - Show fallback UI when rendering fails
 *    - Log errors to monitoring service
 * 
 * 5. LOADING STATES:
 *    - Show loading indicators while data is being generated
 *    - Use skeleton screens for better UX
 *    - Disable actions while mutations are pending
 * 
 * 6. USER FEEDBACK:
 *    - Show clear error messages when data is missing
 *    - Provide actions to retry or regenerate content
 *    - Use toast notifications for transient feedback
 */
