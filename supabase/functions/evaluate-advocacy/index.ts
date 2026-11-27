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
    const authorization = req.headers.get("Authorization") || ""
    const token = authorization.replace(/^Bearer\s+/i, "")
    if (!token) return json({ error: "يلزم تسجيل دخول المسؤول." }, 401)

    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    const apiKey = Deno.env.get("OPENAI_API_KEY")
    if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
      return json({ error: "خدمة التقييم غير مهيأة بعد." }, 503)
    }

    const userClient = createClient(supabaseUrl, anonKey)
    const { data: authData, error: authError } = await userClient.auth.getUser(token)
    if (authError || !authData.user) return json({ error: "جلسة المسؤول غير صالحة." }, 401)

    const adminClient = createClient(supabaseUrl, serviceKey)
    const { data: adminRow, error: adminError } = await adminClient
      .from("admin_users").select("active").eq("user_id", authData.user.id).maybeSingle()
    if (adminError || !adminRow?.active) return json({ error: "غير مصرح بتنفيذ التقييم." }, 403)

    const body = await req.json()
    const argument = typeof body?.final_argument === "string" ? body.final_argument.trim() : ""
    const answers = Array.isArray(body?.answers) ? body.answers : []
    const caseTitle = typeof body?.case_title === "string" ? body.case_title.slice(0, 300) : ""
    const caseFacts = typeof body?.case_facts === "string" ? body.case_facts.slice(0, 5000) : ""
    if (argument.length < 200 || argument.length > 30000) {
      return json({ error: "المرافعة يجب أن تكون بين 200 و30000 حرف لإجراء التقييم." }, 400)
    }

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini"
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        max_tokens: 850,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "أنت مقيّم أكاديمي للمرافعات القانونية. قيّم المرافعة على جودة التكييف والتحليل والاستدلال بالأدلة والترابط القانوني ووضوح الطلبات والصياغة. لا تخترع مواد نظامية أو وقائع. إن غابت الإحالات النظامية أو الأدلة فاذكر ذلك. لا تجعل التقييم اعتمادًا رسميًا. أعد JSON صالحًا فقط بالحقول: score (عدد من 0 إلى 10)، strengths (مصفوفة نصوص)، improvements (مصفوفة نصوص)، rationale (نص)، disclaimer (نص). امنح الدرجة بصرامة واتساق، ولا تتأثر بالاسم أو سرعة التسليم." },
          { role: "user", content: JSON.stringify({ case_title: caseTitle, case_facts: caseFacts, objective_answers: answers, final_argument: argument }) }
        ]
      })
    })
    const result = await response.json()
    if (!response.ok) {
      console.error("Advocacy evaluation provider error", response.status)
      return json({ error: "تعذر إكمال التقييم حاليًا." }, 502)
    }
    const raw = result?.choices?.[0]?.message?.content
    if (typeof raw !== "string") return json({ error: "لم يصل تقييم صالح." }, 502)
    const evaluation = JSON.parse(raw)
    const score = Number(evaluation.score)
    if (!Number.isFinite(score) || score < 0 || score > 10) return json({ error: "صيغة التقييم غير صالحة." }, 502)
    return json({ evaluation: { ...evaluation, score } })
  } catch (error) {
    console.error("evaluate-advocacy error", error)
    return json({ error: "حدث خطأ غير متوقع أثناء التقييم." }, 500)
  }
})
