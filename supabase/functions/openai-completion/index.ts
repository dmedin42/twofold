// Recipe extraction and potluck suggestions (Gemini).
// The function keeps its original name so existing clients keep working.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

console.log("🟢 SYSTEM ONLINE: Kitchen Agent v8.0 (Potluck Edition)");

serve(async (req) => {
  // 1. CORS Handshake
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { imageBase64, url, taskType, potluckTitle, potluckDescription, currentItems } = await req.json()
    console.log(`📥 RECEIVED TASK: ${taskType || "Default (Recipe)"}`);

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error("Missing GEMINI_API_KEY")

    // 2. Select the Right Brain for the Job
    let systemInstruction = "";
    let inputPart;

    if (taskType === 'potluck_suggestions') {
      // Logic for Potluck dish suggestions
      console.log("🍽️ MODE: Potluck Suggestions");

      const existingItems = currentItems?.length > 0
        ? `Current items already on the list: ${currentItems.join(', ')}. DO NOT suggest duplicates.`
        : 'No items added yet.';

      systemInstruction = `You are a helpful potluck planning assistant. Given a potluck event, suggest dishes that guests could bring.

Event: "${potluckTitle || 'Potluck'}"
${potluckDescription ? `Description: ${potluckDescription}` : ''}
${existingItems}

Suggest 8-10 items across these categories:
- 2-3 Main Dishes (proteins, casseroles, etc.)
- 2-3 Side Dishes (salads, vegetables, etc.)
- 1-2 Appetizers
- 1-2 Desserts
- 1-2 Drinks or Utensils/Supplies

Return ONLY valid JSON in this exact format:
{
  "suggestions": [
    { "name": "Item Name", "category": "Main Dish", "notes": "Brief description" }
  ]
}

Make suggestions diverse, crowd-pleasing, and easy to transport. Consider the event theme if provided.
Return ONLY valid JSON. No markdown code blocks.`;

      inputPart = { text: "Generate potluck dish suggestions based on the event details above." };

    } else {
      // Logic for ScanRecipeDialog.tsx (Recipes)
      console.log("📖 MODE: Recipe Extraction");
      systemInstruction = `Extract this recipe into JSON.
      IMPORTANT: Use the key "name" for the title.
      Format: { "name": "Recipe Title", "ingredients": [{"item": "name", "qty": 1, "unit": "cup"}], "instructions": ["Step 1"], "prep_time": "10 mins", "servings": 4 }.
      Return ONLY valid JSON. No markdown.`;

      if (url) {
        inputPart = { text: `Analyze this URL: ${url}` };
      } else if (imageBase64) {
        const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64;
        inputPart = { inline_data: { mime_type: "image/jpeg", data: cleanBase64 } };
      } else {
        throw new Error("No payload provided");
      }
    }

    // 4. Call Gemini 2.5 Flash-Lite
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: systemInstruction },
              inputPart
            ]
          }]
        })
      }
    )

    const data = await response.json()

    // Error Handling
    if (data.error) throw new Error(`Gemini API: ${data.error.message}`);
    if (!data.candidates?.[0]?.content) throw new Error("Gemini returned empty response");

    // 5. Parse and Wrap (The Fix)
    let aiText = data.candidates[0].content.parts[0].text.replace(/```json|```/g, "").trim();
    let parsedData;

    try {
      parsedData = JSON.parse(aiText);
    } catch (e) {
      console.error("JSON Parse Failed, attempting manual fix");
      // Fallback if AI messes up JSON syntax
      if (taskType === 'potluck_suggestions') {
        parsedData = { suggestions: [] };
      } else {
        parsedData = { name: "Scanned Recipe", raw_text: aiText };
      }
    }

    // *** THE GOLDEN WRAPPER ***
    // This matches: if (!data?.success || !data?.data)
    const finalResponse = {
      success: true,
      data: parsedData
    };

    console.log("✅ SUCCESS: Sending formatted response");

    return new Response(JSON.stringify(finalResponse), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error: any) {
    console.error("❌ CRASH:", error.message);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 // Return 200 so the frontend parses the "success: false" safely
    })
  }
})
