// Hook to persist "Copy Prompt" action state in localStorage
// When user copies a prompt and leaves, show "Paste Response" on return

const COPY_PROMPT_KEY = 'twofold_copy_prompt_pending';

interface CopyPromptState {
  timestamp: number;
  filters: string[];
  servings: number;
}

export const setCopyPromptPending = (filters: string[], servings: number): void => {
  const state: CopyPromptState = {
    timestamp: Date.now(),
    filters,
    servings,
  };
  localStorage.setItem(COPY_PROMPT_KEY, JSON.stringify(state));
};

export const getCopyPromptPending = (): CopyPromptState | null => {
  try {
    const stored = localStorage.getItem(COPY_PROMPT_KEY);
    if (!stored) return null;
    
    const state: CopyPromptState = JSON.parse(stored);
    
    // Expire after 4 hours
    const fourHoursMs = 4 * 60 * 60 * 1000;
    if (Date.now() - state.timestamp > fourHoursMs) {
      clearCopyPromptPending();
      return null;
    }
    
    return state;
  } catch {
    return null;
  }
};

export const clearCopyPromptPending = (): void => {
  localStorage.removeItem(COPY_PROMPT_KEY);
};
