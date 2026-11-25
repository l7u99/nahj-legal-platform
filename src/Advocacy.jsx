import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, ready } from './lib'

export default function Advocacy() {
  const [competition, setCompetition] = useState(null)
  const [stages, setStages] = useState([])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [attemptId, setAttemptId] = useState('')
  const [answers, setAnswers] = useState({})
  const [finalArgument, setFinalArgument] = useState('')
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [result, setResult] = useState(null)

  useEffect(() => {
    async function loadCompetition() {
      if (!ready || !db) {
        setError('تعذر الاتصال بقاعدة البيانات.')
        setLoading(false)
        return
      }

      const { data: cases, error: caseError } = await db
        .from('advocacy_cases')
        .select('id,title,description,case_facts,opens_at,closes_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)

      if (caseError) {
        setError('تعذر تحميل المسابقة: ' + caseError.message)
        setLoading(false)
        return
      }

      if (!cases?.length) {
        setError('لا توجد مسابقة منشورة حاليًا.')
        setLoading(false)
        return
      }

      const currentCase = cases[0]
      const now = Date.now()

      if (
        currentCase.opens_at &&
        now < new Date(currentCase.opens_at).getTime()
      ) {
        setError('لم يبدأ وقت المسابقة بعد.')
        setLoading(false)
        return
      }

      if (
        currentCase.closes_at &&
        now > new Date(currentCase.closes_at).getTime()
      ) {
        setError('انتهى وقت المسابقة.')
        setLoading(false)
        return
      }

      const { data: stageRows, error: stageError } = await db
        .from('advocacy_stages')
        .select('id,stage_number,title,prompt,stage_type,options,points,min_words,max_words,position')
        .eq('case_id', currentCase.id)
        .order('position', { ascending: true })

      if (stageError) {
        setError('تعذر تحميل مراحل المسابقة: ' + stageError.message)
        setLoading(false)
        return
      }

      if (!stageRows?.length) {
        setError('لم تتم إضافة مراحل المسابقة بعد.')
        setLoading(false)
        return
      }

      setCompetition(currentCase)
      setStages(stageRows)
      setLoading(false)
    }

    loadCompetition()
  }, [])

  const validName = name.trim().split(/\s+/).filter(Boolean).length >= 3
  const validPhone = /^05\d{8}$/.test(phone)

  const currentStage = stages[step - 1]

  const isWrittenStage = (stage) =>
    stage && !['multiple_choice', 'choice'].includes(stage.stage_type)

  const isFinalArgumentStage = (stage) =>
    stage && (
      stage.stage_type === 'written_argument' ||
      Number(stage.stage_number) === 4
    )

  const writtenStages = useMemo(
    () => stages.filter(isWrittenStage),
    [stages]
  )

  const allStagesAnswered = stages.every((stage) => {
    if (isFinalArgumentStage(stage)) return true

    const answer = answers[stage.id]

    if (isWrittenStage(stage)) {
      return typeof answer === 'string' && answer.trim().length >= 3
    }

    return answer !== undefined && answer !== null
  })

  async function startAttempt() {
    setError('')
    setSending(true)

    try {
      const { data, error: invokeError } = await db.functions.invoke(
        'start-advocacy-attempt',
        {
          body: {
            case_id: competition.id,
            p_phone: phone,
          },
        }
      )

      if (invokeError) throw invokeError

      if (!data?.attempt_id) {
        throw new Error(data?.error || 'تعذر بدء المحاولة.')
      }

      setAttemptId(data.attempt_id)
      setStep(1)
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء بدء المحاولة.')
    } finally {
      setSending(false)
    }
  }

  function updateAnswer(stageId, value) {
    setAnswers((previous) => ({
      ...previous,
      [stageId]: value,
    }))
  }

  function getOptions(stage) {
    if (Array.isArray(stage.options)) return stage.options

    if (typeof stage.options === 'string') {
      try {
        const parsed = JSON.parse(stage.options)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    }

    return []
  }

  async function submitParticipation() {
    setError('')

    if (!allStagesAnswered) {
      setError('يرجى الإجابة عن جميع المراحل قبل التسليم.')
      return
    }

    const finalText = finalArgument.trim()
    const wordCount = finalText.split(/\s+/).filter(Boolean).length
    const hasLetter = /\p{L}/u.test(finalText)

    if (finalText.length < 200) {
      setError('يجب أن تحتوي المرافعة على 200 حرف على الأقل.')
      return
    }

    if (wordCount > 5000) {
      setError('الحد الأعلى للمرافعة هو 5,000 كلمة.')
      return
    }

    if (!hasLetter) {
      setError('يرجى كتابة مرافعة نصية تحتوي على أحرف.')
      return
    }

    setSending(true)

    try {
      const { data, error: invokeError } = await db.functions.invoke(
        'submit-advocacy',
        {
          body: {
            attempt_id: attemptId,
            full_name: name.trim(),
            answers,
            final_argument: finalText,
          },
        }
      )

      if (invokeError) throw invokeError

      if (!data?.success) {
        throw new Error(data?.error || 'تعذر تسليم المشاركة.')
      }

      setResult(data)
      setStep(stages.length + 2)
    } catch (err) {
      setError(err.message || 'حدث خطأ أثناء تسليم المشاركة.')
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="site">
        <main className="narrow">
          <section className="card">
            <p>جارٍ تحميل المسابقة...</p>
          </section>
        </main>
      </div>
    )
  }

  return (
    <div className="site" dir="rtl">
      <header>
        <Link to="/" className="brand">
          <img
            src={`${import.meta.env.BASE_URL}nahj-logo.png`}
            alt="شعار نهج القانوني"
            style={{
              width: 76,
              height: 76,
              objectFit: 'contain',
              borderRadius: 12,
            }}
          />
          <span>
            نهج القانوني
            <small>المعرفة القانونية تبدأ بسؤال</small>
          </span>
        </Link>

        <nav>
          <Link to="/">الرئيسية</Link>
          <Link to="/archive">أرشيف الأسئلة</Link>
          <Link to="/admin">دخول المسؤولين</Link>
        </nav>
      </header>

      <main className="narrow">
        <section className="hero">
          <small>NAHJ LEGAL · تجربة تفاعلية</small>
          <h1>مرافعة قانونية <i>|</i> مع نهج القانوني</h1>
          <p>حلّل الوقائع، مرّ بالمراحل، ثم قدّم حجتك القانونية.</p>
        </section>

        {error && (
          <div className="note" role="alert" style={{ marginBottom: 16 }}>
            {error}
          </div>
        )}

        {step === 0 && competition && (
          <section className="card form">
            <small className="gold">بيانات المتسابق</small>
            <h2>{competition.title}</h2>
            <p>{competition.description}</p>

            <label>
              الاسم الثلاثي
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="اكتب اسمك الثلاثي"
              />
            </label>

            <label>
              رقم الجوال السعودي
              <input
                value={phone}
                maxLength="10"
                inputMode="numeric"
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
                }
                placeholder="05XXXXXXXX"
              />
            </label>

            <div className="note">
              تأكد من صحة بياناتك قبل بدء المحاولة.
            </div>

            <button
              className="btn"
              type="button"
              disabled={!validName || !validPhone || sending}
              onClick={startAttempt}
            >
              {sending ? 'جارٍ بدء المحاولة...' : 'بدء المسابقة ←'}
            </button>
          </section>
        )}

        {step > 0 && step <= stages.length && currentStage && (
          <section className="card">
            <div className="progress">
              المرحلة {step} من {stages.length}
            </div>

            <small className="gold">
              المرحلة {String(step).padStart(2, '0')}
            </small>

            <h2>{currentStage.title}</h2>

            {competition.case_facts && (
              <div className="note" style={{ whiteSpace: 'pre-wrap' }}>
                <strong>وقائع القضية</strong>
                <p>{competition.case_facts}</p>
              </div>
            )}

            <p style={{ whiteSpace: 'pre-wrap' }}>
              {currentStage.prompt}
            </p>

            {!isFinalArgumentStage(currentStage) &&
              (isWrittenStage(currentStage) ? (
                <label>
                  إجابتك القانونية
                  <textarea
                    rows={7}
                    value={answers[currentStage.id] || ''}
                    onChange={(e) =>
                      updateAnswer(currentStage.id, e.target.value)
                    }
                    placeholder="اكتب تحليلك القانوني..."
                  />
                </label>
              ) : (
                <div className="form">
                  {getOptions(currentStage).map((option, index) => (
                    <label
                      key={index}
                      className="note"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        cursor: 'pointer',
                      }}
                    >
                      <input
                        type="radio"
                        name={`stage-${currentStage.id}`}
                        checked={answers[currentStage.id] === index}
                        onChange={() =>
                          updateAnswer(currentStage.id, index)
                        }
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              ))}

            <div className="actions">
              {step > 1 && (
                <button
                  className="btn secondary"
                  type="button"
                  onClick={() => setStep(step - 1)}
                >
                  → المرحلة السابقة
                </button>
              )}

              <button
                className="btn"
                type="button"
                disabled={
                  !isFinalArgumentStage(currentStage) &&
                  (
                    isWrittenStage(currentStage)
                      ? (answers[currentStage.id] || '').trim().length < 3
                      : answers[currentStage.id] === undefined
                  )
                }
                onClick={() => setStep(step + 1)}
              >
                {step < stages.length
                  ? 'المرحلة التالية ←'
                  : 'الانتقال إلى المرافعة الختامية ←'}
              </button>
            </div>
          </section>
        )}

        {step === stages.length + 1 && (
          <section className="card form">
            <small className="gold">المرافعة الختامية</small>
            <h2>قدّم مرافعتك القانونية</h2>
            <p>
              اجمع دفوعك وتحليلك وطلباتك في مرافعة واضحة ومترابطة.
            </p>

            <label>
              نص المرافعة
              <textarea
                rows={12}
                value={finalArgument}
                onChange={(e) => setFinalArgument(e.target.value)}
                placeholder="بسم الله، وبعد... اكتب مرافعتك القانونية هنا."
              />
            </label>

            <div className="note">
              تأكد من مراجعة إجاباتك ومرافعتك قبل اعتماد المشاركة.
            </div>

            <div className="actions">
              <button
                className="btn secondary"
                type="button"
                onClick={() => setStep(stages.length)}
              >
                → العودة للمرحلة السابقة
              </button>

              <button
                className="btn"
                type="button"
                disabled={
                  sending ||
                  !allStagesAnswered ||
                  finalArgument.trim().length < 200 ||
                  finalArgument.trim().split(/\s+/).filter(Boolean).length > 5000 ||
                  !/\p{L}/u.test(finalArgument)
                }
                onClick={submitParticipation}
              >
                {sending ? 'جارٍ حفظ المشاركة...' : 'اعتماد وتسليم المرافعة'}
              </button>
            </div>
          </section>
        )}

        {result && step === stages.length + 2 && (
          <section className="card">
            <small className="gold">تم استلام المشاركة</small>
            <h2>شكرًا لمشاركتك في نهج القانوني</h2>
            <p>
              تم حفظ إجاباتك ومرافعتك بنجاح.
            </p>

            <div className="note">
              <strong>حالة المشاركة:</strong>
              <p>تم استلام المرافعة بنجاح (submitted).</p>
              <p>
                <strong>درجتك النهائية:</strong> {result.total_score ?? '—'} / 25
              </p>
              <p>
                <strong>درجة المراحل الموضوعية:</strong> {result.objective_score ?? 0} / 15
              </p>
              <p>
                <strong>درجة المرافعة:</strong> 10 / 10
              </p>
            </div>

            <p>رقم المشاركة: {result.submission_id}</p>

            <Link className="btn secondary" to="/">
              العودة للرئيسية
            </Link>
          </section>
        )}

        <Link className="btn secondary" to="/">
          العودة للرئيسية
        </Link>
      </main>

      <footer>© 2026 نهج القانوني · دقيقة قانونية</footer>
    </div>
  )
}
