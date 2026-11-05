/**
 * Universal Bridge Prompt for Image-to-Recipe conversion
 */
export const IMAGE_TO_RECIPE_PROMPT = `Analyze the attached recipe image (handwritten or printed). Transcribe all details into a clean, structured format for my kitchen manager app.

Instructions:
1. Identify the title, ingredients, and instructions exactly as written.
2. Standardize ingredient names (e.g., use 'Black Pepper' instead of 'Pepper to taste') to allow for pantry matching.
3. Return ONLY the formatted data below. Do not include introductory text or explanations.

Format your response exactly like this:
{
  "title": "Recipe Name",
  "servings": 4,
  "ingredients": [{"item": "ingredient name", "qty": 1, "unit": "cup"}],
  "instructions": ["Step 1", "Step 2"],
  "metrics": {"prep_time": 10, "cook_time": 20, "protein": "chicken"},
  "tags": ["Healthy", "Quick"]
}`;

/**
 * Copy image-to-recipe prompt to clipboard
 */
export async function copyImagePromptToClipboard(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(IMAGE_TO_RECIPE_PROMPT);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}
