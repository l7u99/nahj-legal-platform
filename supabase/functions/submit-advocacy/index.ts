
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

    // Automated scoring is intentionally disabled. Submissions remain pending for human review.
    const finalEvaluationStatus = "pending";
    const finalAiScore: number | null = null;
    const finalTotalScore: number | null = null;
    const finalAiFeedback: Record<string, unknown> | null = null;

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
      status: "submitted",
      submission_id: submission.id,
      objective_score: objectiveScore,
      ai_score: finalAiScore,
      ai_feedback: finalAiFeedback,
      total_score: finalTotalScore,
      evaluation_status: finalEvaluationStatus,
      evaluation_pending_reason: "تم حفظ المشاركة، وستُراجع المرافعة بشريًا قبل اعتماد النتائج.",
      message: "تم استلام المشاركة بنجاح، وستُراجع المرافعة بشريًا.",
    });

  } catch (error) {
    console.error("Unexpected error:", error);

    return response({
      error: "حدث خطأ أثناء تسليم المشاركة",
    }, 500);
  }
});
