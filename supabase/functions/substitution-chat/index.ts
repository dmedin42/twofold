import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

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
    const { message, recipeContext } = await req.json()
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`

    // 1. SAFE DATA PARSING (Prevents crashes if data is missing or wrong format)
    const recipeName = recipeContext?.name || recipeContext?.title || "Current Recipe";

    // Handle instructions whether they are an Array OR a String
    let instructionsText = "";
    if (Array.isArray(recipeContext?.instructions)) {
        instructionsText = recipeContext.instructions.join(" | ");
    } else if (typeof recipeContext?.instructions === 'string') {
        instructionsText = recipeContext.instructions;
    } else {
        instructionsText = "Standard cooking procedures";
    }

    const ingredientsText = JSON.stringify(recipeContext?.ingredients || []);

    const systemPrompt = `
      You are an expert AI Sous Chef. You are helping a user cook: "${recipeName}".

      RECIPE DATA:
      - Ingredients: ${ingredientsText}
      - Instructions: ${instructionsText.substring(0, 5000)}

      USER QUESTION: "${message}"

      YOUR RULES:
      1. If asking for a SUBSTITUTION: Suggest 2-3 alternatives that fit the flavor profile.
      2. If reporting a PROBLEM (e.g., "too salty"): Give a scientific, simple fix.
      3. If asking "WHAT'S NEXT?": Look at instructions and summarize the next step.
      4. Be CONCISE (under 50 words). Use bullet points.
      5. Tone: Helpful, encouraging, professional.
    `

    const response = await fetchGemini(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({ contents: [{ parts: [{ text: systemPrompt }] }] })
    })

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || 'Gemini API Error');
    }

    const data = await response.json()

    // 2. SAFE RESPONSE PARSING
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "I'm having trouble reading the recipe right now.";

    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error("Chef Chat Error:", message);
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: corsHeaders })
  }
})
