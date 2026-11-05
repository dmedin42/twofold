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
    const apiKey = Deno.env.get('rescue-recipe')
    if (!apiKey) throw new Error('rescue-recipe secret is not set')

    const { ingredients, filters, customNote, servings } = await req.json()

    if (!ingredients || ingredients.length === 0) {
      throw new Error("No ingredients provided")
    }

    // The custom note outranks every other rule in the prompt
    const systemPrompt = `
      You are the Twofolded Executive Chef AI.
      GOAL: Suggest ONE real, balanced, and nutritious recipe based on expiring items.

      CRITICAL PRIORITY:
      - The 'Custom Chef Note' is your #1 absolute priority. If the note says 'Make it spicy' or 'No ovens', you MUST follow that above all other rules.

      CULINARY GUARDRAILS:
      - PRIORITIZE FLAVOR COHESION: Do not mix clashing categories (e.g., No Chocolate with Pasta).
      - REALISM: Quality over quantity. If an expiring item ruins the dish, EXCLUDE it.

      INPUTS:
      - Expiring Items: ${ingredients.join(', ')}
      - Dietary Preferences: ${filters?.join(', ') || "None"}
      - CUSTOM NOTE (PRIORITY #1): ${customNote || 'None'}
      - Yield: ${servings || 4} servings

      OUTPUT FORMAT (STRICT JSON ONLY):
      {
        "name": "Dish Name",
        "description": "Short explanation of balance/nutrition.",
        "ingredients": [{ "item": "Name", "qty": number, "unit": "unit" }],
        "instructions": ["Step 1", "Step 2"],
        "metrics": { "prep_time": number, "cook_time": number, "calories_per_serving": number },
        "used_ingredients": ["List items used"]
      }
    `

    // Full Flash (not Flash-Lite) for better recipe reasoning
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`

    const response = await fetchGemini(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          response_mime_type: "application/json",
          temperature: 0.7
        }
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Gemini API Error')
    }

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    // Final Parse
    let recipeData = JSON.parse(rawText.replace(/```json|```/g, '').trim());

    return new Response(JSON.stringify(recipeData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error: any) {
    console.error("Rescue Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Return 200 so the UI can show the error without a hard crash
    })
  }
})
