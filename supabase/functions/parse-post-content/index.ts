import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { description, title } = await req.json();

    if (!description && !title) {
      return new Response(JSON.stringify({ error: 'No content to parse' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    const content = `Title: ${title || ''}\n\nDescription:\n${description || ''}`;

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a social media content parser. Given a task title and description, extract:
1. "caption" - The social media caption/post text. Clean it up for social media posting. If there are hashtags, keep them. Remove any URLs or link references from the caption.
2. "links" - An array of URLs found in the text (Google Drive links, image URLs, video URLs, any media links). Return empty array if none found.
3. "platforms" - An array of platform names mentioned (valid values: "instagram", "tiktok", "facebook"). Return empty array if none mentioned.

Respond ONLY with valid JSON in this exact format:
{"caption": "...", "links": ["..."], "platforms": ["..."]}`
          },
          {
            role: 'user',
            content,
          },
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`AI gateway error [${response.status}]: ${errBody}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content || '{}';
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, raw];
    const parsed = JSON.parse(jsonMatch[1].trim());

    return new Response(JSON.stringify({
      caption: parsed.caption || '',
      links: parsed.links || [],
      platforms: parsed.platforms || [],
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error parsing content:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
