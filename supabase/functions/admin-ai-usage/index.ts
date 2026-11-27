import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" }
  })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
    if (!token) return json({ error: "يلزم تسجيل دخول المسؤول." }, 401)
    const url = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || (() => { const keys = Deno.env.get("SUPABASE_SECRET_KEYS"); if (!keys) return null; try { return JSON.parse(keys).default || null } catch { return null } })()
    if (!url || !anonKey || !serviceKey) return json({ error: "إعدادات الخدمة غير مكتملة." }, 503)

    const userClient = createClient(url, anonKey)
    const { data: auth, error: authError } = await userClient.auth.getUser(token)
    if (authError || !auth.user) return json({ error: "جلسة غير صالحة." }, 401)

    const admin = createClient(url, serviceKey)
    const { data: row, error: adminError } = await admin.from("admin_users")
      .select("active").eq("user_id", auth.user.id).maybeSingle()
    if (adminError || !row?.active) return json({ error: "غير مصرح." }, 403)

    const limit = Number(Deno.env.get("ADVOCACY_AI_MONTHLY_LIMIT") || 0)
    const monthStart = new Date()
    monthStart.setUTCDate(1)
    monthStart.setUTCHours(0, 0, 0, 0)
    const impactLimit = Number(Deno.env.get("IMPACT_AI_MONTHLY_LIMIT") || 0)
    const [{ data: usage, error: usageError }, { data: impactUsage, error: impactUsageError }] = await Promise.all([
      admin.from("advocacy_ai_usage")
        .select("month_start,request_count,estimated_input_tokens,actual_input_tokens,actual_output_tokens,failed_count,updated_at")
        .eq("month_start", monthStart.toISOString().slice(0, 10)).maybeSingle(),
      admin.from("impact_ai_usage")
        .select("month_start,request_count,estimated_input_tokens,actual_input_tokens,actual_output_tokens,failed_count,updated_at")
        .eq("month_start", monthStart.toISOString().slice(0, 10)).maybeSingle(),
    ])
    if (usageError || impactUsageError) return json({ error: "تعذر تحميل إحصائيات الاستهلاك. تأكدي من تطبيق ترحيل قاعدة البيانات." }, 503)

    const emptyUsage = {
      month_start: monthStart.toISOString().slice(0, 10),
      request_count: 0,
      estimated_input_tokens: 0,
      actual_input_tokens: 0,
      actual_output_tokens: 0,
      failed_count: 0,
    }
    return json({
      monthly_limit: Number.isInteger(limit) && limit > 0 ? limit : null,
      configured: Number.isInteger(limit) && limit > 0,
      usage: usage || emptyUsage,
      impact_monthly_limit: Number.isInteger(impactLimit) && impactLimit > 0 ? impactLimit : null,
      impact_configured: Number.isInteger(impactLimit) && impactLimit > 0,
      impact_usage: impactUsage || emptyUsage,
    })
  } catch (error) {
    console.error("admin-ai-usage error", error)
    return json({ error: "حدث خطأ أثناء تحميل الاستهلاك." }, 500)
  }
})
