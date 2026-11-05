// Edge function to scrape recipes from URLs using Gemini AI
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper to parse "20 minutes" or "1 hour" into minutes
const parseTimeToMinutes = (timeStr: string | number | undefined): number => {
  if (!timeStr) return 0;
  if (typeof timeStr === 'number') return timeStr;

  const str = timeStr.toLowerCase();
  const hourMatch = str.match(/(\d+)\s*hour/);
  const minMatch = str.match(/(\d+)\s*min/);

  let total = 0;
  if (hourMatch) total += parseInt(hourMatch[1]) * 60;
  if (minMatch) total += parseInt(minMatch[1]);

  // If no match, try parsing as plain number
  if (total === 0) {
    const num = parseInt(str);
    if (!isNaN(num)) total = num;
  }

  return total;
};

// Helper to parse "2 cups" or "1/2 teaspoon" into { qty, unit }
const parseQuantity = (quantityStr: string | number | undefined): { qty: number; unit: string } => {
  if (!quantityStr) return { qty: 1, unit: '' };
  if (typeof quantityStr === 'number') return { qty: quantityStr, unit: '' };

  const str = quantityStr.trim();

  // Handle fractions like "1/2", "3/4"
  const fractionMatch = str.match(/^(\d+)?[\/]?(\d+)?[\/](\d+)\s*(.*)$/);
  if (fractionMatch) {
    const whole = fractionMatch[1] ? parseInt(fractionMatch[1]) : 0;
    const numer = parseInt(fractionMatch[2] || fractionMatch[1] || '1');
    const denom = parseInt(fractionMatch[3]);
    const unit = fractionMatch[4] || '';
    return { qty: whole + (numer / denom), unit: unit.trim() };
  }

  // Handle "2 cups", "1 tablespoon", etc.
  const match = str.match(/^([\d.\/\s-]+)\s*(.*)$/);
  if (match) {
    let numStr = match[1].trim();
    let unit = match[2].trim();

    // Handle ranges like "3-4" - take the first number
    if (numStr.includes('-')) {
      numStr = numStr.split('-')[0].trim();
    }

    // Handle simple fractions
    if (numStr.includes('/')) {
      const [n, d] = numStr.split('/').map(s => parseFloat(s.trim()));
      return { qty: n / d, unit };
    }

    const qty = parseFloat(numStr) || 1;
    return { qty, unit };
  }

  return { qty: 1, unit: str };
};

// Parse servings like "6-8" or "4 servings" into a number
const parseServings = (servingsStr: string | number | undefined): number => {
  if (!servingsStr) return 4;
  if (typeof servingsStr === 'number') return servingsStr;

  const str = servingsStr.toString();
  // Handle ranges - take the first number
  const match = str.match(/(\d+)/);
  return match ? parseInt(match[1]) : 4;
};

// Gemini sometimes answers 503 ("model is experiencing high demand"), 429 or 500
// during traffic spikes. Retry twice with a short backoff so a passing spike
// doesn't reach the user.
async function fetchGemini(url: string, init: RequestInit, retries = 2): Promise<Response> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(url, init)
    if (attempt >= retries || ![429, 500, 503].includes(res.status)) return res
    await res.body?.cancel()
    console.warn(`Gemini returned ${res.status}, retrying (${attempt + 1}/${retries})`)
    await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1) + Math.random() * 500))
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { url } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')

    if (!apiKey) {
      throw new Error('GEMINI_API_KEY not configured');
    }

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

    // Fetch the raw HTML of the recipe page
    const siteResponse = await fetch(url)
    const html = await siteResponse.text()

    const systemPrompt = `
      Extract the recipe from this HTML. Return ONLY a valid JSON object with this structure:
      {
        "title": "Recipe Name",
        "description": "Brief description",
        "servings": 4,
        "prep_time": "15 minutes",
        "cook_time": "30 minutes",
        "ingredients": [
          { "item": "ingredient name", "quantity": "2 cups" }
        ],
        "instructions": ["Step 1...", "Step 2..."]
      }

      Important: Return ONLY the JSON, no markdown code blocks.

      HTML content: ${html.substring(0, 15000)}
    `

    const geminiRes = await fetchGemini(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    })

    const data = await geminiRes.json()

    // Check for Gemini API errors
    if (!geminiRes.ok || data.error) {
      throw new Error(data.error?.message || `Gemini API error: ${geminiRes.status}`);
    }

    // Validate response structure
    if (!data.candidates || !data.candidates[0]?.content?.parts?.[0]?.text) {
      console.error('Unexpected Gemini response:', JSON.stringify(data));
      throw new Error('No valid response from AI. The recipe page may be blocked or inaccessible.');
    }

    const rawText = data.candidates[0].content.parts[0].text;
    const cleanedText = rawText.replace(/```json|```/g, '').trim();

    if (!cleanedText) {
      throw new Error('AI returned empty response');
    }

    let recipe;
    try {
      recipe = JSON.parse(cleanedText);
    } catch (parseErr) {
      console.error('Failed to parse AI response:', cleanedText.substring(0, 500));
      throw new Error('AI response was not valid JSON');
    }

    // Normalize to the exact StagedRecipe format the frontend expects
    const normalized = {
      title: recipe.title || recipe.name || 'Scraped Recipe',
      description: recipe.description || '',
      servings: parseServings(recipe.servings),
      ingredients: (recipe.ingredients || []).map((ing: any) => {
        // Handle various AI output formats
        const parsed = parseQuantity(ing.quantity || ing.qty);
        return {
          item: ing.item || ing.name || ing.ingredient || '',
          qty: ing.qty ?? parsed.qty,
          unit: ing.unit || parsed.unit || '',
          notes: ing.notes || ''
        };
      }),
      instructions: (recipe.instructions || recipe.steps || []).map((inst: any) =>
        typeof inst === 'string' ? inst : inst.step || inst.instruction || String(inst)
      ),
      metrics: {
        prep_time: parseTimeToMinutes(recipe.prep_time || recipe.prepTime || recipe.metrics?.prep_time),
        cook_time: parseTimeToMinutes(recipe.cook_time || recipe.cookTime || recipe.metrics?.cook_time)
      }
    };

    return new Response(JSON.stringify(normalized), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: corsHeaders })
  }
})
