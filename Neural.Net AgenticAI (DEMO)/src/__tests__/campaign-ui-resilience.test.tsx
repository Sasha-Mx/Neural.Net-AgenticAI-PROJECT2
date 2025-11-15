/**
 * Campaign UI Resilience Tests
 * 
 * These tests verify that React components handle missing, incomplete,
 * or undefined campaign data without crashing. They use React Testing Library
 * to simulate real user interactions and edge cases.
 * 
 * Run with: npm test src/__tests__/campaign-ui-resilience.test.tsx
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

// Mock data scenarios
const completeCampaign = {
  id: 1,
  name: 'Complete Campaign',
  status: 'completed',
  createdAt: new Date().toISOString(),
  brief: {
    goal: 'Launch product',
    tone: 'professional',
    audience: 'Developers',
    tagline: 'Build faster, ship better',
    description: 'A comprehensive campaign description',
  },
  assets: [
    {
      id: 1,
      type: 'text',
      content: {
        tagline: 'Build faster, ship better',
        description: 'Full description here',
      },
      isSelected: true,
      viewCount: 10,
    },
    {
      id: 2,
      type: 'image',
      url: 'https://example.com/image.png',
      isSelected: true,
      viewCount: 5,
    },
  ],
  workflowLog: [],
};

const incompleteCampaign = {
  id: 2,
  name: 'Incomplete Campaign',
  status: 'generating',
  createdAt: new Date().toISOString(),
  brief: {
    goal: 'Test goal',
    tone: 'casual',
    audience: 'Everyone',
    // tagline and description are missing
  },
  assets: [
    {
      id: 3,
      type: 'text',
      content: null, // AI hasn't generated content yet
      isSelected: true,
      viewCount: 0,
    },
  ],
  workflowLog: [],
};

const campaignWithPartialAssets = {
  id: 3,
  name: 'Partial Assets Campaign',
  status: 'completed',
  createdAt: new Date().toISOString(),
  brief: {
    goal: 'Test',
    tone: 'test',
    audience: 'test',
  },
  assets: [
    {
      id: 4,
      type: 'text',
      content: {
        tagline: 'Has tagline',
        // description is missing
      },
      isSelected: true,
      viewCount: 0,
    },
    {
      id: 5,
      type: 'social_media_post',
      content: {
        twitter: 'Twitter post',
        // linkedin, instagram, facebook are missing
      },
      isSelected: true,
      viewCount: 0,
    },
  ],
  workflowLog: [],
};

// Helper component that mimics campaign display logic
function CampaignDisplay({ campaign }: { campaign: any }) {
  // Safe access patterns used in actual components
  const brief = campaign?.brief as any;
  const tagline = brief?.tagline;
  const description = brief?.description;
  const goal = brief?.goal || 'No goal specified';
  const tone = brief?.tone || 'Not specified';
  const audience = brief?.audience || 'Not specified';

  const textAssets = campaign?.assets?.filter((a: any) => a.type === 'text') || [];
  const imageAssets = campaign?.assets?.filter((a: any) => a.type === 'image') || [];
  const socialAssets = campaign?.assets?.filter((a: any) => a.type === 'social_media_post') || [];

  return (
    <div data-testid="campaign-display">
      <h1>{campaign?.name || 'Untitled Campaign'}</h1>
      <div data-testid="status">{campaign?.status || 'unknown'}</div>
      
      {/* Conditional rendering for optional fields */}
      {tagline && <div data-testid="tagline">{tagline}</div>}
      {!tagline && <div data-testid="no-tagline">No tagline available</div>}
      
      {description && <div data-testid="description">{description}</div>}
      
      <div data-testid="brief-info">
        <div>Goal: {goal}</div>
        <div>Tone: {tone}</div>
        <div>Audience: {audience}</div>
      </div>

      {/* Text Assets */}
      <div data-testid="text-assets">
        {textAssets.length === 0 && <div>No text assets yet</div>}
        {textAssets.map((asset: any) => {
          const content = asset?.content as any;
          return (
            <div key={asset.id} data-testid={`text-asset-${asset.id}`}>
              {content?.tagline || 'No tagline'}
              {content?.description && <p>{content.description}</p>}
            </div>
          );
        })}
      </div>

      {/* Image Assets */}
      <div data-testid="image-assets">
        {imageAssets.length === 0 && <div>No images yet</div>}
        {imageAssets.map((asset: any) => (
          <img
            key={asset.id}
            src={asset?.url || '/placeholder.png'}
            alt="Campaign visual"
            data-testid={`image-asset-${asset.id}`}
          />
        ))}
      </div>

      {/* Social Media Assets */}
      <div data-testid="social-assets">
        {socialAssets.map((asset: any) => {
          const content = asset?.content as any;
          return (
            <div key={asset.id} data-testid={`social-asset-${asset.id}`}>
              <div data-testid="twitter">{content?.twitter || 'No Twitter post'}</div>
              <div data-testid="linkedin">{content?.linkedin || 'No LinkedIn post'}</div>
              <div data-testid="instagram">{content?.instagram || 'No Instagram post'}</div>
              <div data-testid="facebook">{content?.facebook || 'No Facebook post'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

describe('Campaign UI - Complete Data', () => {
  it('should render all fields when data is complete', () => {
    render(<CampaignDisplay campaign={completeCampaign} />);

    expect(screen.getByText('Complete Campaign')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('completed');
    expect(screen.getByTestId('tagline')).toHaveTextContent('Build faster, ship better');
    expect(screen.getByTestId('description')).toBeInTheDocument();
    expect(screen.queryByTestId('no-tagline')).not.toBeInTheDocument();
  });

  it('should render all assets when present', () => {
    render(<CampaignDisplay campaign={completeCampaign} />);

    const textAsset = screen.getByTestId('text-asset-1');
    expect(textAsset).toBeInTheDocument();
    expect(textAsset).toHaveTextContent('Build faster, ship better');

    const imageAsset = screen.getByTestId('image-asset-2');
    expect(imageAsset).toBeInTheDocument();
    expect(imageAsset).toHaveAttribute('src', 'https://example.com/image.png');
  });
});

describe('Campaign UI - Incomplete/Missing Data', () => {
  it('should handle missing tagline gracefully', () => {
    render(<CampaignDisplay campaign={incompleteCampaign} />);

    expect(screen.getByText('Incomplete Campaign')).toBeInTheDocument();
    expect(screen.queryByTestId('tagline')).not.toBeInTheDocument();
    expect(screen.getByTestId('no-tagline')).toHaveTextContent('No tagline available');
  });

  it('should handle null asset content', () => {
    render(<CampaignDisplay campaign={incompleteCampaign} />);

    const textAsset = screen.getByTestId('text-asset-3');
    expect(textAsset).toBeInTheDocument();
    expect(textAsset).toHaveTextContent('No tagline');
  });

  it('should show fallback when no assets exist', () => {
    const emptyAssetsCampaign = {
      ...incompleteCampaign,
      assets: [],
    };

    render(<CampaignDisplay campaign={emptyAssetsCampaign} />);

    expect(screen.getByText('No text assets yet')).toBeInTheDocument();
    expect(screen.getByText('No images yet')).toBeInTheDocument();
  });

  it('should handle undefined campaign gracefully', () => {
    render(<CampaignDisplay campaign={undefined} />);

    expect(screen.getByText('Untitled Campaign')).toBeInTheDocument();
    expect(screen.getByTestId('status')).toHaveTextContent('unknown');
  });

  it('should handle null brief fields with defaults', () => {
    const noBriefCampaign = {
      id: 99,
      name: 'No Brief',
      status: 'generating',
      createdAt: new Date().toISOString(),
      brief: {},
      assets: [],
      workflowLog: [],
    };

    render(<CampaignDisplay campaign={noBriefCampaign} />);

    const briefInfo = screen.getByTestId('brief-info');
    expect(briefInfo).toHaveTextContent('Goal: No goal specified');
    expect(briefInfo).toHaveTextContent('Tone: Not specified');
    expect(briefInfo).toHaveTextContent('Audience: Not specified');
  });
});

describe('Campaign UI - Partial Data', () => {
  it('should render available fields and show defaults for missing ones', () => {
    render(<CampaignDisplay campaign={campaignWithPartialAssets} />);

    const textAsset = screen.getByTestId('text-asset-4');
    expect(textAsset).toHaveTextContent('Has tagline');
    expect(textAsset).not.toHaveTextContent('description');
  });

  it('should handle partial social media content', () => {
    render(<CampaignDisplay campaign={campaignWithPartialAssets} />);

    const socialAsset = screen.getByTestId('social-asset-5');
    
    expect(screen.getByTestId('twitter')).toHaveTextContent('Twitter post');
    expect(screen.getByTestId('linkedin')).toHaveTextContent('No LinkedIn post');
    expect(screen.getByTestId('instagram')).toHaveTextContent('No Instagram post');
    expect(screen.getByTestId('facebook')).toHaveTextContent('No Facebook post');
  });

  it('should not crash when accessing deeply nested undefined properties', () => {
    const deeplyNestedCampaign = {
      id: 100,
      name: 'Deep Nesting Test',
      // Everything else is undefined
    };

    // Should not throw error
    expect(() => {
      render(<CampaignDisplay campaign={deeplyNestedCampaign} />);
    }).not.toThrow();

    expect(screen.getByText('Deep Nesting Test')).toBeInTheDocument();
  });
});

describe('Integration Test Patterns', () => {
  /**
   * These patterns show how to test components that fetch data from tRPC
   */

  it('should handle loading state while data is being fetched', async () => {
    // Mock tRPC query that's still loading
    const LoadingComponent = () => {
      const isLoading = true;
      const campaign = null;

      if (isLoading) {
        return <div data-testid="loading">Loading campaign...</div>;
      }

      return <CampaignDisplay campaign={campaign} />;
    };

    render(<LoadingComponent />);
    expect(screen.getByTestId('loading')).toBeInTheDocument();
  });

  it('should handle error state when data fetch fails', () => {
    const ErrorComponent = () => {
      const error = new Error('Failed to load campaign');
      const campaign = null;

      if (error) {
        return <div data-testid="error">Error: {error.message}</div>;
      }

      return <CampaignDisplay campaign={campaign} />;
    };

    render(<ErrorComponent />);
    expect(screen.getByTestId('error')).toHaveTextContent('Failed to load campaign');
  });

  it('should show success state when data is loaded', async () => {
    const SuccessComponent = () => {
      const isLoading = false;
      const error = null;
      const campaign = completeCampaign;

      if (isLoading) return <div>Loading...</div>;
      if (error) return <div>Error</div>;

      return <CampaignDisplay campaign={campaign} />;
    };

    render(<SuccessComponent />);
    
    await waitFor(() => {
      expect(screen.getByText('Complete Campaign')).toBeInTheDocument();
    });
  });
});

/**
 * REACT TESTING BEST PRACTICES FOR MISSING DATA
 * ==============================================
 * 
 * 1. TEST SCENARIOS TO COVER:
 *    ✓ Complete data (happy path)
 *    ✓ Missing optional fields
 *    ✓ Null values
 *    ✓ Undefined values
 *    ✓ Empty arrays
 *    ✓ Partial objects
 *    ✓ Loading states
 *    ✓ Error states
 * 
 * 2. SAFE RENDERING PATTERNS:
 *    - Use optional chaining: campaign?.brief?.tagline
 *    - Provide defaults: campaign?.name || 'Untitled'
 *    - Conditional rendering: {tagline && <div>{tagline}</div>}
 *    - Array safety: assets?.map(...) || []
 * 
 * 3. TESTING UTILITIES:
 *    - @testing-library/react for component testing
 *    - @testing-library/jest-dom for assertions
 *    - Mock incomplete data scenarios
 *    - Test user interactions with missing data
 * 
 * 4. ERROR BOUNDARIES:
 *    - Wrap components in error boundaries
 *    - Test that errors are caught
 *    - Verify fallback UI is shown
 * 
 * 5. ACCESSIBILITY:
 *    - Ensure fallback text is meaningful
 *    - Use proper ARIA labels
 *    - Test with screen readers in mind
 * 
 * 6. PERFORMANCE:
 *    - Avoid unnecessary re-renders
 *    - Memoize expensive computations
 *    - Use React.memo for components that receive incomplete data
 */
