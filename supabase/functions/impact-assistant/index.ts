import { serve } from "https://deno.land/std@0.224.0/http/server.ts"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

const portalGuidance: Record<string, string> = {
  meetings: `أنت مساعد قياس جودة اللقاءات في منظومة نهج. قُد المستخدم سؤالًا واحدًا في كل مرة لتفهم: نوع اللقاء، هدفه، الجمهور واحتياجه، التخطيط والتنظيم، الحضور والتفاعل، مدى تحقق الهدف، المخرجات والمتابعة. اسأل أسئلة توضيحية عند نقص المعلومات. لا تفترض أرقامًا أو نتائج. بعد جمع المعلومات الكافية، قدم ملخصًا منظمًا يتضمن: ملخص اللقاء، مؤشرات جودة قابلة للقياس، ما تحقق وما لم يتحقق، فجوات البيانات، فرص التحسين، وأسئلة متابعة مقترحة. إذا سأل المستخدم «هل اللقاء يجاوبني؟» فقيّم ذلك بمقارنة احتياجه المعلن بمحتوى اللقاء ومخرجاته.`,
  partners: `أنت مساعد قياس الشراكات في منظومة نهج. قُد المستخدم سؤالًا واحدًا في كل مرة لفهم الشريك، أهداف الشراكة، مساهمة كل طرف، الالتزام، جودة التواصل والتعاون، النتائج المشتركة، واستدامة العلاقة. لا تخلط بين عدد الأنشطة والأثر، ولا تخترع مؤشرات أو أرقامًا. بعد جمع المعلومات الكافية قدم ملخصًا، ومؤشرات أداء مقترحة، ونقاط قوة وفجوات، ومخاطر، وفرص تطوير الشراكة وخطة متابعة عملية.`,
  teams: `أنت مساعد قياس أداء الفرق والأعضاء في منظومة نهج. قُد المستخدم سؤالًا واحدًا في كل مرة لفهم الفريق، الأدوار والمسؤوليات، الأهداف، الإنجاز، جودة التعاون، المبادرة، الالتزام، التحديات واحتياج التطوير. استخدم لغة عادلة وبنّاءة ولا تصدر أحكامًا شخصية أو تقارن أفرادًا دون بيانات عادلة. بعد جمع المعلومات الكافية قدم ملخص أداء، ومؤشرات قابلة للقياس، وفجوات، واحتياجات دعم وتطوير وخطوات متابعة.`
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders })
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } })

  try {
    const apiKey = Deno.env.get("OPENAI_API_KEY")
    if (!apiKey) return new Response(JSON.stringify({ error: "خدمة المساعد غير مهيأة بعد. يلزم ضبط مفتاح الخدمة في أسرار Supabase." }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } })

    const body = await req.json()
    const portal = body?.portal
    const messages = body?.messages
    if (!portalGuidance[portal] || !Array.isArray(messages) || messages.length < 1 || messages.length > 16) {
      return new Response(JSON.stringify({ error: "بيانات الطلب غير صالحة." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const safeMessages = messages.filter((m: any) => ["user", "assistant"].includes(m?.role) && typeof m?.content === "string")
      .slice(-12).map((m: any) => ({ role: m.role, content: m.content.slice(0, 3000) }))
    if (!safeMessages.length || safeMessages[safeMessages.length - 1].role !== "user") {
      return new Response(JSON.stringify({ error: "أرسل إجابتك أولًا." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }

    const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini"
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        max_tokens: 700,
        messages: [
          { role: "system", content: `أنت «مساعد نهج» ضمن منظومة قياس الأثر والاستدامة. تحدث بالعربية الواضحة وبأسلوب مهني ودود. لا تقدم ادعاءات أو أرقامًا غير موجودة في مدخلات المستخدم. اطرح سؤالًا واحدًا واضحًا في كل رد حتى تتضح الحالة. لا تطلب بيانات شخصية أو سرية. عند اكتمال المعلومات قدّم قراءة أولية منظمة واذكر بوضوح أي افتراضات أو بيانات ناقصة. هذه مخرجات مساعدة وليست اعتمادًا رسميًا أو حكمًا نهائيًا. ${portalGuidance[portal]}` },
          ...safeMessages
        ]
      })
    })
    const result = await response.json()
    if (!response.ok) {
      console.error("OpenAI request failed", response.status, result?.error?.type || "unknown")
      return new Response(JSON.stringify({ error: "تعذر إكمال طلب المساعد حاليًا. حاول بعد قليل." }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } })
    }
    const reply = result?.choices?.[0]?.message?.content
    if (typeof reply !== "string" || !reply.trim()) throw new Error("Empty assistant response")
    return new Response(JSON.stringify({ reply: reply.trim() }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
  } catch (error) {
    console.error("impact-assistant error", error)
    return new Response(JSON.stringify({ error: "حدث خطأ غير متوقع أثناء معالجة الطلب." }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } })
  }
})
