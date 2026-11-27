import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db } from './lib'

function useImpactAccess() {
  const [access, setAccess] = useState({ loading: true, allowed: false })
  useEffect(() => {
    if (!db) {
      setAccess({ loading: false, allowed: false })
      return
    }
    let alive = true
    async function check() {
      const { data: sessionData } = await db.auth.getSession()
      const session = sessionData?.session
      if (!session?.user?.id) {
        if (alive) setAccess({ loading: false, allowed: false })
        return
      }
      const { data, error } = await db.rpc('is_active_impact_member')
      if (alive) setAccess({ loading: false, allowed: !error && data === true })
    }
    check()
    const { data: { subscription } } = db.auth.onAuthStateChange(() => check())
    return () => { alive = false; subscription.unsubscribe() }
  }, [])
  return access
}

function ImpactAccessNotice({ loading }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function login(event) {
    event.preventDefault()
    if (submitting || !username.trim() || !password) return
    setSubmitting(true)
    setError('')
    try {
      const { data, error: loginError } = await db.functions.invoke('admin-login', {
        body: { username: username.trim(), password }
      })
      if (loginError || !data?.access_token || !data?.refresh_token) {
        throw new Error('بيانات الدخول غير صحيحة أو أن الحساب غير معتمد.')
      }
      const { error: sessionError } = await db.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token
      })
      if (sessionError) throw new Error('تعذر إنشاء جلسة الدخول. حاولي مرة أخرى.')
    } catch (err) {
      setError(err.message || 'تعذر تسجيل الدخول. حاولي مرة أخرى.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="impact-page">
      <div className="impact-chat-card center">
        <span className="eyebrow">NAHJ · MEMBERS ACCESS</span>
        <h1>{loading ? 'جارٍ التحقق من صلاحية الدخول…' : 'دخول منظومة نهج'}</h1>
        <p>{loading ? 'لحظة من فضلك.' : 'استخدمي اسم المستخدم وكلمة المرور نفسيهما المستخدمين لدخول لوحة الإدارة. الدخول متاح للأعضاء المعتمدين فقط.'}</p>
        {!loading && (
          <form className="form impact-member-login" onSubmit={login}>
            <label>
              اسم المستخدم
              <input value={username} onChange={event => setUsername(event.target.value)} autoComplete="username" required />
            </label>
            <label>
              كلمة المرور
              <input type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" required />
            </label>
            {error && <div className="impact-error" role="alert">{error}</div>}
            <button className="btn" type="submit" disabled={submitting || !username.trim() || !password}>
              {submitting ? 'جارٍ تسجيل الدخول…' : 'دخول المنظومة ←'}
            </button>
          </form>
        )}
        <p className="muted">تُستخدم بيانات دخول الإدارة نفسها، ولا يلزم إنشاء حساب منفصل.</p>
      </div>
    </main>
  )
}

const portalInfo = {
  meetings: {
    eyebrow: 'قياس جودة اللقاءات',
    title: 'بوابة تقييم اللقاءات',
    subtitle: 'حوّل كل لقاء إلى فرصة قابلة للقياس والتحسين.',
    description: 'قياس وضوح الهدف، جودة التنظيم، تفاعل الحضور، تحقق المخرجات، ومدى ارتباط اللقاء باحتياج المستفيد.',
    starters: ['ما نوع اللقاء وموضوعه؟', 'ما الهدف الذي عُقد اللقاء من أجله؟', 'من الفئة المستهدفة؟']
  },
  partners: {
    eyebrow: 'قياس قيمة الشراكات',
    title: 'بوابة تقييم الشركاء',
    subtitle: 'افهم قيمة الشراكة وأثرها، وليس مجرد عدد الأنشطة.',
    description: 'تحليل مساهمة الشريك، الالتزام، جودة التعاون، النتائج المشتركة، وفرص تطوير العلاقة.',
    starters: ['من هو الشريك وما مجال التعاون؟', 'ما الأهداف المشتركة بين الطرفين؟', 'ما المساهمات التي قدمها كل طرف؟']
  },
  teams: {
    eyebrow: 'قياس أداء الفرق والأعضاء',
    title: 'بوابة تقييم الفرق والأعضاء',
    subtitle: 'قياس الأداء بروح التطوير والتمكين.',
    description: 'مراجعة وضوح الأدوار، الإنجاز، التعاون، المبادرة، الالتزام، والاحتياج إلى الدعم والتطوير.',
    starters: ['ما اسم الفريق أو المبادرة؟', 'ما الأدوار والمسؤوليات المحددة؟', 'ما أبرز الأعمال المنجزة خلال الفترة؟']
  }
}

const portalCards = [
  { id: 'meetings', number: '01', title: 'تقييم اللقاءات', desc: 'هل حقق اللقاء هدفه؟ وهل أجاب عن احتياج الحضور؟', icon: '◷', tags: ['الأهداف', 'التفاعل', 'المخرجات'] },
  { id: 'partners', number: '02', title: 'تقييم الشركاء', desc: 'قياس جودة التعاون والقيمة المضافة والأثر المشترك.', icon: '◇', tags: ['المساهمة', 'الالتزام', 'الأثر'] },
  { id: 'teams', number: '03', title: 'تقييم الفرق والأعضاء', desc: 'قراءة الأداء والإنجاز والتعاون وفرص التطوير.', icon: '◎', tags: ['الأداء', 'الأدوار', 'التطوير'] }
]

export function ImpactHome() {
  const access = useImpactAccess()
  const [reports, setReports] = useState([])
  const [surveys, setSurveys] = useState([])
  const [responses, setResponses] = useState([])
  const [questions, setQuestions] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  useEffect(() => {
    if (!access.allowed || !db) return
    let alive = true
    async function loadDashboard() {
      setLoading(true); setLoadError('')
      const [reportResult, surveyResult, responseResult, questionResult] = await Promise.all([
        db.from('impact_assessments').select('id,portal,title,status,created_at').order('created_at', { ascending: false }).limit(500),
        db.from('impact_surveys').select('id,title,status,category,public_token,created_at').order('created_at', { ascending: false }).limit(250),
        db.from('impact_survey_responses').select('id,survey_id,answers,submitted_at').order('submitted_at', { ascending: false }).limit(2000),
        db.from('impact_survey_questions').select('id,survey_id,question_type')
      ])
      if (!alive) return
      if (reportResult.error || surveyResult.error || responseResult.error || questionResult.error) setLoadError('تعذر تحديث بعض البيانات. بقيت لوحة المؤشرات ظاهرة، ويمكن إعادة المحاولة.')
      setReports(reportResult.data || []); setSurveys(surveyResult.data || [])
      setResponses(responseResult.data || []); setQuestions(questionResult.data || [])
      setLoading(false)
    }
    loadDashboard()
    return () => { alive = false }
  }, [access.allowed])
  if (!access.allowed) return <ImpactAccessNotice loading={access.loading} />
  const activeSurveys = surveys.filter(item => item.status === 'published').length
  const reviewed = reports.filter(item => item.status === 'reviewed').length
  const draft = reports.filter(item => item.status === 'draft').length
  const ratingQuestionIds = new Set(questions.filter(item => item.question_type === 'rating').map(item => item.id))
  const ratingValues = responses.flatMap(row => Object.entries(row.answers || {}).filter(([id, value]) => ratingQuestionIds.has(id) && Number.isFinite(Number(value))).map(([, value]) => Number(value)))
  const averageRating = ratingValues.length ? (ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(1) : '—'
  const categoryLabels = { meetings: 'اللقاءات', partners: 'الشراكات', teams: 'الفرق', general: 'عام' }
  const categoryRows = ['meetings','partners','teams','general'].map(category => ({ category, label: categoryLabels[category], total: surveys.filter(s => s.category === category).length, replies: responses.filter(r => surveys.some(s => s.id === r.survey_id && s.category === category)).length }))
  const monthly = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5-index)); return { key: date.getFullYear()+'-'+date.getMonth(), label: date.toLocaleDateString('ar-SA',{month:'short'}), total: responses.filter(row => { const d = new Date(row.submitted_at); return d.getFullYear()===date.getFullYear() && d.getMonth()===date.getMonth() }).length } })
  const maxMonthly = Math.max(1, ...monthly.map(item => item.total))
  const dimensions = [['المؤسسية','الحوكمة والسياسات والتوثيق'],['التشغيلية','كفاءة التنفيذ واستمرارية العمليات'],['المعرفية','نقل المعرفة وحفظ الخبرات'],['الشراكات','جودة التعاون والقيمة المشتركة'],['التطويرية','التعلم والتحسين وقياس التقدم']]
  return (
    <main className="impact-page athar-dashboard">
      <div className="impact-breadcrumb"><Link to="/">الرئيسية</Link><span>/</span><b>أثَر · لوحة المؤشرات</b></div>
      <section className="athar-dashboard-hero"><div><span className="eyebrow">NAHJ LEGAL · IMPACT & SUSTAINABILITY</span><h1>لوحة <em>أثَر</em></h1><p>رؤية موحّدة لنتائج المبادرات، جودة التجربة، واستدامة الأثر. جميع المؤشرات تُبنى على الردود والتقارير المسجلة فعليًا.</p><div className="athar-dashboard-actions"><Link className="impact-primary" to="/admin/impact/surveys">إدارة الاستبيانات <span>←</span></Link><Link className="impact-outline-btn" to="/admin/impact">سجل التقارير <span>←</span></Link></div></div><div className="athar-dashboard-mark"><span>أثَر</span><small>MEASURE · ANALYZE · IMPROVE</small><i>✧</i></div></section>
      {loadError && <div className="impact-inline-notice" role="status">{loadError}</div>}
      <section className="athar-kpi-grid">
        <article className="athar-kpi"><span>إجمالي الاستجابات</span><strong>{loading?'—':responses.length.toLocaleString('ar-SA')}</strong><small>ردود الحضور والمشاركين</small><i>↗</i></article>
        <article className="athar-kpi"><span>الاستبيانات النشطة</span><strong>{loading?'—':activeSurveys.toLocaleString('ar-SA')}</strong><small>روابط تستقبل التقييمات</small><i>◉</i></article>
        <article className="athar-kpi"><span>متوسط التقييم</span><strong>{loading?'—':averageRating}{averageRating!=='—'?' / 5':''}</strong><small>{ratingValues.length.toLocaleString('ar-SA')} إجابة تقييمية</small><i>☆</i></article>
        <article className="athar-kpi"><span>تقارير الأثر</span><strong>{loading?'—':reports.length.toLocaleString('ar-SA')}</strong><small>{reviewed} مراجَع · {draft} مسودة</small><i>▤</i></article>
      </section>
      <section className="athar-dashboard-section-head"><div><span className="eyebrow">PERFORMANCE OVERVIEW</span><h2>قراءة الأداء</h2></div><span className="athar-data-note"><i /> بيانات فعلية · تتحدث مع كل استجابة</span></section>
      <section className="athar-analytics-grid">
        <article className="athar-panel athar-trend-panel"><div className="athar-panel-heading"><div><span className="eyebrow">RESPONSE TREND</span><h3>حركة الاستجابات</h3></div><span className="athar-panel-unit">آخر 6 أشهر</span></div><div className="athar-bar-chart">{monthly.map(item=><div className="athar-bar-column" key={item.key}><strong>{loading?'—':item.total}</strong><div className="athar-bar-track"><i style={{height:loading?'0%':(item.total/maxMonthly*100)+'%'}} /></div><small>{item.label}</small></div>)}</div>{!loading&&responses.length===0&&<div className="athar-chart-empty">سيظهر النشاط هنا عند وصول أول استجابة.</div>}</article>
        <article className="athar-panel"><div className="athar-panel-heading"><div><span className="eyebrow">SURVEY DISTRIBUTION</span><h3>التقييم حسب المجال</h3></div></div><div className="athar-category-list">{categoryRows.map(item=><div className="athar-category-row" key={item.category}><div><b>{item.label}</b><small>{item.total} استبيان · {item.replies} استجابة</small></div><strong>{item.replies.toLocaleString('ar-SA')}</strong><span><i style={{width:(responses.length?item.replies/responses.length*100:0)+'%'}} /></span></div>)}</div>{!loading&&surveys.length===0&&<div className="athar-chart-empty">لم تُنشأ استبيانات بعد. ابدئي بإنشاء أول استبيان.</div>}</article>
      </section>
      <section className="athar-dashboard-section-head"><div><span className="eyebrow">SUSTAINABILITY FRAMEWORK</span><h2>أبعاد الاستدامة</h2></div><span className="athar-panel-unit">نموذج قياس من 5 أبعاد</span></section>
      <section className="athar-sustainability-grid">{dimensions.map(([name,description],index)=><article className="athar-dimension-card" key={name}><div><b>0{index+1}</b><span>0%</span></div><h3>{name}</h3><p>{description}</p><div className="athar-dimension-track"><i style={{width:'0%'}} /></div><small>بانتظار بيانات القياس</small></article>)}</section>
      <section className="athar-next-step"><div><span className="eyebrow">START MEASURING</span><h2>{surveys.length?'تابعي قياس الأثر وتطويره':'ابدئي بأول خطوة نحو قياس الأثر'}</h2><p>أنشئي استبيانًا، شاركي رابطه مع الحضور، وستظهر النتائج تلقائيًا هنا دون إدخال يدوي.</p></div><Link className="impact-primary" to="/admin/impact/surveys">إنشاء استبيان جديد ←</Link></section>
    </main>
  )
}

export function ImpactPortal({ portal: requestedPortal }) {
  const access = useImpactAccess()
  const portal = portalInfo[requestedPortal] ? requestedPortal : 'meetings'
  const info = portalInfo[portal]
  const [messages, setMessages] = useState([])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [session, setSession] = useState(null)
  const [report, setReport] = useState(null)
  const [generatingReport, setGeneratingReport] = useState(false)
  const [savingReport, setSavingReport] = useState(false)
  const [savedReportId, setSavedReportId] = useState(null)
  const [reportNotice, setReportNotice] = useState('')
  useEffect(() => {
    if (!db) return
    db.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, current) => setSession(current))
    return () => subscription.unsubscribe()
  }, [])
  const conversation = useMemo(() => messages.length ? messages : [
    { role: 'assistant', content: `مرحبًا بك في ${info?.title || 'بوابة قياس الأثر'}. سأرافقك خطوة بخطوة لفهم الحالة وقياسها. لنبدأ: ${info?.starters?.[0] || 'ما المجال الذي ترغب في قياس أثره؟'}` }
  ], [messages, info])

  if (!access.allowed) return <ImpactAccessNotice loading={access.loading} />
  if (!info) return <main className="impact-page"><div className="impact-chat-card"><h1>البوابة غير موجودة</h1><Link to="/impact">العودة إلى المنظومة</Link></div></main>

  async function sendMessage(event) {
    event.preventDefault()
    const content = draft.trim()
    if (!session?.access_token) {
      setError('سجّلي دخولك بحساب مسؤول نشط لاستخدام مساعد أثَر.')
      return
    }
    if (!content || busy) return
    const nextMessages = [...messages, { role: 'user', content }]
    setMessages(nextMessages)
    setDraft('')
    setBusy(true)
    setError('')
    try {
      const { data, error: invokeError } = await db.functions.invoke('impact-assistant', {
        body: { portal, messages: nextMessages }
      })
      if (invokeError || !data?.reply) throw new Error(data?.error || invokeError?.message || 'تعذر الحصول على رد المساعد.')
      setMessages([...nextMessages, { role: 'assistant', content: data.reply }])
    } catch (err) {
      setError(err.message || 'تعذر الاتصال بالمساعد. حاول مرة أخرى.')
      setMessages(nextMessages)
    } finally {
      setBusy(false)
    }
  }

  async function generateReport() {
    if (!session?.access_token) {
      setError('سجّلي دخولك بحساب مسؤول نشط لإعداد تقرير الأثر.')
      return
    }
    if (generatingReport || busy || messages.filter(message => message.role === 'user').length < 2 || messages[messages.length - 1]?.role !== 'assistant') return
    setGeneratingReport(true)
    setError('')
    setReportNotice('')
    setReport(null)
    setSavedReportId(null)
    try {
      const { data, error: invokeError } = await db.functions.invoke('impact-assistant', {
        body: { portal, mode: 'report', messages }
      })
      if (invokeError || !data?.report) throw new Error(data?.error || invokeError?.message || 'تعذر إنشاء التقرير.')
      setReport(data.report)
    } catch (err) {
      setError(err.message || 'تعذر إنشاء التقرير.')
    } finally {
      setGeneratingReport(false)
    }
  }

  async function saveReport() {
    if (!session?.user?.id || !report || savingReport) return
    setSavingReport(true)
    setError('')
    setReportNotice('')
    const { data, error: saveError } = await db.from('impact_assessments').insert({
      portal,
      title: String(report.title || info.title).slice(0, 180),
      report,
      created_by: session.user.id,
      status: 'draft'
    }).select('id').single()
    if (saveError) {
      setError('تعذر حفظ التقرير. تأكدي من تطبيق ترحيل قاعدة البيانات وصلاحية المسؤول.')
    } else {
      setSavedReportId(data.id)
      setReportNotice('تم حفظ التقرير في سجلات منظومة نهج.')
    }
    setSavingReport(false)
  }

  function resetConversation() {
    setMessages([])
    setDraft('')
    setError('')
    setReport(null)
    setSavedReportId(null)
    setReportNotice('')
  }

  return (
    <main className="impact-page impact-portal-page">
      <div className="impact-breadcrumb"><Link to="/">الرئيسية</Link><span>/</span><Link to="/impact">منظومة الأثر والاستدامة</Link><span>/</span><b>{info.title}</b></div>
      <section className="impact-portal-heading">
        <span className="eyebrow">{info.eyebrow}</span>
        <h1>{info.title}</h1>
        <p>{info.subtitle}</p>
        <div className="impact-portal-desc">{info.description}</div>
      </section>
      <section className="impact-chat-layout">
        <aside className="impact-guide">
          <div className="guide-icon">✧</div>
          <span className="eyebrow">NAHJ AI GUIDE</span>
          <h2>مساعد نهج الذكي</h2>
          <p>مساعد تفاعلي يطرح سؤالًا واحدًا في كل مرة، ويطلب التوضيح عند الحاجة، ثم يبني معك قراءة أولية للنتائج.</p>
          {!session && <div className="note">استخدام مساعد أثَر وحفظ التقارير متاحان للمسؤولين النشطين فقط. <Link to="/admin">دخول المسؤولين ←</Link></div>}
          <div className="guide-points"><span>✓ أسئلة متدرجة</span><span>✓ تحليل مرتبط بالسياق</span><span>✓ فرص تحسين عملية</span></div>
          <button type="button" className="impact-reset" onClick={resetConversation} disabled={busy || generatingReport}>بدء تقييم جديد ↻</button>
          <small>لا تدخل بيانات شخصية أو معلومات سرية.</small>
        </aside>
        <div className="impact-chat-card">
          <div className="chat-head"><div><span className="chat-status" /><strong>جلسة قياس جديدة</strong><small>المساعد متاح عند الطلب</small></div><span className="chat-ai">AI</span></div>
          <div className="chat-messages">
            {conversation.map((message, index) => <div className={`chat-message ${message.role}`} key={index}><span>{message.role === 'assistant' ? 'نهج' : 'أنت'}</span><p>{message.content}</p></div>)}
            {busy && <div className="chat-message assistant"><span>نهج</span><p className="typing">أراجع إجابتك وأجهز الخطوة التالية…</p></div>}
          </div>
          {error && <div className="impact-error">{error}</div>}
          {session?.access_token ? (
            <form className="chat-compose" onSubmit={sendMessage}>
              <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="اكتب إجابتك هنا…" rows="2" maxLength="3000" disabled={busy} />
              <button type="submit" disabled={busy || !draft.trim()}>{busy ? '...' : 'إرسال ←'}</button>
            </form>
          ) : (
            <div className="note impact-auth-required">يلزم تسجيل الدخول بحساب مسؤول نشط قبل بدء جلسة قياس الأثر. <Link to="/admin">تسجيل الدخول ←</Link></div>
          )}
          <div className="chat-foot">تُرسل الرسالة عند الضغط على «إرسال» فقط · راجع المخرجات قبل اعتماد أي قرار</div>
          <div className="impact-report-actions">
            <button type="button" className="impact-outline-btn" onClick={generateReport} disabled={!session?.access_token || generatingReport || busy || messages.filter(message => message.role === 'user').length < 2 || messages[messages.length - 1]?.role !== 'assistant'}>
              {generatingReport ? 'جارٍ إعداد التقرير…' : 'إعداد تقرير الأثر'}
            </button>
            <small>يتاح بعد إجابتين على الأقل واكتمال رد المساعد، ويُنشأ عند الطلب فقط.</small>
          </div>
          {report && <section className="impact-report" id="impact-report">
            <div className="impact-report-head"><span className="eyebrow">NAHJ · IMPACT REPORT</span><h2>{report.title}</h2><p>{report.executive_summary}</p></div>
            <div className="impact-report-section"><h3>سياق التقييم</h3><p>{report.context || 'لم تتوفر تفاصيل كافية.'}</p></div>
            <div className="impact-report-section"><h3>المؤشرات والقراءة</h3>
              {report.indicators?.length ? report.indicators.map((item,index)=><article className="impact-indicator" key={index}><b>{item.name}</b><strong>{item.value ?? 'غير متوفر'}</strong><p>{item.interpretation}</p><small>الدليل: {item.evidence || 'لم يذكر'}</small></article>) : <p>لم تتوفر مؤشرات كافية.</p>}
            </div>
            <div className="impact-report-columns">
              <div className="impact-report-section"><h3>نقاط القوة</h3><ul>{(report.strengths || []).map((item,index)=><li key={index}>{item}</li>)}</ul></div>
              <div className="impact-report-section"><h3>الفجوات</h3><ul>{(report.gaps || []).map((item,index)=><li key={index}>{item}</li>)}</ul></div>
            </div>
            <div className="impact-report-section"><h3>التوصيات</h3>
              {(report.recommendations || []).map((item,index)=><article className="impact-recommendation" key={index}><b>{item.action}</b><span>{item.priority || 'أولوية غير محددة'}</span><p>{item.rationale}</p></article>)}
            </div>
            <div className="impact-report-section"><h3>جودة البيانات وحدود القراءة</h3><p>{report.data_quality || 'غير محدد'}</p><ul>{(report.limitations || []).map((item,index)=><li key={index}>{item}</li>)}</ul></div>
            <div className="impact-report-section"><h3>المتابعة المقترحة</h3><ul>{(report.follow_up || []).map((item,index)=><li key={index}>{item}</li>)}</ul></div>
            <div className="impact-report-disclaimer">هذا تقرير أولي مساعد، ولا يمثل اعتمادًا رسميًا أو تقييمًا نهائيًا. راجع البيانات والمؤشرات قبل اتخاذ القرارات.</div>
            <div className="impact-report-actions">
              {session?.user?.id ? <button type="button" className="impact-primary-btn" onClick={saveReport} disabled={savingReport || !!savedReportId}>{savedReportId ? 'تم حفظ التقرير ✓' : savingReport ? 'جارٍ الحفظ…' : 'حفظ التقرير في سجلات نهج'}</button> : <Link className="impact-outline-btn" to="/admin">دخول المسؤول لحفظ التقرير</Link>}
              <button type="button" className="impact-outline-btn" onClick={() => window.print()}>طباعة / حفظ PDF</button>
              {reportNotice && <small className="impact-success">{reportNotice}</small>}
              {savedReportId && <small>رقم التقرير: {savedReportId}</small>}
            </div>
          </section>}
        </div>
      </section>
      <div className="impact-back"><Link to="/impact">← العودة إلى المنظومة</Link></div>
    </main>
  )
}


export function ImpactAdmin() {
  const access = useImpactAccess()
  const [session, setSession] = useState(null)
  const [reports, setReports] = useState([])
  const [selected, setSelected] = useState(null)
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!db) return
    db.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, current) => setSession(current))
    return () => subscription.unsubscribe()
  }, [])

  async function loadReports() {
    setLoading(true)
    setError('')
    const { data, error: loadError } = await db.from('impact_assessments')
      .select('id,portal,title,report,status,created_at,updated_at')
      .order('created_at', { ascending: false })
      .limit(500)
    if (loadError) {
      setError('تعذر تحميل التقارير. تأكدي من تطبيق ترحيل قاعدة البيانات وأن حسابك مسؤول نشط.')
      setReports([])
    } else {
      setReports(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    if (session) loadReports()
  }, [session])

  async function changeStatus(row, status) {
    setError('')
    setNotice('')
    const { error: updateError } = await db.from('impact_assessments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', row.id)
    if (updateError) {
      setError('تعذر تحديث حالة التقرير.')
      return
    }
    setNotice('تم تحديث حالة التقرير.')
    if (selected?.id === row.id) setSelected({ ...selected, status })
    await loadReports()
  }

  const labels = { meetings: 'تقييم اللقاءات', partners: 'تقييم الشركاء', teams: 'تقييم الفرق والأعضاء' }
  const visible = reports.filter(row => filter === 'all' || row.portal === filter)
  const counts = {
    total: reports.length,
    draft: reports.filter(row => row.status === 'draft').length,
    reviewed: reports.filter(row => row.status === 'reviewed').length,
    archived: reports.filter(row => row.status === 'archived').length
  }

  if (!access.allowed) return <ImpactAccessNotice loading={access.loading} />

  if (!session) return (
    <main className="impact-page">
      <div className="impact-chat-card center"><h1>دخول المسؤولين مطلوب</h1><p>سجلات قياس الأثر مخصصة للمسؤولين النشطين فقط.</p><Link className="btn" to="/admin">الانتقال إلى تسجيل الدخول</Link></div>
    </main>
  )

  return (
    <main className="impact-page">
      <div className="impact-breadcrumb"><Link to="/">الرئيسية</Link><span>/</span><Link to="/admin">لوحة الإدارة</Link><span>/</span><b>تقارير قياس الأثر</b></div>
      <section className="impact-portal-heading">
        <span className="eyebrow">NAHJ · IMPACT ADMINISTRATION</span>
        <h1>سجل تقارير الأثر</h1>
        <p>متابعة التقارير المحفوظة ومراجعتها وأرشفتها.</p>
      </section>
      <div className="impact-admin-stats">
        <div><strong>{counts.total}</strong><span>إجمالي التقارير</span></div>
        <div><strong>{counts.draft}</strong><span>مسودات</span></div>
        <div><strong>{counts.reviewed}</strong><span>تمت مراجعتها</span></div>
        <div><strong>{counts.archived}</strong><span>مؤرشفة</span></div>
      </div>
      <section className="impact-admin-layout">
        <div className="impact-admin-list">
          <div className="impact-admin-toolbar">
            <select value={filter} onChange={event => setFilter(event.target.value)}>
              <option value="all">كل البوابات</option><option value="meetings">اللقاءات</option><option value="partners">الشركاء</option><option value="teams">الفرق والأعضاء</option>
            </select>
            <button type="button" className="impact-outline-btn" onClick={loadReports} disabled={loading}>{loading ? 'جارٍ التحديث…' : 'تحديث السجل ↻'}</button>
          </div>
          {error && <div className="impact-error">{error}</div>}
          {notice && <div className="impact-success">{notice}</div>}
          {loading ? <p className="muted">جارٍ تحميل التقارير…</p> : visible.length ? visible.map(row => (
            <button type="button" className={'impact-report-row ' + (selected?.id === row.id ? 'active' : '')} key={row.id} onClick={() => setSelected(row)}>
              <span className="eyebrow">{labels[row.portal] || row.portal}</span>
              <b>{row.title}</b>
              <small>{new Date(row.created_at).toLocaleString('ar-SA', { dateStyle: 'medium', timeStyle: 'short' })}</small>
              <em>{row.status === 'reviewed' ? 'تمت المراجعة' : row.status === 'archived' ? 'مؤرشف' : 'مسودة'}</em>
            </button>
          )) : <p className="muted">لا توجد تقارير محفوظة في هذا السجل حتى الآن.</p>}
        </div>
        <div className="impact-admin-detail">
          {selected ? <>
            <div className="impact-report-head"><span className="eyebrow">{labels[selected.portal]}</span><h2>{selected.title}</h2><p>{selected.report?.executive_summary}</p></div>
            <div className="impact-report-section"><h3>المؤشرات</h3>{(selected.report?.indicators || []).map((item,index)=><article className="impact-indicator" key={index}><b>{item.name}</b><strong>{item.value ?? 'غير متوفر'}</strong><p>{item.interpretation}</p></article>)}</div>
            <div className="impact-report-section"><h3>التوصيات</h3><ul>{(selected.report?.recommendations || []).map((item,index)=><li key={index}><b>{item.action}</b> — {item.rationale}</li>)}</ul></div>
            <div className="impact-report-section"><h3>الفجوات</h3><ul>{(selected.report?.gaps || []).map((item,index)=><li key={index}>{item}</li>)}</ul></div>
            <div className="impact-admin-actions">
              {selected.status !== 'reviewed' && <button type="button" className="impact-primary-btn" onClick={() => changeStatus(selected,'reviewed')}>تحديد كمراجع</button>}
              {selected.status !== 'archived' && <button type="button" className="impact-outline-btn" onClick={() => changeStatus(selected,'archived')}>أرشفة التقرير</button>}
              {selected.status !== 'draft' && <button type="button" className="impact-outline-btn" onClick={() => changeStatus(selected,'draft')}>إعادته لمسودة</button>}
              <button type="button" className="impact-outline-btn" onClick={() => window.print()}>طباعة التقرير</button>
            </div>
          </> : <div className="impact-admin-empty"><span>✧</span><h2>اختار تقريرًا</h2><p>ستظهر تفاصيل التقرير ومؤشراته وتوصياته هنا.</p></div>}
        </div>
      </section>
      <div className="impact-back"><Link to="/admin">← العودة إلى لوحة الإدارة</Link></div>
    </main>
  )
}
