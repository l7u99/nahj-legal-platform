
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function response(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}

function getServiceKey(): string {
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (legacy) return legacy;

  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (secretKeys) {
    const parsed = JSON.parse(secretKeys);
    if (parsed.default) return parsed.default;
  }

  throw new Error("Supabase service key is missing");
}


type AdvocacyEvaluation = {
  total_score: number;
  criteria: Array<{ name: string; score: number; max_score: 20; comment: string }>;
  summary: string;
  strengths: string[];
  improvements: string[];
  legal_reference_warnings: string[];
  disclaimer: string;
};

async function evaluateAdvocacy(
  supabase: ReturnType<typeof createClient>,
  input: {
    caseTitle: string;
    caseFacts: string;
    caseDetails: unknown;
    stages: unknown[];
    answers: Record<string, unknown>;
    finalArgument: string;
  },
): Promise<{ evaluation: AdvocacyEvaluation | null; reason?: string }> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  const monthlyLimit = Number(Deno.env.get("ADVOCACY_AI_MONTHLY_LIMIT") || 0);
  if (!apiKey) return { evaluation: null, reason: "مفتاح الذكاء الاصطناعي غير مضبوط" };
  if (!Number.isInteger(monthlyLimit) || monthlyLimit < 1) {
    return { evaluation: null, reason: "لم يتم ضبط سقف الاستهلاك الشهري" };
  }

  const model = Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini";
  const promptData = {
    case_title: input.caseTitle.slice(0, 300),
    case_facts: input.caseFacts.slice(0, 8000),
    case_details: input.caseDetails,
    stages: input.stages,
    objective_answers: input.answers,
    final_argument: input.finalArgument.slice(0, 30000),
  };
  const userContent = JSON.stringify(promptData);
  const estimatedTokens = Math.ceil(userContent.length / 4) + 1200;

  const { data: reserved, error: reserveError } = await supabase.rpc(
    "reserve_advocacy_ai_evaluation",
    {
      p_monthly_limit: monthlyLimit,
      p_estimated_input_tokens: estimatedTokens,
    },
  );
  if (reserveError || reserved !== true) {
    console.error("Advocacy AI quota unavailable or exhausted", reserveError?.message || "limit reached");
    return { evaluation: null, reason: "تم بلوغ سقف التقييم الشهري أو تعذر التحقق منه" };
  }

  let actualInputTokens = 0;
  let actualOutputTokens = 0;
  let failed = false;
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: \`Bearer \${apiKey}\`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.1,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: \`أنت مقيّم قانوني أكاديمي متخصص في تقييم المرافعات. قيّم المرافعة وفق خمسة معايير، كل معيار من 20 درجة (المجموع 100):
1) سلامة التكييف القانوني.
2) تحليل الوقائع وربطها بالعناصر القانونية.
3) الأسانيد والأنظمة: دقة الاستناد للنصوص والأنظمة وعدم اختلاق مواد أو أحكام.
4) حجية الأدلة: فهم الأدلة وقوتها وصلتها بالوقائع والرد على ما يضعفها.
5) قوة الصياغة والترابط: تنظيم المرافعة ووضوح الطلبات وتسلسل الحجة.

أعد JSON صالحًا فقط بالمفاتيح: criteria (مصفوفة من خمسة عناصر، لكل عنصر name وscore بين 0 و20 وmax_score=20 وcomment)، summary (ملخص تقييمي)، strengths (مصفوفة نقاط قوة)، improvements (مصفوفة تحسينات عملية)، legal_reference_warnings (مصفوفة بالإحالات غير الدقيقة أو التي تحتاج تحققًا)، disclaimer (أن التقييم آلي أولي). اجعل مجموع درجات المعايير هو الدرجة الكلية. لا تخترع مواد نظامية أو سوابق قضائية ولا تعتبر غياب ذكر مادة بعينها خطأ دون سياق. استند فقط إلى الوقائع والنصوص المقدمة. لا تتأثر باسم المشارك أو سرعة التسليم. كن متوازنًا وصارمًا، وميّز بين نقص البيانات وضعف الحجة. لا تصدر حكمًا قانونيًا على أطراف حقيقية.\`,
          },
          { role: "user", content: userContent },
        ],
      }),
    });

    const result = await response.json();
    actualInputTokens = Number(result?.usage?.prompt_tokens || 0);
    actualOutputTokens = Number(result?.usage?.completion_tokens || 0);
    if (!response.ok) {
      failed = true;
      console.error("OpenAI advocacy scoring failed", response.status, result?.error?.type || "unknown");
      return { evaluation: null, reason: "تعذر تنفيذ التقييم الآلي" };
    }

    const raw = result?.choices?.[0]?.message?.content;
    if (typeof raw !== "string") {
      failed = true;
      return { evaluation: null, reason: "لم يصل تقييم بصيغة صالحة" };
    }

    const parsed = JSON.parse(raw);
    const criteria = Array.isArray(parsed.criteria) ? parsed.criteria : [];
    if (criteria.length !== 5) {
      failed = true;
      return { evaluation: null, reason: "معايير التقييم غير مكتملة" };
    }
    const normalized = criteria.map((item: any) => ({
      name: String(item.name || "").slice(0, 120),
      score: Number(item.score),
      max_score: 20 as const,
      comment: String(item.comment || "").slice(0, 1200),
    }));
    if (normalized.some((item: any) =>
      !item.name || !Number.isFinite(item.score) || item.score < 0 || item.score > 20
    )) {
      failed = true;
      return { evaluation: null, reason: "درجات التقييم خارج النطاق المسموح" };
    }
    const total = normalized.reduce((sum: number, item: any) => sum + item.score, 0);
    const evaluation: AdvocacyEvaluation = {
      total_score: Math.round(total * 100) / 100,
      criteria: normalized,
      summary: String(parsed.summary || "").slice(0, 2500),
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 8).map((v: unknown) => String(v).slice(0, 500)) : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 8).map((v: unknown) => String(v).slice(0, 500)) : [],
      legal_reference_warnings: Array.isArray(parsed.legal_reference_warnings) ? parsed.legal_reference_warnings.slice(0, 8).map((v: unknown) => String(v).slice(0, 500)) : [],
      disclaimer: String(parsed.disclaimer || "تقييم آلي أولي يخضع للمراجعة البشرية.").slice(0, 500),
    };
    return { evaluation };
  } catch (error) {
    failed = true;
    console.error("Advocacy evaluation parse/runtime error", error);
    return { evaluation: null, reason: "حدث خطأ أثناء تحليل المرافعة" };
  } finally {
    const { error: usageError } = await supabase.rpc("record_advocacy_ai_usage", {
      p_actual_input_tokens: actualInputTokens,
      p_actual_output_tokens: actualOutputTokens,
      p_failed: failed,
    });
    if (usageError) console.error("Unable to record advocacy AI usage", usageError.message);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return response({ error: "Method not allowed" }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = getServiceKey();

    if (!supabaseUrl) {
      return response({ error: "Server configuration error" }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const body = await req.json();

    const attemptId = String(body.attempt_id || "").trim();
    const fullName = String(body.full_name || "").trim();
    const answers = body.answers;
    const finalArgument = String(body.final_argument || "").trim();

    const uuidPattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    if (!uuidPattern.test(attemptId)) {
      return response({ error: "معرّف المحاولة غير صالح" }, 400);
    }

    if (fullName.split(/\s+/).filter(Boolean).length < 3) {
      return response({ error: "يرجى إدخال الاسم الثلاثي" }, 400);
    }

    if (
      !answers ||
      typeof answers !== "object" ||
      Array.isArray(answers)
    ) {
      return response({ error: "الإجابات غير صالحة" }, 400);
    }

    const wordCount = finalArgument.split(/\s+/u).filter(Boolean).length;
    const hasLetter = /\p{L}/u.test(finalArgument);

    if (finalArgument.length < 200) {
      return response({
        error: "يجب أن تحتوي المرافعة على 200 حرف على الأقل.",
      }, 400);
    }

    if (wordCount > 5000) {
      return response({
        error: "الحد الأعلى للمرافعة هو 5,000 كلمة.",
      }, 400);
    }

    if (!hasLetter) {
      return response({
        error: "يرجى كتابة مرافعة نصية تحتوي على أحرف.",
      }, 400);
    }

    const { data: attempt, error: attemptError } = await supabase
      .from("advocacy_attempts")
      .select("id,case_id,phone_hash,started_at,status")
      .eq("id", attemptId)
      .maybeSingle();

    if (attemptError || !attempt) {
      return response({ error: "المحاولة غير موجودة" }, 404);
    }

    const { data: existing, error: existingError } = await supabase
      .from("advocacy_submissions")
      .select("id,evaluation_status,total_score,objective_score,ai_score,ai_feedback,submitted_at,duration_seconds")
      .eq("attempt_id", attemptId)
      .maybeSingle();

    if (existingError) {
      return response({
        error: "تعذر التحقق من التسليم السابق",
      }, 500);
    }

    // لا نعيد تقييم المشاركة أو نغيّر درجاتها عند إعادة الطلب.
    if (existing) {
      if (attempt.status === "started") {
        const { error: attemptUpdateError } = await supabase
          .from("advocacy_attempts")
          .update({
            status: "submitted",
            completed_at: existing.submitted_at,
            duration_seconds: existing.duration_seconds,
          })
          .eq("id", attemptId)
          .eq("status", "started");

        if (attemptUpdateError) {
          console.error("Attempt update error:", attemptUpdateError);
          return response({
            error: "تم حفظ المشاركة، لكن تعذر تحديث حالة المحاولة",
          }, 500);
        }
      }

      return response({
        success: true,
        already_submitted: true,
        submission_id: existing.id,
        status: "submitted",
        evaluation_status: existing.evaluation_status,
        objective_score: Number(existing.objective_score || 0),
        ai_score: existing.ai_score,
        ai_feedback: existing.ai_feedback,
        total_score: existing.total_score,
        message: "سبق استلام مشاركتك وحُفظت بنجاح.",
      });
    }

    if (attempt.status !== "started") {
      return response({ error: "سبق تسليم هذه المحاولة" }, 409);
    }

    const { data: stages, error: stagesError } = await supabase
      .from("advocacy_stages")
      .select("id,stage_number,title,prompt,points,stage_type,options")
      .eq("case_id", attempt.case_id)
      .order("position", { ascending: true });

    if (stagesError || !stages || stages.length === 0) {
      return response({
        error: "تعذر تحميل مراحل المسابقة",
      }, 500);
    }

    const multipleChoiceStages = stages.filter(
      (stage: any) => stage.stage_type === "multiple_choice",
    );

    const finalStage = stages.find(
      (stage: any) =>
        stage.stage_type === "written_argument" ||
        stage.stage_number === 4,
    );

    if (!finalStage || multipleChoiceStages.length !== 3) {
      return response({
        error: "إعداد مراحل المسابقة غير مكتمل",
      }, 500);
    }

    const stageIds = multipleChoiceStages.map(
      (stage: any) => stage.id,
    );

    const { data: answerKeys, error: keysError } = await supabase
      .from("advocacy_stage_answers")
      .select("stage_id,correct_option_index")
      .in("stage_id", stageIds);

    if (keysError) {
      return response({
        error: "تعذر تحميل مفاتيح الإجابة",
      }, 500);
    }

    const keyByStage = new Map(
      (answerKeys ?? []).map((key: any) => [key.stage_id, key]),
    );

    for (const stage of multipleChoiceStages) {
      if (!keyByStage.has(stage.id)) {
        return response({
          error: `مفتاح الإجابة غير موجود للمرحلة ${stage.stage_number}`,
        }, 500);
      }
    }

    let objectiveScore = 0;
    let objectiveMaximum = 0;

    for (const stage of multipleChoiceStages) {
      const key: any = keyByStage.get(stage.id);
      const options = Array.isArray(stage.options)
        ? stage.options
        : [];

      objectiveMaximum += Number(stage.points || 0);

      const submitted = answers[stage.id];

      const selectedIndex =
        typeof submitted === "number"
          ? submitted
          : submitted?.selected_option_index ??
            submitted?.option_index ??
            submitted?.selectedOptionIndex;

      if (
        selectedIndex === undefined ||
        selectedIndex === null ||
        !Number.isInteger(Number(selectedIndex))
      ) {
        return response({
          error: `يرجى الإجابة عن المرحلة ${stage.stage_number}`,
        }, 400);
      }

      const index = Number(selectedIndex);

      if (index < 0 || index >= options.length) {
        return response({
          error: `الخيار المحدد غير صالح في المرحلة ${stage.stage_number}`,
        }, 400);
      }

      if (index === Number(key.correct_option_index)) {
        objectiveScore += Number(stage.points || 0);
      }
    }

    if (objectiveMaximum !== 15) {
      return response({
        error: "مجموع درجات المراحل الموضوعية يجب أن يساوي 15",
      }, 500);
    }

    const [{ data: caseRow }, { data: caseDetails }] = await Promise.all([
      supabase.from("advocacy_cases").select("title,case_facts").eq("id", attempt.case_id).maybeSingle(),
      supabase.from("advocacy_case_details").select("parties,claims,defenses,legal_references").eq("case_id", attempt.case_id).maybeSingle(),
    ]);

    const stageContext = multipleChoiceStages.map((stage: any) => {
      const options = Array.isArray(stage.options) ? stage.options : [];
      const submitted = answers[stage.id];
      const selectedIndex = typeof submitted === "number"
        ? submitted
        : submitted?.selected_option_index ?? submitted?.option_index ?? submitted?.selectedOptionIndex;
      return {
        stage_number: stage.stage_number,
        title: stage.title,
        question: stage.prompt,
        selected_answer: Number.isInteger(Number(selectedIndex)) ? options[Number(selectedIndex)] ?? null : null,
      };
    });

    const startedAt = new Date(attempt.started_at).getTime();

    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - startedAt) / 1000),
    );

    const { data: submission, error: insertError } = await supabase
      .from("advocacy_submissions")
      .insert({
        case_id: attempt.case_id,
        attempt_id: attempt.id,
        full_name: fullName,
        phone_hash: attempt.phone_hash,
        answers,
        final_argument: finalArgument,
        objective_score: objectiveScore,
        total_score: null,
        evaluation_status: "pending",
        submitted_at: new Date().toISOString(),
        started_at: attempt.started_at,
        duration_seconds: durationSeconds,
      })
      .select("id")
      .single();

    if (insertError || !submission) {
      console.error("Submission insert error:", insertError);
      return response({
        error: "تعذر حفظ المشاركة",
      }, 500);
    }

    const evaluationResult = await evaluateAdvocacy(supabase, {
      caseTitle: caseRow?.title || "",
      caseFacts: caseRow?.case_facts || "",
      caseDetails: caseDetails || {},
      stages: stageContext,
      answers,
      finalArgument,
    });

    let finalEvaluationStatus = "pending";
    let finalAiScore: number | null = null;
    let finalTotalScore: number | null = null;
    let finalAiFeedback: Record<string, unknown> | null = null;

    if (evaluationResult.evaluation) {
      finalEvaluationStatus = "evaluated";
      finalAiScore = evaluationResult.evaluation.total_score;
      finalTotalScore = evaluationResult.evaluation.total_score;
      finalAiFeedback = {
        ...evaluationResult.evaluation,
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
        evaluated_at: new Date().toISOString(),
      };
      const { error: evaluationSaveError } = await supabase
        .from("advocacy_submissions")
        .update({
          ai_score: finalAiScore,
          ai_feedback: finalAiFeedback,
          total_score: finalTotalScore,
          evaluation_status: finalEvaluationStatus,
          evaluated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);
      if (evaluationSaveError) {
        console.error("Unable to save advocacy evaluation", evaluationSaveError);
        finalEvaluationStatus = "pending";
        finalAiScore = null;
        finalTotalScore = null;
        finalAiFeedback = null;
      }
    }

    const { error: attemptUpdateError } = await supabase
      .from("advocacy_attempts")
      .update({
        status: "submitted",
        completed_at: new Date().toISOString(),
        duration_seconds: durationSeconds,
      })
      .eq("id", attempt.id)
      .eq("status", "started");

    if (attemptUpdateError) {
      console.error("Attempt update error:", attemptUpdateError);
      return response({
        error: "تم حفظ المشاركة، لكن تعذر تحديث حالة المحاولة",
      }, 500);
    }

    return response({
      success: true,
      message: "تم استلام مشاركتك وحفظها بنجاح",
      status: "submitted",
      submission_id: submission.id,
      objective_score: objectiveScore,
      ai_score: finalAiScore,
      ai_feedback: finalAiFeedback,
      total_score: finalTotalScore,
      evaluation_status: finalEvaluationStatus,
      evaluation_pending_reason: evaluationResult.reason || null,
      message: finalEvaluationStatus === "evaluated"
        ? "تم استلام المشاركة وتقييم المرافعة آليًا بنجاح."
        : "تم استلام المشاركة، والمرافعة بانتظار استكمال التقييم.",
    });

  } catch (error) {
    console.error("Unexpected error:", error);

    return response({
      error: "حدث خطأ أثناء تسليم المشاركة",
    }, 500);
  }
});
