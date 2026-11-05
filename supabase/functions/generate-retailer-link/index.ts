import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { items, retailer } = await req.json()

    // Clean queries: Remove quantities like "2 cans" or "1lb"
    const cleanItems = items.map((item: string) => {
      return item.replace(/^\d+\s*(lb|oz|g|kg|cup|tsp|tbsp|can|package|pkg|oz)?\s+/i, '').trim()
    })

    let url = ""
    if (retailer === 'instacart') {
      url = `https://www.instacart.com/store/s?k=${encodeURIComponent(cleanItems.join(", "))}`
    } else {
      url = `https://www.walmart.com/search?q=${encodeURIComponent(cleanItems.join(" "))}`
    }

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), { status: 400, headers: corsHeaders })
  }
})
