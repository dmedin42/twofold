import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Find items expiring within 24 hours across all households
    const tomorrow = new Date()
    tomorrow.setHours(tomorrow.getHours() + 24)

    const { data: expiringItems, error } = await supabase
      .from('inventory_items')
      .select('id, name, category, expiry_date, household_id, quantity')
      .gt('quantity', 0)
      .lte('expiry_date', tomorrow.toISOString())
      .gte('expiry_date', new Date().toISOString())
      .limit(50)

    if (error) throw error

    if (!expiringItems || expiringItems.length === 0) {
      return new Response(JSON.stringify({ nudges: [], message: 'No expiring items found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Group by household
    const byHousehold: Record<string, string[]> = {}
    expiringItems.forEach((item: any) => {
      if (!byHousehold[item.household_id]) byHousehold[item.household_id] = []
      byHousehold[item.household_id].push(item.name)
    })

    // Generate nudge payloads
    const nudges = Object.entries(byHousehold).map(([householdId, items]) => {
      const topItem = items[0]
      const templates = [
        `Your ${topItem} is looking sad—let's make a smoothie? 🥤`,
        `${topItem} expires soon! Time to get creative in the kitchen 👨‍🍳`,
        `Don't let ${topItem} go to waste! Quick recipe idea: ${topItem} stir-fry 🍳`,
        `${items.length} item${items.length > 1 ? 's' : ''} expiring today. Rescue mission time! 🦸`,
      ]
      const message = templates[Math.floor(Math.random() * templates.length)]

      return {
        household_id: householdId,
        items,
        message,
        created_at: new Date().toISOString(),
      }
    })

    console.log(`Generated ${nudges.length} nudges for ${expiringItems.length} expiring items`)

    return new Response(JSON.stringify({ nudges, count: nudges.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('Expiry nudge error:', message)
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
