import { create } from "zustand";

type ContentState = {
  tagline: string;
  socialMediaPosts: {
    twitter: string;
    linkedin: string;
    instagram: string;
    facebook: string;
  };
  adCopy: {
    headline: string;
    bodyShort: string;
    bodyLong: string;
    cta: string;
  };
  emailSubjectLines: string[];
  timestamp: number;
};

type WorkspaceStore = {
  history: ContentState[];
  currentIndex: number;
  pushState: (content: Partial<ContentState>) => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  getCurrentState: () => ContentState;
  reset: () => void;
};

/**
 * WORKSPACE STORE - UNDO/REDO MANAGEMENT
 * 
 * This store manages the history of content edits in the workspace, enabling undo/redo functionality.
 * 
 * **How it works:**
 * 1. Each time content changes (edit or regenerate), pushState is called
 * 2. The new state is added to the history array
 * 3. Any "future" states (if user had undone) are discarded
 * 4. Users can undo/redo through the history
 * 
 * **State structure:**
 * - history: Array of all content states
 * - currentIndex: Points to the current state in history
 * 
 * **Usage:**
 * - Call pushState() after any content change (edit, save, regenerate)
 * - Call undo() to go back one state
 * - Call redo() to go forward one state
 * - Call getCurrentState() to get the current content
 * - Call reset() when leaving the workspace
 */
export const useWorkspaceStore = create<WorkspaceStore>()((set, get) => ({
  history: [],
  currentIndex: -1,
  
  pushState: (content: Partial<ContentState>) => {
    const state = get();
    const currentState = state.history[state.currentIndex];
    
    // Merge with current state or create new state
    const newState: ContentState = {
      tagline: content.tagline ?? currentState?.tagline ?? "",
      socialMediaPosts: content.socialMediaPosts ?? currentState?.socialMediaPosts ?? {
        twitter: "",
        linkedin: "",
        instagram: "",
        facebook: "",
      },
      adCopy: content.adCopy ?? currentState?.adCopy ?? {
        headline: "",
        bodyShort: "",
        bodyLong: "",
        cta: "",
      },
      emailSubjectLines: content.emailSubjectLines ?? currentState?.emailSubjectLines ?? [],
      timestamp: Date.now(),
    };
    
    // Don't push duplicate states (compare content, not timestamp)
    if (currentState) {
      const isDuplicate = 
        currentState.tagline === newState.tagline &&
        JSON.stringify(currentState.socialMediaPosts) === JSON.stringify(newState.socialMediaPosts) &&
        JSON.stringify(currentState.adCopy) === JSON.stringify(newState.adCopy) &&
        JSON.stringify(currentState.emailSubjectLines) === JSON.stringify(newState.emailSubjectLines);
      
      if (isDuplicate) {
        console.log("Skipping duplicate state push");
        return;
      }
    }
    
    // Remove any future states if we're not at the end
    const newHistory = state.history.slice(0, state.currentIndex + 1);
    
    // Add new state
    newHistory.push(newState);
    
    // Limit history to last 50 states to prevent memory issues
    const trimmedHistory = newHistory.slice(-50);
    
    set({
      history: trimmedHistory,
      currentIndex: trimmedHistory.length - 1,
    });
    
    console.log(`Pushed new state. History length: ${trimmedHistory.length}`);
  },
  
  undo: () => {
    const state = get();
    if (state.currentIndex > 0) {
      set({ currentIndex: state.currentIndex - 1 });
    }
  },
  
  redo: () => {
    const state = get();
    if (state.currentIndex < state.history.length - 1) {
      set({ currentIndex: state.currentIndex + 1 });
    }
  },
  
  canUndo: () => {
    const state = get();
    return state.currentIndex > 0;
  },
  
  canRedo: () => {
    const state = get();
    return state.currentIndex < state.history.length - 1;
  },
  
  getCurrentState: () => {
    const state = get();
    if (state.currentIndex >= 0 && state.currentIndex < state.history.length) {
      return state.history[state.currentIndex];
    }
    // Return empty state if no history exists yet
    return {
      tagline: "",
      socialMediaPosts: {
        twitter: "",
        linkedin: "",
        instagram: "",
        facebook: "",
      },
      adCopy: {
        headline: "",
        bodyShort: "",
        bodyLong: "",
        cta: "",
      },
      emailSubjectLines: [],
      timestamp: Date.now(),
    };
  },
  
  reset: () => {
    set({ history: [], currentIndex: -1 });
  },
}));
