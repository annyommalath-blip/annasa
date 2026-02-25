import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const FB_GRAPH_URL = 'https://graph.facebook.com/v21.0';

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Get secrets
    const FB_TOKEN = Deno.env.get('FACEBOOK_PAGE_ACCESS_TOKEN');
    const FB_PAGE_ID = Deno.env.get('FACEBOOK_PAGE_ID');
    if (!FB_TOKEN) throw new Error('FACEBOOK_PAGE_ACCESS_TOKEN is not configured');
    if (!FB_PAGE_ID) throw new Error('FACEBOOK_PAGE_ID is not configured');

    // Get task
    const { task_id } = await req.json();
    if (!task_id) {
      return new Response(JSON.stringify({ error: 'task_id is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const caption = task.caption_master || task.description || task.title || '';
    const assetUrls: string[] = task.asset_urls || [];

    let fbResponse;
    let fbResult: any;

    if (assetUrls.length > 0) {
      // Post with photo (first URL as image)
      const imageUrl = assetUrls[0];
      const fbUrl = `${FB_GRAPH_URL}/${FB_PAGE_ID}/photos`;
      fbResponse = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: imageUrl,
          message: caption,
          access_token: FB_TOKEN,
        }),
      });
    } else {
      // Text-only post
      const fbUrl = `${FB_GRAPH_URL}/${FB_PAGE_ID}/feed`;
      fbResponse = await fetch(fbUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: caption,
          access_token: FB_TOKEN,
        }),
      });
    }

    fbResult = await fbResponse.json();

    if (!fbResponse.ok) {
      console.error('Facebook API error:', fbResult);

      // Update task to failed
      await supabase.from('tasks').update({
        status: 'failed',
        error_message: `Facebook API error: ${fbResult?.error?.message || 'Unknown error'}`,
      }).eq('id', task_id);

      // Log
      await supabase.from('automation_logs').insert({
        task_id,
        action: 'facebook_post_failed',
        source: 'facebook_graph_api',
        payload: { error: fbResult },
      });

      return new Response(JSON.stringify({
        success: false,
        error: fbResult?.error?.message || 'Facebook API call failed',
      }), {
        status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Success — update task
    await supabase.from('tasks').update({
      status: 'posted',
      posted_at: new Date().toISOString(),
      post_results: { facebook: fbResult },
    }).eq('id', task_id);

    // Log success
    await supabase.from('automation_logs').insert({
      task_id,
      action: 'facebook_post_success',
      source: 'facebook_graph_api',
      payload: { post_id: fbResult.id || fbResult.post_id, response: fbResult },
    });

    return new Response(JSON.stringify({
      success: true,
      post_id: fbResult.id || fbResult.post_id,
      message: 'Posted to Facebook successfully!',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in post-to-facebook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
