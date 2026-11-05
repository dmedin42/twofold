import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const apiKey = Deno.env.get('process-recipe')
    if (!apiKey) throw new Error('process-recipe is not set')

    // Parse Input: Expect Image Data
    const { image: rawImage, mimeType = 'image/jpeg' } = await req.json()

    if (!rawImage) throw new Error("No image provided. Please upload a photo of a recipe.")

    // Strip Data URL prefix if present (e.g., "data:image/jpeg;base64,")
    const image = rawImage.includes(',') ? rawImage.split(',')[1] : rawImage

    const systemPrompt = `
      You are a Recipe Digitizer AI.
      Analyze this image (handwritten card, cookbook page, or screenshot).
      Extract the recipe data into structured JSON.

      RULES:
      1. Return ONLY valid JSON. No markdown.
      2. For 'ingredients', you MUST estimate the average US retail price (in USD) for the specific quantity listed. Assign this to 'estimated_value'.
      3. If instructions are numbered, keep the order.
      4. If a field is missing, estimate it based on the cooking method.

      REQUIRED JSON STRUCTURE:
      {
        "title": "Recipe Title",
        "description": "Short appetizing summary",
        "servings": number,
        "ingredients": [
          { "item": "Name", "qty": number, "unit": "cup/oz/piece", "estimated_value": number }
        ],
        "instructions": ["Step 1", "Step 2"],
        "metrics": { "prep_time": number (minutes), "cook_time": number (minutes) }
      }
    `

    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`

    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: systemPrompt },
            {
              inline_data: {
                mime_type: mimeType,
                data: image
              }
            }
          ]
        }]
      })
    })

    if (!response.ok) {
      const err = await response.json()
      throw new Error(err.error?.message || 'Gemini Vision API Failed')
    }

    const data = await response.json()
    const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
    const cleanJson = rawText.replace(/```json|```/g, '').trim()

    // Verify JSON parses before returning
    JSON.parse(cleanJson);

    return new Response(cleanJson, {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err) {
    console.error("Vision Error:", err)
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: corsHeaders })
  }
})
