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

function useAtharSurveyData(enabled) {
  const [data, setData] = useState({ surveys: [], responses: [], questions: [], loading: true, error: '' })
  useEffect(() => {
    if (!enabled || !db) return
    let alive = true
    async function load() {
      setData(current => ({ ...current, loading: true, error: '' }))
      const [surveyResult, responseResult, questionResult] = await Promise.all([
        db.from('impact_surveys').select('id,title,status,category,public_token,created_at').order('created_at', { ascending: false }).limit(250),
        db.from('impact_survey_responses').select('id,survey_id,answers,submitted_at').order('submitted_at', { ascending: false }).limit(2000),
        db.from('impact_survey_questions').select('id,survey_id,question_type,dimension,prompt')
      ])
      if (!alive) return
      const error = surveyResult.error || responseResult.error || questionResult.error
      setData({
        surveys: surveyResult.data || [],
        responses: responseResult.data || [],
        questions: questionResult.data || [],
        loading: false,
        error: error ? 'تعذر تحديث بعض البيانات. بقيت اللوحة ظاهرة ويمكن إعادة المحاولة.' : ''
      })
    }
    load()
    return () => { alive = false }
  }, [enabled])
  return data
}

const atharCategoryMeta = {
  meetings: { number: '01', title: 'تقييم اللقاءات والفعاليات', shortTitle: 'اللقاءات والفعاليات', description: 'قياس جودة التجربة، تحقق أهداف اللقاء، تفاعل الحضور، والتنظيم والمخرجات.', dimensions: ['جودة التنظيم', 'وضوح الأهداف', 'تفاعل الحضور', 'تحقق المخرجات'] },
  teams: { number: '02', title: 'تقييم الأعضاء وفريق العمل', shortTitle: 'الأعضاء وفريق العمل', description: 'متابعة الأداء والإنجاز والالتزام والتعاون والمبادرة واحتياجات التطوير.', dimensions: ['الإنجاز', 'الالتزام', 'التعاون', 'المبادرة'] },
  partners: { number: '03', title: 'تقييم الشركاء', shortTitle: 'الشركاء', description: 'قياس قيمة الشراكة وجودة التعاون والالتزام والأهداف والنتائج المشتركة.', dimensions: ['جودة التعاون', 'الالتزام', 'القيمة المضافة', 'الأثر المشترك'] }
}

function AtharCategoryCard({ item, count, replies }) {
  return (
    <Link className="athar-category-card" to={'/impact/' + item.id}>
      <div className="athar-category-card-top"><span>{item.number} / ATHAR INDICATORS</span><b>{item.id === 'meetings' ? '◷' : item.id === 'teams' ? '◎' : '◇'}</b></div>
      <h2>{item.title}</h2>
      <p>{item.desc}</p>
      <div className="athar-category-card-stats"><span>{count.toLocaleString('ar-SA')} استبيان</span><span>{replies.toLocaleString('ar-SA')} استجابة</span></div>
      <strong>فتح لوحة المؤشرات <span>←</span></strong>
    </Link>
  )
}

export function ImpactHome() {
  const access = useImpactAccess()
  const data = useAtharSurveyData(access.allowed)
  if (!access.allowed) return <ImpactAccessNotice loading={access.loading} />
  const categories = [
    { id: 'meetings', number: '01', title: 'تقييم اللقاءات والفعاليات', desc: 'جودة اللقاء والتنظيم ورضا الحضور وقياس المخرجات.' },
    { id: 'teams', number: '02', title: 'تقييم الأعضاء وفريق العمل', desc: 'الأداء والإنجاز والالتزام والتعاون والتطوير.' },
    { id: 'partners', number: '03', title: 'تقييم الشركاء', desc: 'جودة الشراكات والقيمة المضافة والأثر المشترك.' }
  ]
  return (
    <main className="impact-page athar-dashboard">
      <div className="impact-breadcrumb"><Link to="/">الرئيسية</Link><span>/</span><b>أثَر · منظومة قياس الأثر</b></div>
      <section className="athar-dashboard-hero">
        <div><span className="eyebrow">NAHJ LEGAL · IMPACT & SUSTAINABILITY</span><h1>منظومة <em>أثَر</em></h1><p>منظومة موحّدة لقياس أثر نهج القانوني، بلوحات مستقلة لكل مجال؛ حتى تكون المؤشرات دقيقة ومرتبطة بطبيعة النشاط والفئة المستهدفة.</p><div className="athar-dashboard-actions"><Link className="impact-primary" to="/admin/impact/surveys">إدارة الاستبيانات <span>←</span></Link><Link className="impact-outline-btn" to="/admin/impact">سجل التقارير <span>←</span></Link></div></div>
        <div className="athar-dashboard-mark"><span>أثَر</span><small>MEASURE · ANALYZE · IMPROVE</small><i>✧</i></div>
      </section>
      {data.error && <div className="impact-inline-notice" role="status">{data.error}</div>}
      <section className="athar-overview-strip">
        <div><small>إجمالي الاستبيانات</small><strong>{data.loading ? '—' : data.surveys.length.toLocaleString('ar-SA')}</strong></div>
        <div><small>الاستبيانات النشطة</small><strong>{data.loading ? '—' : data.surveys.filter(item => item.status === 'published').length.toLocaleString('ar-SA')}</strong></div>
        <div><small>إجمالي الاستجابات</small><strong>{data.loading ? '—' : data.responses.length.toLocaleString('ar-SA')}</strong></div>
      </section>
      <section className="athar-dashboard-section-head"><div><span className="eyebrow">DEDICATED INDICATOR DASHBOARDS</span><h2>لوحات المؤشرات حسب المجال</h2></div><span className="athar-data-note"><i /> لكل مجال مؤشرات وتحليلات مستقلة</span></section>
      <section className="athar-category-grid">
        {categories.map(item => <AtharCategoryCard key={item.id} item={item} count={data.surveys.filter(s => s.category === item.id).length} replies={data.responses.filter(r => data.surveys.some(s => s.id === r.survey_id && s.category === item.id)).length} />)}
      </section>
      <section className="athar-next-step"><div><span className="eyebrow">BUILD YOUR MEASUREMENT</span><h2>كل استجابة تضيف قراءة أوضح للأثر</h2><p>أنشئي استبيانًا وحددي المجال، ثم شاركي الرابط مع الفئة المستهدفة. ستظهر نتائجه في لوحة المجال المناسبة.</p></div><Link className="impact-primary" to="/admin/impact/surveys">إنشاء استبيان جديد ←</Link></section>
    </main>
  )
}

export function ImpactCategoryDashboard({ category }) {
  const access = useImpactAccess()
  const data = useAtharSurveyData(access.allowed)
  const meta = atharCategoryMeta[category]
  if (!access.allowed) return <ImpactAccessNotice loading={access.loading} />
  if (!meta) return <main className="impact-page"><div className="impact-chat-card"><h1>لوحة المؤشرات غير موجودة</h1><Link to="/impact">العودة إلى أثَر</Link></div></main>
  const surveys = data.surveys.filter(item => item.category === category)
  const surveyIds = new Set(surveys.map(item => item.id))
  const responses = data.responses.filter(item => surveyIds.has(item.survey_id))
  const questionIds = new Set(data.questions.filter(item => surveyIds.has(item.survey_id) && item.question_type === 'rating').map(item => item.id))
  const ratings = responses.flatMap(row => Object.entries(row.answers || {}).filter(([id, value]) => questionIds.has(id) && Number.isFinite(Number(value))).map(([id, value]) => ({ id, value: Number(value) })))
  const average = ratings.length ? (ratings.reduce((sum, item) => sum + item.value, 0) / ratings.length).toFixed(1) : '0.0'
  const active = surveys.filter(item => item.status === 'published').length
  const monthly = Array.from({ length: 6 }, (_, index) => { const date = new Date(); date.setDate(1); date.setMonth(date.getMonth() - (5-index)); return { key: date.getFullYear() + '-' + date.getMonth(), label: date.toLocaleDateString('ar-SA', { month: 'short' }), total: responses.filter(row => { const d = new Date(row.submitted_at); return d.getFullYear() === date.getFullYear() && d.getMonth() === date.getMonth() }).length } })
  const maxMonthly = Math.max(1, ...monthly.map(item => item.total))
  const questionResults = data.questions.filter(q => surveyIds.has(q.survey_id) && q.question_type === 'rating').map(question => {
    const values = responses.map(row => Number((row.answers || {})[question.id])).filter(value => Number.isFinite(value))
    return { ...question, average: values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0, count: values.length }
  })
  return (
    <main className="impact-page athar-dashboard">
      <div className="impact-breadcrumb"><Link to="/impact">أثَر</Link><span>/</span><b>{meta.shortTitle}</b></div>
      <section className="athar-dashboard-hero athar-category-hero"><div><span className="eyebrow">ATHAR · {meta.number} / INDICATORS</span><h1>لوحة مؤشرات <em>{meta.shortTitle}</em></h1><p>{meta.description} تعرض هذه اللوحة بيانات هذا المجال فقط، ولا تخلطها بمؤشرات المجالات الأخرى.</p><div className="athar-dashboard-actions"><Link className="impact-primary" to="/admin/impact/surveys">إدارة استبيانات هذا المجال ←</Link><Link className="impact-outline-btn" to="/impact">العودة إلى لوحة أثَر</Link></div></div><div className="athar-dashboard-mark"><span>أثَر</span><small>{meta.number} · NAHJ</small><i>✧</i></div></section>
      {data.error && <div className="impact-inline-notice" role="status">{data.error}</div>}
      <section className="athar-kpi-grid">
        <article className="athar-kpi"><span>إجمالي الاستجابات</span><strong>{data.loading ? '—' : responses.length.toLocaleString('ar-SA')}</strong><small>استجابات هذا المجال فقط</small><i>↗</i></article>
        <article className="athar-kpi"><span>الاستبيانات النشطة</span><strong>{data.loading ? '—' : active.toLocaleString('ar-SA')}</strong><small>روابط تستقبل التقييمات</small><i>◉</i></article>
        <article className="athar-kpi"><span>متوسط التقييم</span><strong>{data.loading ? '—' : average} / 5</strong><small>{ratings.length.toLocaleString('ar-SA')} إجابة تقييمية</small><i>☆</i></article>
        <article className="athar-kpi"><span>عدد الاستبيانات</span><strong>{data.loading ? '—' : surveys.length.toLocaleString('ar-SA')}</strong><small>جميع الحالات</small><i>▤</i></article>
      </section>
      <section className="athar-dashboard-section-head"><div><span className="eyebrow">RESPONSE TREND</span><h2>تطور الاستجابات</h2></div><span className="athar-panel-unit">آخر 6 أشهر · {meta.shortTitle}</span></section>
      <section className="athar-panel"><div className="athar-bar-chart">{monthly.map(item => <div className="athar-bar-column" key={item.key}><strong>{data.loading ? '—' : item.total}</strong><div className="athar-bar-track"><i style={{ height: data.loading ? '0%' : (item.total / maxMonthly * 100) + '%' }} /></div><small>{item.label}</small></div>)}</div>{!data.loading && responses.length === 0 && <div className="athar-chart-empty">بانتظار أول استجابة لهذا المجال؛ ستظهر حركة التقييم هنا.</div>}</section>
      <section className="athar-dashboard-section-head"><div><span className="eyebrow">INDICATOR BREAKDOWN</span><h2>نتائج مؤشرات التقييم</h2></div><span className="athar-panel-unit">متوسط من 5</span></section>
      <section className="athar-indicator-list">
        {questionResults.length ? questionResults.map((item, index) => <article className="athar-indicator-row" key={item.id}><div><small>مؤشر {String(index + 1).padStart(2, '0')}</small><h3>{item.prompt}</h3><span>{item.count.toLocaleString('ar-SA')} إجابة</span></div><strong>{item.count ? item.average.toFixed(1) : '0.0'}<small> / 5</small></strong><div className="athar-indicator-track"><i style={{ width: (item.average / 5 * 100) + '%' }} /></div></article>) : <div className="athar-chart-empty">لا توجد أسئلة تقييم رقمية في هذا المجال حتى الآن.</div>}
      </section>
      <section className="athar-next-step"><div><span className="eyebrow">NEXT STEP</span><h2>{surveys.length ? 'طوّري أدوات القياس باستمرار' : 'ابدئي بإنشاء أول استبيان لهذا المجال'}</h2><p>أنشئي استبيانًا مرتبطًا بهذا المجال لتجميع بيانات قابلة للمقارنة وتحليلها.</p></div><Link className="impact-primary" to="/admin/impact/surveys">إدارة الاستبيانات ←</Link></section>
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

const categoryLabels = { meetings: 'اللقاءات والفعاليات', partners: 'الشراكات', teams: 'الفرق والأعضاء', general: 'تقييم عام' }

export function ImpactSurveyAdmin() {
  const access = useImpactAccess()
  const [session, setSession] = useState(null)
  const [surveys, setSurveys] = useState([])
  const [responses, setResponses] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('meetings')
  const [questions, setQuestions] = useState([
    { prompt: 'كيف تقيّم جودة التجربة بشكل عام؟', type: 'rating', options: '', dimension: 'operational', required: true },
    { prompt: 'ما أكثر جانب أعجبك؟', type: 'text', options: '', dimension: 'knowledge', required: false },
    { prompt: 'ما الذي تقترح تحسينه؟', type: 'text', options: '', dimension: 'development', required: false }
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
    const [surveyResult, responseResult] = await Promise.all([
      db.from('impact_surveys').select('id,title,description,category,status,public_token,created_at').order('created_at', { ascending: false }).limit(200),
      db.from('impact_survey_responses').select('id,survey_id,submitted_at').order('submitted_at', { ascending: false }).limit(3000)
    ])
    if (surveyResult.error || responseResult.error) {
      setError('تعذر تحميل الاستبيانات. تحققي من صلاحية عضوية الفريق ثم أعيدي المحاولة.')
      setSurveys([]); setResponses([]); return
    }
    setSurveys(surveyResult.data || []); setResponses(responseResult.data || [])
  }

  useEffect(() => { if (access.allowed) loadSurveys() }, [access.allowed])

  function updateQuestion(index, key, value) {
    setQuestions(current => current.map((item, i) => i === index ? { ...item, [key]: value } : item))
  }

  async function createSurvey(event) {
    event.preventDefault()
    if (!session?.user?.id || saving) return
    if (!title.trim() || !questions.length || questions.some(item => !item.prompt.trim())) {
      setError('أكملي عنوان الاستبيان ونصوص جميع الأسئلة.'); return
    }
    if (questions.some(item => item.type === 'choice' && !item.options.split(',').map(v => v.trim()).filter(Boolean).length)) {
      setError('أضيفي خيارات أسئلة الاختيار من متعدد.'); return
    }
    setSaving(true); setError(''); setNotice('')
    const { data: survey, error: surveyError } = await db.from('impact_surveys').insert({
      title: title.trim(), description: description.trim(), category, created_by: session.user.id, status: 'draft'
    }).select('id').single()
    if (surveyError || !survey) {
      setError('تعذر إنشاء الاستبيان. تحققي من صلاحيات الحساب.'); setSaving(false); return
    }
    const questionRows = questions.map((item, index) => ({
      survey_id: survey.id, prompt: item.prompt.trim(), question_type: item.type,
      options: item.type === 'choice' ? item.options.split(',').map(value => value.trim()).filter(Boolean) : [],
      is_required: item.required, dimension: item.dimension, position: index + 1
    }))
    const { error: questionsError } = await db.from('impact_survey_questions').insert(questionRows)
    if (questionsError) {
      setError('تم إنشاء الاستبيان كمسودة، لكن تعذرت إضافة الأسئلة. راجعي صلاحيات قاعدة البيانات.')
    } else {
      setTitle(''); setDescription(''); setCategory('meetings')
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
    setBusyId(survey.id); setError(''); setNotice('')
    if (status === 'published') {
      const { count, error: countError } = await db.from('impact_survey_questions').select('id', { count: 'exact', head: true }).eq('survey_id', survey.id)
      if (countError || !count) { setError('أضيفي سؤالًا واحدًا على الأقل قبل نشر الاستبيان.'); setBusyId(''); return }
    }
    const { error: updateError } = await db.from('impact_surveys').update({ status, updated_at: new Date().toISOString() }).eq('id', survey.id)
    if (updateError) setError('تعذر تحديث حالة الاستبيان.')
    else {
      setNotice(status === 'published' ? 'تم نشر الاستبيان وأصبح رابطه متاحًا.' : status === 'closed' ? 'تم إغلاق استقبال الردود.' : 'تمت إعادة الاستبيان إلى المسودات.')
      await loadSurveys()
    }
    setBusyId('')
  }

  async function copySurveyLink(survey) {
    const url = window.location.origin + (import.meta.env.BASE_URL || '/') + 'rate/' + survey.public_token
    try { await navigator.clipboard.writeText(url); setNotice('تم نسخ رابط التقييم.') }
    catch { setNotice('رابط التقييم: ' + url) }
  }

  if (!access.allowed) return <ImpactAccessNotice loading={access.loading} />

  return (
    <main className="impact-page athar-survey-admin">
      <div className="impact-breadcrumb"><Link to="/">الرئيسية</Link><span>/</span><Link to="/impact">أثَر</Link><span>/</span><b>إدارة الاستبيانات</b></div>
      <section className="athar-subpage-heading"><div><span className="eyebrow">ATHAR · SURVEY MANAGEMENT</span><h1>إدارة <em>الاستبيانات</em></h1><p>أنشئي نماذج التقييم، وانشري رابطًا مستقلًا لكل فعالية، وتابعي الردود من لوحة أثَر.</p></div><Link className="impact-outline-btn" to="/impact">العودة إلى لوحة المؤشرات ←</Link></section>
      {error && <div className="impact-error" role="alert">{error}</div>}
      {notice && <div className="impact-inline-notice" role="status">{notice}</div>}
      <section className="athar-survey-layout">
        <form className="athar-panel athar-survey-builder" onSubmit={createSurvey}>
          <div className="athar-panel-heading"><div><span className="eyebrow">CREATE A FORM</span><h2>إنشاء استبيان جديد</h2></div><span className="athar-step-number">01</span></div>
          <label>عنوان الاستبيان<input value={title} onChange={event => setTitle(event.target.value)} maxLength="180" placeholder="مثال: تقييم لقاء التطوير القانوني" required /></label>
          <label>وصف مختصر<textarea value={description} onChange={event => setDescription(event.target.value)} rows="2" placeholder="وضّحي للمشارك الغرض من التقييم…" /></label>
          <label>مجال التقييم<select value={category} onChange={event => setCategory(event.target.value)}><option value="meetings">اللقاءات والفعاليات</option><option value="partners">الشراكات</option><option value="teams">الفرق والأعضاء</option><option value="general">تقييم عام</option></select></label>
          <div className="athar-question-builder-head"><h3>أسئلة الاستبيان</h3><button type="button" className="impact-outline-btn" onClick={() => setQuestions(current => [...current, { prompt: '', type: 'rating', options: '', dimension: 'operational', required: true }])}>+ إضافة سؤال</button></div>
          {questions.map((question, index) => <div className="athar-question-editor" key={index}>
            <div className="athar-question-editor-title"><b>السؤال {index + 1}</b>{questions.length > 1 && <button type="button" onClick={() => setQuestions(current => current.filter((_, i) => i !== index))}>حذف</button>}</div>
            <input value={question.prompt} onChange={event => updateQuestion(index, 'prompt', event.target.value)} placeholder="اكتبي السؤال هنا" maxLength="500" required />
            <div className="athar-question-editor-options"><select value={question.type} onChange={event => updateQuestion(index, 'type', event.target.value)}><option value="rating">تقييم من 1 إلى 5</option><option value="choice">اختيار من متعدد</option><option value="text">إجابة نصية</option></select><select value={question.dimension} onChange={event => updateQuestion(index, 'dimension', event.target.value)} aria-label="بُعد الاستدامة"><option value="institutional">المؤسسية</option><option value="operational">التشغيلية</option><option value="knowledge">المعرفية</option><option value="partnerships">الشراكات</option><option value="development">التطويرية</option></select><label className="athar-required-toggle"><input type="checkbox" checked={question.required} onChange={event => updateQuestion(index, 'required', event.target.checked)} /> إلزامي</label></div>
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
      setLoading(true); setError('')
      const { data, error: loadError } = await db.rpc('get_public_impact_survey', { p_token: token })
      if (!alive) return
      if (loadError || !data) { setSurvey(null); setError('هذا الرابط غير متاح حاليًا. قد يكون الاستبيان مغلقًا أو انتهت مدته.') }
      else setSurvey(data)
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
    if (missing) { setError('فضلاً أجيبي عن السؤال: ' + missing.prompt); return }
    setSubmitting(true); setError('')
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
          <span className="eyebrow">{categoryLabels[survey.category] || 'تقييم أثَر'}</span><h1>{survey.title}</h1>
          <p className="athar-public-description">{survey.description || 'نقدّر وقتك ومشاركتك. تساعدنا إجاباتك على تحسين التجربة.'}</p>
          <div className="athar-public-progress"><span>{survey.questions.length} أسئلة</span><span>الوقت المتوقع: دقيقتان</span></div>
          {survey.questions.map((question, index) => <section className="athar-public-question" key={question.id}>
            <label><b>{index + 1}. {question.prompt}</b>{question.is_required && <em>*</em>}</label>
            {question.question_type === 'rating' && <div className="athar-rating-options" role="radiogroup" aria-label={question.prompt}>{[1,2,3,4,5].map(value => <button key={value} type="button" className={Number(answers[question.id]) === value ? 'selected' : ''} onClick={() => setAnswers(current => ({ ...current, [question.id]: value }))}>{value}<small>{value === 1 ? 'ضعيف' : value === 5 ? 'ممتاز' : ''}</small></button>)}</div>}
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
