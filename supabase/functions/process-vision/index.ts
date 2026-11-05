// USE NATIVE SERVE (No imports needed for Deno 1.25+)
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    console.log("--> SCAN REQUEST RECEIVED");

    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("JSON Parse Error:", e);
      throw new Error("Invalid JSON payload.")
    }

    const { image, imageBase64, household_id } = body;
    const inputImage = image || imageBase64;
    if (!inputImage) throw new Error("No image data received");

    // Items are only returned to the caller, never written here; the client saves them
    // to its own household under row-level security.
    const activeHouseholdId = household_id ?? null;

    const pureBase64 = inputImage.includes(',') ? inputImage.split(',')[1] : inputImage;
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: `You are the Twofolded Vision Engine.
              TASK: Analyze the image (Receipt OR Food Photo) and extract items.

              STANDARDIZATION RULES:
              1. Normalize names (e.g., 'STK ORG SPN' or a photo of spinach both become 'Spinach').
              2. Categorize strictly: 'Produce', 'Protein', 'Dairy', 'Pantry', 'Baking', 'Frozen', 'Household'.
              3. Estimate 'shelf_life_days' based on standard food safety (e.g., Spinach = 5-7, Chicken = 3, Flour = 180).
              4. If it is a receipt, ignore tax, total, and non-food items like 'BAG FEE', 'DETERGENT', 'TOILET PAPER'.

              OUTPUT FORMAT (STRICT JSON ARRAY):
              [{"name": "Item Name", "qty": 1, "unit": "pc/lb/oz/ct", "category": "Produce", "shelf_life_days": 7}]`
            },
            { inline_data: { mime_type: "image/jpeg", data: pureBase64 } }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Gemini API Error: ${err}`);
    }

    const data = await response.json();
    let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!aiText) throw new Error("No items detected in scan");

    aiText = aiText.replace(/```json|```/g, "").trim();
    let parsedItems;

    try {
      parsedItems = JSON.parse(aiText);
    } catch (e) {
      console.error("AI JSON Parse Error:", aiText);
      throw new Error("AI output was not valid JSON");
    }

    // MAP: Ensure every item has the required ID for the database
    const sanitizedItems = parsedItems.map((item: any) => ({
      name: item.name || "Unknown Item",
      qty: Number(item.qty) || 1,
      unit: item.unit || "unit",
      category: item.category || "Pantry",
      shelf_life_days: Number(item.shelf_life_days) || 7,
      household_id: activeHouseholdId,
      added_at: new Date().toISOString()
    }));

    return new Response(JSON.stringify({ items: sanitizedItems }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error("Fatal Error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    })
  }
})
