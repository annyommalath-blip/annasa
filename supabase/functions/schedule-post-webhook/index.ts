import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
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
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub;

    // Get the task ID from request
    const { task_id } = await req.json();
    if (!task_id) {
      return new Response(JSON.stringify({ error: 'task_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch the task with all its details
    const { data: task, error: taskError } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', task_id)
      .single();

    if (taskError || !task) {
      return new Response(JSON.stringify({ error: 'Task not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get the n8n webhook URL
    const webhookUrl = Deno.env.get('N8N_WEBHOOK_URL');
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL is not configured');
    }

    // Prepare the payload for n8n
    const payload = {
      task_id: task.id,
      title: task.title,
      caption: task.caption_master || task.description || '',
      platforms: task.platforms || [],
      scheduled_at: task.scheduled_at,
      asset_urls: task.asset_urls || [],
      status: task.status,
      priority: task.priority,
      project_id: task.project_id,
      owner_id: task.owner_id,
      triggered_by: userId,
      triggered_at: new Date().toISOString(),
    };

    // Send to n8n
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!n8nResponse.ok) {
      const errText = await n8nResponse.text();
      console.error('n8n webhook failed:', n8nResponse.status, errText);

      // Update task status to failed
      await supabase
        .from('tasks')
        .update({
          status: 'failed',
          error_message: `n8n webhook failed: ${n8nResponse.status}`,
        })
        .eq('id', task_id);

      // Log the automation attempt
      await supabase.from('automation_logs').insert({
        task_id,
        action: 'webhook_send_failed',
        source: 'n8n',
        payload: { status: n8nResponse.status, error: errText },
      });

      return new Response(JSON.stringify({
        success: false,
        error: `Webhook failed with status ${n8nResponse.status}`,
      }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let n8nResult = {};
    try {
      n8nResult = await n8nResponse.json();
    } catch {
      await n8nResponse.text(); // consume body
    }

    // Log successful automation
    await supabase.from('automation_logs').insert({
      task_id,
      action: 'webhook_sent',
      source: 'n8n',
      payload: { response: n8nResult },
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Post data sent to n8n successfully',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in schedule-post-webhook:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
