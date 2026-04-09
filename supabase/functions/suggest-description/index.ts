import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { description, context } = await req.json();
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");

  if (!apiKey) {
    return new Response(JSON.stringify({ suggestion: null, error: "API key not configured" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 100,
      messages: [{ role: "user", content: `Melhore esta descrição de lançamento financeiro para ser clara e profissional em português brasileiro. Retorne APENAS a descrição melhorada, sem explicações. Descrição: "${description}". Contexto: ${context || "lançamento financeiro"}` }]
    })
  });

  const data = await response.json();
  const suggestion = data.content?.[0]?.text?.trim() || null;

  return new Response(JSON.stringify({ suggestion }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
