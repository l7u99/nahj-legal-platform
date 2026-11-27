
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

    const characterCount = Array.from(finalArgument).length;
    const hasLetter = /\\p{L}/u.test(finalArgument);

    if (characterCount < 200) {
      return response({
        error: "يجب أن تحتوي المرافعة على 200 حرف على الأقل.",
      }, 400);
    }

    if (characterCount > 5000) {
      return response({
        error: "الحد الأعلى للمرافعة هو 5,000 حرف.",
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

    const finalStage = stages.find(
      (stage: any) =>
        stage.stage_type === "written_argument" ||
        Number(stage.stage_number) === 4,
    );
    const multipleChoiceStages = stages.filter(
      (stage: any) => ["multiple_choice", "choice"].includes(stage.stage_type),
    );

    if (!finalStage || multipleChoiceStages.length !== 3) {
      return response({ error: "إعداد مراحل المسابقة غير مكتمل" }, 500);
    }

    // Validate every required stage on the server; client-side checks are not trusted.
    const knownStageIds = new Set(stages.map((stage: any) => stage.id));
    for (const answerId of Object.keys(answers)) {
      if (!knownStageIds.has(answerId)) {
        return response({ error: "تتضمن المشاركة إجابات لمراحل غير معتمدة." }, 400);
      }
    }
    for (const stage of stages) {
      if (stage.id === finalStage.id) continue;
      const answer = answers[stage.id];
      if (["multiple_choice", "choice"].includes(stage.stage_type)) {
        const options = Array.isArray(stage.options) ? stage.options : [];
        const selectedIndex = typeof answer === "number"
          ? answer
          : answer?.selected_option_index ?? answer?.option_index ?? answer?.selectedOptionIndex;
        if (selectedIndex === undefined || selectedIndex === null ||
            !Number.isInteger(Number(selectedIndex)) ||
            Number(selectedIndex) < 0 || Number(selectedIndex) >= options.length) {
          return response({ error: `يرجى تقديم إجابة صحيحة للمرحلة ${stage.stage_number}.` }, 400);
        }
      } else if (typeof answer !== "string" || answer.trim().length < 3) {
        return response({ error: `يرجى كتابة إجابة المرحلة ${stage.stage_number}.` }, 400);
      }
    }

    const stageIds = multipleChoiceStages.map((stage: any) => stage.id);

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

    // Mark the attempt submitted immediately after the durable submission insert.
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
    }

    let evaluationStatus = "pending";
    let aiScore: number | null = null;
    let totalScore: number | null = null;
    let aiFeedback: Record<string, unknown> | null = null;
    let pendingReason = "تم حفظ المشاركة، والتقييم الآلي بانتظار توفر الخدمة أو مراجعة المسؤول.";

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    const monthlyLimit = Number(Deno.env.get("ADVOCACY_AI_MONTHLY_LIMIT") || 0);
    let quotaReserved = false;
    let actualInputTokens = 0;
    let actualOutputTokens = 0;
    let evaluationFailed = false;

    try {
      if (!apiKey || !Number.isInteger(monthlyLimit) || monthlyLimit < 1) {
        throw new Error("Advocacy AI is not configured");
      }

      const { data: caseRow, error: caseError } = await supabase
        .from("advocacy_cases")
        .select("title,description,case_facts")
        .eq("id", attempt.case_id)
        .single();
      if (caseError || !caseRow) throw new Error("Unable to load case context");

      const rubric = [
        { key: "legal_qualification", label: "سلامة التكييف القانوني" },
        { key: "facts_analysis", label: "تحليل الوقائع" },
        { key: "legal_authorities", label: "الاستناد للأنظمة والأسانيد" },
        { key: "evidence_weight", label: "حجية الأدلة" },
        { key: "writing_and_argument", label: "قوة الصياغة والترابط والحجج" },
      ];

      const promptPayload = {
        case: { title: caseRow.title, description: caseRow.description, facts: caseRow.case_facts },
        stages: stages.map((stage: any) => ({
          number: stage.stage_number,
          title: stage.title,
          prompt: stage.prompt,
          answer: answers[stage.id] ?? null,
        })),
        final_argument: finalArgument,
        rubric,
      };

      const systemPrompt = `أنت مقيّم أكاديمي للمرافعات القانونية في مسابقة تدريبية سعودية. قيّم النص وفق الوقائع والمعلومات المتاحة فقط، ولا تخترع مواد نظامية أو سوابق أو وقائع. إذا ذكر المتسابق مادة أو نظامًا ولم تتوفر وسيلة للتحقق، فاذكر أن المرجع يحتاج تحققًا ولا تجزم بصحته. لا تعتبر النص استشارة قانونية ولا تصدر حكمًا قضائيًا. امنح كل معيار درجة من 0 إلى 2، ومجموعًا من 10 يساوي مجموع درجات المعايير. المعايير: سلامة التكييف القانوني، تحليل الوقائع، الاستناد للأنظمة والأسانيد، حجية الأدلة، قوة الصياغة والترابط والحجج. كن منصفًا ومتدرجًا. أعد JSON صالحًا فقط بهذه المفاتيح: criteria (مصفوفة من خمسة عناصر بالترتيب، كل عنصر يحوي key وscore وreason)، total_score، strengths (مصفوفة نصوص)، weaknesses (مصفوفة نصوص)، potential_errors (مصفوفة نصوص)، improvements (مصفوفة نصوص)، overall_feedback. لا تذكر بيانات شخصية.`;

      const requestBody = JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") || "gpt-4o-mini",
        temperature: 0.1,
        max_tokens: 1400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: JSON.stringify(promptPayload) },
        ],
      });
      const estimatedTokens = Math.ceil(requestBody.length / 4) + 1400;
      const { data: allowed, error: quotaError } = await supabase.rpc(
        "reserve_advocacy_ai_evaluation",
        { p_monthly_limit: monthlyLimit, p_estimated_input_tokens: estimatedTokens },
      );
      if (quotaError || allowed !== true) throw new Error("Advocacy AI monthly quota unavailable");
      quotaReserved = true;

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: requestBody,
      });
      const aiResult = await aiResponse.json();
      actualInputTokens = Number(aiResult?.usage?.prompt_tokens || 0);
      actualOutputTokens = Number(aiResult?.usage?.completion_tokens || 0);
      if (!aiResponse.ok) throw new Error(`OpenAI evaluation failed: ${aiResponse.status}`);

      const content = aiResult?.choices?.[0]?.message?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("Empty evaluation");
      const parsed = JSON.parse(content);
      if (!Array.isArray(parsed.criteria) || parsed.criteria.length !== 5) throw new Error("Invalid evaluation criteria");

      const normalizedCriteria = rubric.map((item, index) => {
        const candidate = parsed.criteria[index];
        if (!candidate || candidate.key !== item.key) throw new Error("Evaluation criteria mismatch");
        const score = Number(candidate.score);
        if (!Number.isFinite(score) || score < 0 || score > 2) throw new Error("Invalid criterion score");
        return { key: item.key, label: item.label, score: Math.round(score * 100) / 100, reason: String(candidate.reason || "").slice(0, 1200) };
      });
      aiScore = Math.round(normalizedCriteria.reduce((sum, item) => sum + item.score, 0) * 100) / 100;
      aiFeedback = {
        criteria: normalizedCriteria,
        total_score: aiScore,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 8).map((v: unknown) => String(v).slice(0, 800)) : [],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 8).map((v: unknown) => String(v).slice(0, 800)) : [],
        potential_errors: Array.isArray(parsed.potential_errors) ? parsed.potential_errors.slice(0, 8).map((v: unknown) => String(v).slice(0, 800)) : [],
        improvements: Array.isArray(parsed.improvements) ? parsed.improvements.slice(0, 8).map((v: unknown) => String(v).slice(0, 800)) : [],
        overall_feedback: String(parsed.overall_feedback || "").slice(0, 2000),
        disclaimer: "تقييم تدريبي آلي مساعد، ولا يغني عن المراجعة البشرية أو التحقق من المراجع النظامية.",
      };
      totalScore = Math.round((objectiveScore + aiScore) * 100) / 100;

      const { error: evaluationUpdateError } = await supabase
        .from("advocacy_submissions")
        .update({
          ai_score: aiScore,
          ai_feedback: aiFeedback,
          total_score: totalScore,
          evaluation_status: "evaluated",
          evaluated_at: new Date().toISOString(),
        })
        .eq("id", submission.id);
      if (evaluationUpdateError) throw new Error("Unable to save evaluation");
      evaluationStatus = "evaluated";
      pendingReason = "";
    } catch (evaluationError) {
      evaluationFailed = true;
      console.error("Advocacy AI evaluation deferred:", evaluationError);
    } finally {
      if (quotaReserved) {
        const { error: usageError } = await supabase.rpc("record_advocacy_ai_usage", {
          p_actual_input_tokens: actualInputTokens,
          p_actual_output_tokens: actualOutputTokens,
          p_failed: evaluationFailed,
        });
        if (usageError) console.error("Unable to record advocacy AI usage:", usageError);
      }
    }

    return response({
      success: true,
      status: "submitted",
      submission_id: submission.id,
      objective_score: objectiveScore,
      ai_score: aiScore,
      ai_feedback: aiFeedback,
      total_score: totalScore,
      evaluation_status: evaluationStatus,
      evaluation_pending_reason: pendingReason,
      message: evaluationStatus === "evaluated"
        ? "تم استلام المرافعة وتقييمها آليًا بنجاح."
        : "تم حفظ المشاركة بنجاح، وسيُستكمل تقييم المرافعة عند توفر الخدمة.",
    });

  } catch (error) {
    console.error("Unexpected error:", error);

    return response({
      error: "حدث خطأ أثناء تسليم المشاركة",
    }, 500);
  }
});
