import { createClient } from "npm:@supabase/supabase-js@2"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const portalGuidance: Record<string, string> = {
  meetings: `أنت مساعد قياس جودة اللقاءات في منظومة نهج. قُد المستخدم سؤالًا واحدًا في كل مرة لتفهم نوع اللقاء، هدفه، الجمهور واحتياجه، التخطيط والتنظيم، الحضور والتفاعل، مدى تحقق الهدف، المخرجات والمتابعة. اسأل أسئلة توضيحية عند نقص المعلومات. لا تفترض أرقامًا أو نتائج. عند اكتمال المعلومات قدم قراءة منظمة لمؤشرات الجودة والفجوات وفرص التحسين. إذا سأل المستخدم «هل اللقاء يجاوبني؟» فقارن احتياجه المعلن بمحتوى اللقاء ومخرجاته.`,
  partners: `أنت مساعد قياس الشراكات في منظومة نهج. قُد المستخدم سؤالًا واحدًا في كل مرة لفهم أهداف الشراكة، مساهمة كل طرف، الالتزام، جودة التواصل والتعاون، النتائج المشتركة، واستدامة العلاقة. لا تخلط بين عدد الأنشطة والأثر، ولا تخترع مؤشرات أو أرقامًا. قدم نقاط القوة والفجوات والمخاطر وفرص التطوير وخطة متابعة عملية.`,
  general: `أنت مساعد قياس الأثر العام في منظومة نهج. حلّل البيانات المتاحة للاستبيانات العامة والرضا وجودة التجربة. لا تخترع بيانات أو أرقامًا، واذكر بوضوح عندما لا توجد بيانات كافية.`,
  teams: `أنت مساعد قياس أداء الفرق والأعضاء في منظومة نهج. قُد المستخدم سؤالًا واحدًا في كل مرة لفهم الفريق، الأدوار والمسؤوليات، الأهداف، الإنجاز، جودة التعاون، المبادرة، الالتزام، التحديات واحتياج التطوير. استخدم لغة عادلة وبنّاءة ولا تصدر أحكامًا شخصية أو تقارن أفرادًا دون بيانات عادلة.`
}

async function buildSurveyContext(supabase: ReturnType<typeof createClient>, portal: string) {
  const { data: surveys, error: surveyError } = await supabase
    .from("impact_surveys")
    .select("id,title,status,category,created_at")
    .eq("category", portal)
    .order("created_at", { ascending: false })
    .limit(50);
  if (surveyError) throw new Error("Unable to load impact surveys");

  const surveyIds = (surveys || []).map((item: any) => item.id);
  if (!surveyIds.length) {
    return {
      surveys: [],
      response_count: 0,
      indicators: [],
      data_gaps: ["لا توجد استبيانات مسجلة لهذا المجال حتى الآن."],
      connected_sources: ["impact_surveys", "impact_survey_questions", "impact_survey_responses"],
      unavailable_sources: ["سجل الدورات والبرامج واللقاءات التفصيلي غير موجود ضمن مصادر البيانات المتصلة حاليًا."],
    };
  }

  const [questionResult, responseResult] = await Promise.all([
    supabase.from("impact_survey_questions")
      .select("id,survey_id,prompt,question_type,options,dimension,position")
      .in("survey_id", surveyIds)
      .order("position", { ascending: true }),
    supabase.from("impact_survey_responses")
      .select("id,survey_id,answers,submitted_at")
      .in("survey_id", surveyIds)
      .order("submitted_at", { ascending: false })
      .limit(1000),
  ]);
  if (questionResult.error || responseResult.error) {
    throw new Error("Unable to load impact survey results");
  }

  const questions = questionResult.data || [];
  const responses = responseResult.data || [];
  const surveySummaries = (surveys || []).map((survey: any) => {
    const surveyResponses = responses.filter((row: any) => row.survey_id === survey.id);
    return {
      title: survey.title,
      status: survey.status,
      response_count: surveyResponses.length,
      submitted_from: surveyResponses.length
        ? surveyResponses[surveyResponses.length - 1].submitted_at
        : null,
      indicators: questions
        .filter((question: any) => question.survey_id === survey.id)
        .map((question: any) => {
          const values = surveyResponses
            .map((row: any) => row.answers?.[question.id])
            .filter((value: any) => value !== undefined && value !== null && value !== "");
          if (question.question_type === "rating") {
            const numbers = values.map(Number).filter((value: number) => Number.isFinite(value) && value >= 1 && value <= 5);
            return {
              question: question.prompt,
              dimension: question.dimension,
              type: "rating",
              response_count: numbers.length,
              average: numbers.length
                ? Math.round((numbers.reduce((sum: number, value: number) => sum + value, 0) / numbers.length) * 100) / 100
                : null,
            };
          }
          if (question.question_type === "choice") {
            return {
              question: question.prompt,
              dimension: question.dimension,
              type: "choice",
              response_count: values.length,
              distribution: (Array.isArray(question.options) ? question.options : []).map((option: string) => ({
                option,
                count: values.filter((value: unknown) => value === option).length,
              })),
            };
          }
          return {
            question: question.prompt,
            dimension: question.dimension,
            type: "text",
            response_count: values.length,
            note: "تم احتساب عدد الإجابات النصية فقط دون إرسال نصوص قد تتضمن بيانات شخصية.",
          };
        }),
    };
  });

  return {
    surveys: surveySummaries,
    response_count: responses.length,
    indicators: surveySummaries.flatMap((survey: any) => survey.indicators),
    data_gaps: responses.length
      ? []
      : ["الاستبيانات موجودة لكن لم تصل أي استجابات بعد."],
    connected_sources: ["impact_surveys", "impact_survey_questions", "impact_survey_responses"],
    unavailable_sources: ["لا يوجد حاليًا جدول موصول لتفاصيل الدورات والبرامج وسجل اللقاءات أو بيانات الشراكات التشغيلية؛ لا يمكن تحليل نشاط غير مسجل في مصادر البيانات."],
  };
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
}

function getServiceKey() {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  if (legacy) return legacy
  const keys = Deno.env.get("SUPABASE_SECRET_KEYS")
  if (keys) {
    try { return JSON.parse(keys).default || null } catch { return null }
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405)

  let supabase: ReturnType<typeof createClient> | null = null
  let reserved = false
  let actualInputTokens = 0
  let actualOutputTokens = 0
  let failed = false

  try {
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "")
    if (!token) return json({ error: "يلزم تسجيل دخول المسؤول لاستخدام مساعد أثَر." }, 401)

    const url = Deno.env.get("SUPABASE_URL")
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")
    const serviceKey = getServiceKey()
    const apiKey = Deno.env.get("OPENAI_API_KEY")
    const monthlyLimit = Number(Deno.env.get("IMPACT_AI_MONTHLY_LIMIT") || 0)
    if (!url || !anonKey || !serviceKey || !apiKey) return json({ error: "خدمة المساعد غير مهيأة بعد." }, 503)
    if (!Number.isInteger(monthlyLimit) || monthlyLimit < 1) {
      return json({ error: "لم يتم ضبط سقف الاستخدام الشهري للمساعد." }, 503)
    }

    const userClient = createClient(url, anonKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: auth, error: authError } = await userClient.auth.getUser(token)
    if (authError || !auth.user) return json({ error: "جلسة غير صالحة. سجّل الدخول مجددًا." }, 401)

    supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } })
    const { data: adminRow, error: adminError } = await supabase
      .from("admin_users")
      .select("active")
      .eq("user_id", auth.user.id)
      .maybeSingle()
    if (adminError || !(adminRow as { active?: boolean } | null)?.active) return json({ error: "هذه البوابة متاحة للمسؤولين النشطين فقط." }, 403)

    const body = await req.json()
    const portal = body?.portal
    const mode = body?.mode === "report" ? "report" : "chat"
    const messages = body?.messages
    if (!portalGuidance[portal] || !Array.isArray(messages) || messages.length < 1 || messages.length > 40) {
      return json({ error: "بيانات الطلب غير صالحة." }, 400)
    }

    const safeMessages = messages
      .filter((m: any) => ["user", "assistant"].includes(m?.role) && typeof m?.content === "string")
      .slice(-12)
      .map((m: any) => ({ role: m.role, content: m.content.slice(0, 3000) }))
    if (!safeMessages.length || (mode === "chat" && safeMessages[safeMessages.length - 1].role !== "user")) {
      return json({ error: "أرسل إجابتك أولًا." }, 400)
    }

    const impactContext = await buildSurveyContext(supabase, portal);
    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini"
    const contextInstruction = `بيانات منظومة أثَر الفعلية المستخرجة من قاعدة البيانات (بيانات مجمعة ومجهولة الهوية): ${JSON.stringify(impactContext)}. اعتمد عليها عند الإجابة عن أداء الاستبيانات والمؤشرات. إذا سأل المستخدم عن دورة أو لقاء أو شراكة غير ممثلة في البيانات المتصلة، فصرّح بأن سجل هذا النشاط غير متصل أو غير متاح، واطلب منه توفير بيانات موثقة؛ لا تستنتج وجودها من استبيان عام. لا تستنتج سبب الانخفاض إلا إذا كانت هناك مؤشرات أو إجابات كافية تدعمه، وميّز بين الارتباط والسببية.`;
    const reportSystem = `أنت محلل قياس أثر في منظومة «أثَر». حلل المحادثة كاملة وأنشئ تقريرًا أوليًا باللغة العربية دون اختراع أي بيانات أو أرقام. استخدم «غير متوفر» عند نقص البيانات. أعد JSON صالحًا فقط بهذه المفاتيح: title، executive_summary، context، indicators (مصفوفة عناصر {name,value,interpretation,evidence})، strengths (مصفوفة نصوص)، gaps (مصفوفة نصوص)، recommendations (مصفوفة عناصر {action,priority,rationale})، data_quality، limitations (مصفوفة نصوص)، follow_up (مصفوفة نصوص). لا تمنح تصنيف نجاح/فشل قطعيًا ولا تعتبر المقترحات معايير معتمدة. لا تتضمن بيانات شخصية. مجال التقرير: ${portal}. ${portalGuidance[portal]} ${contextInstruction}`;
    const systemMessage = mode === "report"
      ? reportSystem
      : `أنت «مساعد نهج» ضمن منظومة قياس الأثر والاستدامة. تحدث بالعربية الواضحة وبأسلوب مهني ودود. لا تقدم ادعاءات أو أرقامًا غير موجودة في مدخلات المستخدم أو بيانات المنظومة. اطرح سؤالًا واحدًا واضحًا في كل رد حتى تتضح الحالة. لا تطلب بيانات شخصية أو سرية. عند اكتمال المعلومات قدّم قراءة أولية واذكر البيانات الناقصة. هذه مخرجات مساعدة وليست اعتمادًا رسميًا. ${portalGuidance[portal]} ${contextInstruction}`;
    const requestMessages = [{ role: "system", content: systemMessage }, ...safeMessages]
    const requestBody = JSON.stringify({
      model,
      temperature: mode === "report" ? 0.1 : 0.3,
      max_tokens: mode === "report" ? 1500 : 700,
      ...(mode === "report" ? { response_format: { type: "json_object" } } : {}),
      messages: requestMessages,
    })
    const estimatedTokens = Math.ceil(requestBody.length / 4) + (mode === "report" ? 1500 : 700)

    const { data: allowed, error: quotaError } = await (supabase as any).rpc("reserve_impact_ai_request", {
      p_monthly_limit: monthlyLimit,
      p_estimated_input_tokens: estimatedTokens,
    })
    if (quotaError || allowed !== true) {
      console.error("Impact AI quota unavailable or exhausted", quotaError?.message || "limit reached")
      return json({ error: "تم بلوغ سقف الاستخدام الشهري للمساعد أو تعذر التحقق منه." }, 429)
    }
    reserved = true

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: requestBody,
    })
    const result = await response.json()
    actualInputTokens = Number(result?.usage?.prompt_tokens || 0)
    actualOutputTokens = Number(result?.usage?.completion_tokens || 0)
    if (!response.ok) {
      failed = true
      console.error("OpenAI impact request failed", response.status, result?.error?.type || "unknown")
      return json({ error: "تعذر إكمال طلب المساعد حاليًا. حاول بعد قليل." }, 502)
    }

    const content = result?.choices?.[0]?.message?.content
    if (typeof content !== "string" || !content.trim()) {
      failed = true
      throw new Error("Empty assistant response")
    }
    if (mode === "report") {
      const report = JSON.parse(content)
      if (typeof report.title !== "string" || typeof report.executive_summary !== "string" ||
          !Array.isArray(report.indicators) || !Array.isArray(report.recommendations)) {
        failed = true
        throw new Error("Invalid report structure")
      }
      return json({ report })
    }
    return json({ reply: content.trim() })
  } catch (error) {
    failed = true
    console.error("impact-assistant error", error)
    return json({ error: "حدث خطأ غير متوقع أثناء معالجة الطلب." }, 500)
  } finally {
    if (reserved && supabase) {
      const { error } = await (supabase as any).rpc("record_impact_ai_usage", {
        p_actual_input_tokens: actualInputTokens,
        p_actual_output_tokens: actualOutputTokens,
        p_failed: failed,
      })
      if (error) console.error("Unable to record impact AI usage", error.message)
    }
  }
})
