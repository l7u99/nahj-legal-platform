function content(value) {
    const iterate =
      typeof value === "string" ? undefined : value?.[iteratorKey];
    if (typeof iterate !== "function") {
      return emitBlock(value);
    }

    // Reuse the method from a potentially stateful getter, with its original
    // receiver. The for-of loop closes the iterator if the host rejects a block.
    const blocks = { [iteratorKey]: () => apply(iterate, value, []) };
    for (const block of blocks) {
      emitBlock(block);
    }
  }

// Internal workspace for creating and managing public feedback forms.
export function ImpactSurveyAdmin() {
  const access = useImpactAccess()
  const [session, setSession] = useState(null)
  const [surveys, setSurveys] = useState([])
  const [responses, setResponses] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('meetings')
  const [questions, setQuestions] = useState([
    { prompt: 'كيف تقيّم جودة التجربة بشكل عام؟', type: 'rating', options: '', required: true },
    { prompt: 'ما أكثر جانب أعجبك؟', type: 'text', options: '', required: false },
    { prompt: 'ما الذي تقترح تحسينه؟', type: 'text', options: '', required: false }
  ])
  const [saving, setSaving] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!db) return
    db.auth.getSession().then(({ data }) => setSession(data.session))
  }, [])

  async function loadSurveys() {
    setError('')
    const [surveyResult, responseResult] = await Promise.all([
      db.from('impact_surveys').select('id,title,description,category,status,public_token,created_at').order('created_at', { ascending: false }).limit(200),
      db.from('impact_survey_responses').select('id,survey_id,submitted_at').order('submitted_at', { ascending: false }).limit(3000)
    ])
    if (surveyResult.error || responseResult.error) {
      setError('تعذر تحميل الاستبيانات. تحققي من صلاحية عضوية الفريق ثم أعيدي المحاولة.')
      setSurveys([])
      setResponses([])
      return
    }
    setSurveys(surveyResult.data || [])
    setResponses(responseResult.data || [])
  }

  useEffect(() => {
    if (access.allowed) loadSurveys()
  }, [access.allowed])

  function updateQuestion(index, key, value) {
    setQuestions(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }

  async function createSurvey(event) {
    event.preventDefault()
    if (!session?.user?.id || saving) return
    if (!title.trim() || !questions.length || questions.some(item => !item.prompt.trim())) {
      setError('أكملي عنوان الاستبيان ونصوص جميع الأسئلة.')
      return
    }
    setSaving(true)
    setError('')
    setNotice('')
    const { data: survey, error: surveyError } = await db.from('impact_surveys').insert({
      title: title.trim(), description: description.trim(), category, created_by: session.user.id, status: 'draft'
    }).select('id,public_token').single()
    if (surveyError || !survey) {
      setError('تعذر إنشاء الاستبيان. تحققي من صلاحيات الحساب.')
      setSaving(false)
      return
    }
    const questionRows = questions.map((item, index) => ({
      survey_id: survey.id,
      prompt: item.prompt.trim(),
      question_type: item.type,
      options: item.type === 'choice' ? item.options.split(',').map(value => value.trim()).filter(Boolean) : [],
      is_required: item.required,
      position: index + 1
    }))
    const { error: questionsError } = await db.from('impact_survey_questions').insert(questionRows)
    if (questionsError) {
      setError('تم إنشاء الاستبيان كمسودة، لكن تعذرت إضافة الأسئلة. يمكنك إعادة المحاولة بعد مراجعة النموذج.')
    } else {
      setTitle('')
      setDescription('')
      setCategory('meetings')
      setQuestions([
        { prompt: 'كيف تقيّم جودة التجربة بشكل عام؟', type: 'rating', options: '', required: true },
        { prompt: 'ما أكثر جانب أعجبك؟', type: 'text', options: '', required: false },
        { prompt: 'ما الذي تقترح تحسينه؟', type: 'text', options: '', required: false }
      ])
      setNotice('تم إنشاء الاستبيان كمسودة. راجعيه ثم انشريه عند الجاهزية.')
      await loadSurveys()
    }
    setSaving(false)
  }

  async function setSurveyStatus(survey, status) {
    setBusyId(survey.id)
    setError('')
    setNotice('')
    if (status === 'published') {
      const { count, error: countError } = await db.from('impact_survey_questions').select('id', { count: 'exact', head: true }).eq('survey_id', survey.id)
      if (countError || !count) {
        setError('أضيفي سؤالًا واحدًا على الأقل قبل نشر الاستبيان.')
        setBusyId('')
        return
      }
    }
    const { error: updateError } = await db.from('impact_surveys')
      .update({ status, updated_at: new Date().toISOString() }).eq('id', survey.id)
    if (updateError) setError('تعذر تحديث حالة الاستبيان.')
    else {
      setNotice(status === 'published' ? 'تم نشر الاستبيان وأصبح رابطه متاحًا.' : status === 'closed' ? 'تم إغلاق استقبال الردود.' : 'تمت إعادة الاستبيان إلى المسودات.')
      await loadSurveys()
    }
    setBusyId('')
  }

  async function copySurveyLink(survey) {
    const url = window.location.origin + '/rate/' + survey.public_token
    try {
      await navigator.clipboard.writeText(url)
      setNotice('تم نسخ رابط التقييم.')
    } catch {
      setNotice(url)
    }
  }

  if (!access.allowed) return <ImpactAccessNotice loading={access.loading} />

  return (
    <main className="impact-page athar-survey-admin">
      <div className="impact-breadcrumb"><Link to="/">الرئيسية</Link><span>/</span><Link to="/impact">أثَر</Link><span>/</span><b>إدارة الاستبيانات</b></div>
      <section className="athar-subpage-heading">
        <div><span className="eyebrow">ATHAR · SURVEY MANAGEMENT</span><h1>إدارة <em>الاستبيانات</em></h1><p>أنشئي نماذج التقييم، وانشري رابطًا مستقلًا لكل فعالية، وتابعي الردود من لوحة أثَر.</p></div>
        <Link className="impact-outline-btn" to="/impact">العودة إلى لوحة المؤشرات ←</Link>
      </section>

      {error && <div className="impact-error" role="alert">{error}</div>}
      {notice && <div className="impact-inline-notice" role="status">{notice}</div>}

      <section className="athar-survey-layout">
        <form className="athar-panel athar-survey-builder" onSubmit={createSurvey}>
          <div className="athar-panel-heading"><div><span className="eyebrow">CREATE A FORM</span><h2>إنشاء استبيان جديد</h2></div><span className="athar-step-number">01</span></div>
          <label>عنوان الاستبيان<input value={title} onChange={event => setTitle(event.target.value)} maxLength="180" placeholder="مثال: تقييم لقاء التطوير القانوني" required /></label>
          <label>وصف مختصر<textarea value={description} onChange={event => setDescription(event.target.value)} rows="2" placeholder="وضّحي للمشارك الغرض من التقييم…" /></label>
          <label>مجال التقييم<select value={category} onChange={event => setCategory(event.target.value)}><option value="meetings">اللقاءات والفعاليات</option><option value="partners">الشراكات</option><option value="teams">الفرق والأعضاء</option><option value="general">تقييم عام</option></select></label>
          <div className="athar-question-builder-head"><h3>أسئلة الاستبيان</h3><button type="button" className="impact-outline-btn" onClick={() => setQuestions(current => [...current, { prompt: '', type: 'rating', options: '', required: true }])}>+ إضافة سؤال</button></div>
          {questions.map((question, index) => <div className="athar-question-editor" key={index}>
            <div className="athar-question-editor-title"><b>السؤال {index + 1}</b>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, i) => i !== index))}>حذف</button>}</div>
            <input value={question.prompt} onChange={event => updateQuestion(index, 'prompt', event.target.value)} placeholder="اكتبي السؤال هنا" maxLength="500" required />
            <div className="athar-question-editor-options">
              <select value={question.type} onChange={event => updateQuestion(index, 'type', event.target.value)}><option value="rating">تقييم من 1 إلى 5</option><option value="choice">اختيار من متعدد</option><option value="text">إجابة نصية</option></select>
              <label className="athar-required-toggle"><input type="checkbox" checked={question.required} onChange={event => updateQuestion(index, 'required', event.target.checked)} /> إلزامي</label>
            </div>
            {question.type === 'choice' && <input value={question.options} onChange={event => updateQuestion(index, 'options', event.target.value)} placeholder="الخيارات مفصولة بفاصلة" required />}
          </div>)}
          <button className="impact-primary-btn athar-create-button" type="submit" disabled={saving}>{saving ? 'جارٍ إنشاء الاستبيان…' : 'حفظ الاستبيان كمسودة'}</button>
          <small className="athar-form-hint">لن يُنشر الاستبيان تلقائيًا. راجعيه أولًا ثم اختاري «نشر» من قائمة الاستبيانات.</small>
        </form>

        <section className="athar-panel athar-survey-list-panel">
          <div className="athar-panel-heading"><div><span className="eyebrow">YOUR SURVEYS</span><h2>الاستبيانات المنشأة</h2></div><span className="athar-count-pill">{surveys.length} استبيان</span></div>
          {surveys.length ? <div className="athar-survey-list">{surveys.map(survey => {
            const responseCount = responses.filter(row => row.survey_id === survey.id).length
            const statusLabel = survey.status === 'published' ? 'منشور' : survey.status === 'closed' ? 'مغلق' : 'مسودة'
            return <article className="athar-survey-row" key={survey.id}>
              <div className="athar-survey-row-top"><span className={'athar-survey-status ' + survey.status}>{statusLabel}</span><small>{categoryLabels[survey.category] || 'عام'}</small></div>
              <h3>{survey.title}</h3><p>{survey.description || 'لا يوجد وصف مضاف.'}</p>
              <div className="athar-survey-row-meta"><b>{responseCount.toLocaleString('ar-SA')} استجابة</b><small>{new Date(survey.created_at).toLocaleDateString('ar-SA')}</small></div>
              <div className="athar-survey-row-actions">
                {survey.status === 'draft' && <button className="impact-primary-btn" type="button" disabled={busyId === survey.id} onClick={() => setSurveyStatus(survey, 'published')}>نشر الاستبيان</button>}
                {survey.status === 'published' && <button className="impact-outline-btn" type="button" disabled={busyId === survey.id} onClick={() => setSurveyStatus(survey, 'closed')}>إغلاق الردود</button>}
                {survey.status === 'closed' && <button className="impact-outline-btn" type="button" disabled={busyId === survey.id} onClick={() => setSurveyStatus(survey, 'published')}>إعادة النشر</button>}
                {survey.status === 'published' && <button className="impact-outline-btn" type="button" onClick={() => copySurveyLink(survey)}>نسخ رابط التقييم</button>}
              </div>
            </article>
          })}</div> : <div className="athar-empty-state"><span>✧</span><h3>لا توجد استبيانات حتى الآن</h3><p>ابدئي بإنشاء أول استبيان من النموذج المقابل، وستظهر جميع الاستبيانات هنا.</p></div>}
        </section>
      </section>
    </main>
  )
}

const categoryLabels = { meetings: 'اللقاءات والفعاليات', partners: 'الشراكات', teams: 'الفرق والأعضاء', general: 'تقييم عام' }

export function ImpactSurveyPublic({ token }) {
  const [survey, setSurvey] = useState(null)
  const [answers, setAnswers] = useState({})
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  useEffect(() => {
    let alive = true
    async function loadSurvey() {
      setLoading(true)
      setError('')
      const { data, error: loadError } = await db.rpc('get_public_impact_survey', { p_token: token })
      if (!alive) return
      if (loadError || !data) {
        setSurvey(null)
        setError('هذا الرابط غير متاح حاليًا. قد يكون الاستبيان مغلقًا أو انتهت مدته.')
      } else {
        setSurvey(data)
      }
      setLoading(false)
    }
    if (token) loadSurvey()
    else { setError('رابط التقييم غير مكتمل.'); setLoading(false) }
    return () => { alive = false }
  }, [token])

  async function submit(event) {
    event.preventDefault()
    if (!survey || submitting) return
    const missing = survey.questions.find(question => question.is_required && (answers[question.id] === undefined || answers[question.id] === ''))
    if (missing) {
      setError('فضلاً أجيبي عن السؤال: ' + missing.prompt)
      return
    }
    setSubmitting(true)
    setError('')
    const { error: submitError } = await db.rpc('submit_impact_survey', { p_token: token, p_answers: answers })
    if (submitError) setError('تعذر إرسال التقييم. قد يكون الرابط أُغلق للتو؛ حدّثي الصفحة وحاولي مرة أخرى.')
    else setSubmitted(true)
    setSubmitting(false)
  }

  return (
    <main className="impact-page athar-public-survey">
      <div className="athar-public-brand"><span>أثَــر</span><small>NAHJ LEGAL · FEEDBACK PORTAL</small></div>
      {loading ? <section className="athar-public-card center"><div className="athar-loading-mark">✧</div><h1>جارٍ تجهيز نموذج التقييم</h1><p>لحظات ونكون جاهزين.</p></section> :
        submitted ? <section className="athar-public-card center"><div className="athar-success-mark">✓</div><span className="eyebrow">RESPONSE RECEIVED</span><h1>شكرًا لمشاركتك</h1><p>وصل تقييمك بنجاح، ويساعدنا رأيك على تطوير التجربة وتحسين أثرها.</p></section> :
        survey ? <form className="athar-public-card" onSubmit={submit}>
          <span className="eyebrow">{categoryLabels[survey.category] || 'تقييم أثَر'}</span>
          <h1>{survey.title}</h1><p className="athar-public-description">{survey.description || 'نقدّر وقتك ومشاركتك. تساعدنا إجاباتك على تحسين التجربة.'}</p>
          <div className="athar-public-progress"><span>{survey.questions.length} أسئلة</span><span>الوقت المتوقع: دقيقتان</span></div>
          {survey.questions.map((question, index) => <section className="athar-public-question" key={question.id}>
            <label><b>{index + 1}. {question.prompt}</b>{question.is_required && <em>*</em>}</label>
            {question.question_type === 'rating' && <div className="athar-rating-options" role="radiogroup" aria-label={question.prompt}>
              {[1,2,3,4,5].map(value => <button key={value} type="button" className={Number(answers[question.id]) === value ? 'selected' : ''} onClick={() => setAnswers(current => ({ ...current, [question.id]: value }))}>{value}<small>{value === 1 ? 'ضعيف' : value === 5 ? 'ممتاز' : ''}</small></button>)}
            </div>}
            {question.question_type === 'choice' && <div className="athar-choice-options">{(question.options || []).map(option => <label key={option}><input type="radio" name={question.id} checked={answers[question.id] === option} onChange={() => setAnswers(current => ({ ...current, [question.id]: option }))} />{option}</label>)}</div>}
            {question.question_type === 'text' && <textarea rows="3" maxLength="2000" value={answers[question.id] || ''} onChange={event => setAnswers(current => ({ ...current, [question.id]: event.target.value }))} placeholder="اكتبي إجابتك هنا…" />}
          </section>)}
          {error && <div className="impact-error" role="alert">{error}</div>}
          <button className="impact-primary-btn athar-submit-response" type="submit" disabled={submitting}>{submitting ? 'جارٍ إرسال التقييم…' : 'إرسال التقييم'}</button>
          <small className="athar-privacy-note">إجاباتك تُستخدم لتحسين جودة المبادرات وقياس أثرها. لا تتضمن هذه الصفحة وصولًا إلى بيانات المنظومة الداخلية.</small>
        </form> :
        <section className="athar-public-card center"><div className="athar-loading-mark">!</div><h1>نموذج التقييم غير متاح</h1><p>{error || 'تحققي من الرابط أو تواصلي مع فريق نهج.'}</p></section>}
    </main>
  )
}
