
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

// تم إيقاف التقييم بالذكاء الاصطناعي مؤقتًا.
// نحتفظ بدالة evaluate-advocacy مستقلة للمستقبل.

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
      .select("id,evaluation_status,total_score,objective_score")
      .eq("attempt_id", attemptId)
      .maybeSingle();

    if (existingError) {
      return response({
        error: "تعذر التحقق من التسليم السابق",
      }, 500);
    }

    // معالجة المشاركة المحفوظة سابقًا دون إنشاء مشاركة مكررة.
    if (existing) {
      const objectiveScore = Number(existing.objective_score || 0);
      const totalScore = objectiveScore + 10;

      const { error: existingUpdateError } = await supabase
        .from("advocacy_submissions")
        .update({
          evaluation_status: "approved",
          total_score: totalScore,
        })
        .eq("id", existing.id);

      if (existingUpdateError) {
        console.error("Existing submission update error:", existingUpdateError);
        return response({
          error: "تعذر تحديث حالة المشاركة السابقة",
        }, 500);
      }

      // تحديث جميع الحقول المطلوبة لقيد حالة المحاولة.
      const startedAt = new Date(attempt.started_at).getTime();

      const durationSeconds = Math.max(
        0,
        Math.floor((Date.now() - startedAt) / 1000),
      );

      const { error: attemptUpdateError } = await supabase
        .from("advocacy_attempts")
        .update({
          status: "submitted",
          completed_at: new Date().toISOString(),
          duration_seconds: durationSeconds,
        })
        .eq("id", attemptId);

      if (attemptUpdateError) {
        console.error("Attempt update error:", attemptUpdateError);
        return response({
          error: "تم حفظ المشاركة، لكن تعذر تحديث حالة المحاولة",
        }, 500);
      }

      return response({
        success: true,
        already_submitted: true,
        submission_id: existing.id,
        status: "submitted",
        evaluation_status: "approved",
        objective_score: objectiveScore,
        advocacy_score: 10,
        total_score: totalScore,
      });
    }

    if (attempt.status !== "started") {
      return response({ error: "سبق تسليم هذه المحاولة" }, 409);
    }

    const { data: stages, error: stagesError } = await supabase
      .from("advocacy_stages")
      .select("id,stage_number,points,stage_type,options")
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

    const startedAt = new Date(attempt.started_at).getTime();

    const durationSeconds = Math.max(
      0,
      Math.floor((Date.now() - startedAt) / 1000),
    );

    // المرافعة تستحق 10 درجات عند استيفاء شروط التسليم.
    const advocacyScore = 10;
    const totalScore = objectiveScore + advocacyScore;

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
        total_score: totalScore,
        evaluation_status: "approved",
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
      advocacy_score: advocacyScore,
      total_score: totalScore,
      evaluation_status: "approved",
    });

  } catch (error) {
    console.error("Unexpected error:", error);

    return response({
      error: "حدث خطأ أثناء تسليم المشاركة",
    }, 500);
  }
});
