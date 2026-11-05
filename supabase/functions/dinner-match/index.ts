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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const sbUrl = Deno.env.get('SUPABASE_URL');
    const sbKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const apiKey = Deno.env.get('dinner-match');

    if (!apiKey) throw new Error('dinner-match secret is not set');

    // 1. CIRCUIT BREAKER CHECK
    if (sbUrl && sbKey) {
      try {
        const settingsResponse = await fetch(`${sbUrl}/rest/v1/system_settings?key=eq.is_ai_enabled&select=value_bool`, {
          headers: { 'apikey': sbKey, 'Authorization': `Bearer ${sbKey}` }
        });
        const settings = await settingsResponse.json();
        if (settings?.[0]?.value_bool === false) {
          return new Response(JSON.stringify({ error: 'The Chef is currently cleaning the kitchen. AI is temporarily offline.' }), {
            status: 503,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } catch (err) {
        console.warn("Circuit breaker check failed, proceeding anyway:", err);
      }
    }

    // 2. PARSE REQUEST
    const { ingredients, customNote, servings, tone, taskType } = await req.json();

    if (!ingredients || ingredients.length === 0) {
      throw new Error("No ingredients provided");
    }

    const toneMap: Record<string, string> = {
      encouraging: "Be warm, supportive, and enthusiastic.",
      efficient: "Be brief, direct, and focused on speed.",
      sassy: "Be playful, witty, and a little cheeky.",
    };
    const toneInstruction = toneMap[(tone || '').toLowerCase()] || toneMap.encouraging;

    // 3. CONSTRUCT SYSTEM PROMPT
    const availableItems = ingredients.join(', ');

    // Logic for Task Type
    const isBriefing = taskType === 'daily_briefing';

    const systemPrompt = `
      You are a Zero-Waste Chef AI.
      ${toneInstruction}

      GOAL: ${isBriefing
        ? "Suggest ONE Realistic, balanced, and nutritious meal-STRICTLY avoid clashing flavors (e.g., no dessert ingredients in savory dishes). Focus on standard culinary pairings, (1-2 sentences) based on expiring items."
        : "Suggest exactly 3 DIFFERENT quick meal ideas using available items."}

      INPUTS:
      - Available Items: ${availableItems}
      - Notes: ${customNote || 'None'}
      - Servings: ${servings || 4}

      STRICT OUTPUT RULES:
      1. Return ONLY valid JSON.
      2. No greetings, no markdown blocks, no conversational text.
      3. Use this structure: ${isBriefing
        ? '{"name": "Recipe Name", "description": "Briefing text"}'
        : '[{"name": "Meal 1", "description": "Text", "prep_time": 20}, ...]'
      }
    `;

    // 4. CALL GEMINI WITH JSON CONSTRAINT
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent`;

    const response = await fetchGemini(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ parts: [{ text: systemPrompt }] }],
        generationConfig: {
          // This forces Gemini to output in JSON format
          response_mime_type: "application/json",
          temperature: 0.7,
        }
      })
    });

    if (!response.ok) {
      const errData = await response.json();
      throw new Error(errData.error?.message || 'Gemini API connection failed');
    }

    const data = await response.json();
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // 5. ROBUST JSON EXTRACTION
    // Even with response_mime_type, we add a regex safety net to strip potential fluff
    const jsonMatch = rawText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    const cleanJson = jsonMatch ? jsonMatch[0] : rawText;

    let parsed;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.error("Critical JSON Parse Fail. Content received:", rawText);
      throw new Error("The Chef's handwriting is messy. Please try generating again.");
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'A kitchen error occurred';
    console.error("Edge Function Error:", message);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
