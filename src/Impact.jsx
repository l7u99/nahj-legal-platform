import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { db } from './lib'

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
  return (
    <main className="impact-page">
      <section className="impact-hero">
        <div className="impact-orbit orbit-one" />
        <div className="impact-orbit orbit-two" />
        <span className="eyebrow">NAHJ · IMPACT & SUSTAINABILITY</span>
        <div className="impact-mark">نـ</div>
        <h1>منظومة قياس الأثر <em>والاستدامة</em></h1>
        <p>من قياس النشاط إلى فهم الأثر، ومن البيانات إلى قرارات تصنع فرقًا.</p>
        <div className="impact-hero-actions">
          <a className="impact-primary" href="#impact-portals">استكشف المنظومة <span>←</span></a>
          <span className="impact-live"><i /> منظومة تفاعلية</span>
        </div>
        <div className="impact-stats">
          <div><strong>01</strong><span>منهجية قياس</span></div>
          <div><strong>03</strong><span>بوابات متخصصة</span></div>
          <div><strong>AI</strong><span>مساعد ذكي</span></div>
        </div>
      </section>

      <section className="impact-intro" id="impact-portals">
        <div>
          <span className="eyebrow">THE IMPACT FRAMEWORK</span>
          <h2>كل تفاعل يترك أثرًا.<br /><em>والأثر يستحق أن يُقاس.</em></h2>
        </div>
        <p>اختر مجال القياس، وأجب عن أسئلة المساعد الذكي خطوة بخطوة. سيساعدك على تنظيم المعلومات، واكتشاف الفجوات، وصياغة قراءة عملية للأثر وفرص التحسين.</p>
      </section>

      <section className="impact-grid">
        {portalCards.map((card) => (
          <Link className="impact-card" to={`/impact/${card.id}`} key={card.id}>
            <div className="impact-card-top"><span>{card.number}</span><b>{card.icon}</b></div>
            <h3>{card.title}</h3>
            <p>{card.desc}</p>
            <div className="impact-tags">{card.tags.map(tag => <span key={tag}>{tag}</span>)}</div>
            <div className="impact-card-link">ابدأ القياس <span>←</span></div>
          </Link>
        ))}
      </section>

      <section className="impact-method">
        <div className="method-copy">
          <span className="eyebrow">HOW IT WORKS</span>
          <h2>من السؤال إلى <em>قرار أفضل</em></h2>
          <p>تجربة موجهة لا تحتاج إلى خبرة مسبقة في قياس الأثر. المساعد يسألك، يرتب إجاباتك، ثم يقدم قراءة أولية قابلة للمراجعة.</p>
        </div>
        <div className="method-steps">
          <div><b>01</b><span><strong>حدد المجال</strong><small>لقاء، شريك، أو فريق عمل</small></span></div>
          <div><b>02</b><span><strong>أجب خطوة بخطوة</strong><small>أسئلة قصيرة بحسب سياقك</small></span></div>
          <div><b>03</b><span><strong>استخرج قراءة الأثر</strong><small>مؤشرات وفجوات وفرص تحسين</small></span></div>
        </div>
      </section>
      <div className="impact-back"><Link to="/">العودة إلى بوابة نهج الرئيسية ←</Link></div>
    </main>
  )
}

export function ImpactPortal() {
  const { portal } = useParams()
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

  if (!info) return <main className="impact-page"><div className="impact-chat-card"><h1>البوابة غير موجودة</h1><Link to="/impact">العودة إلى المنظومة</Link></div></main>

  async function sendMessage(event) {
    event.preventDefault()
    const content = draft.trim()
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
    if (generatingReport || messages.filter(message => message.role === 'user').length < 2) return
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
          <div className="guide-points"><span>✓ أسئلة متدرجة</span><span>✓ تحليل مرتبط بالسياق</span><span>✓ فرص تحسين عملية</span></div>
          <button type="button" className="impact-reset" onClick={resetConversation}>بدء تقييم جديد ↻</button>
          <small>لا تدخل بيانات شخصية أو معلومات سرية.</small>
        </aside>
        <div className="impact-chat-card">
          <div className="chat-head"><div><span className="chat-status" /><strong>جلسة قياس جديدة</strong><small>المساعد متاح عند الطلب</small></div><span className="chat-ai">AI</span></div>
          <div className="chat-messages">
            {conversation.map((message, index) => <div className={`chat-message ${message.role}`} key={index}><span>{message.role === 'assistant' ? 'نهج' : 'أنت'}</span><p>{message.content}</p></div>)}
            {busy && <div className="chat-message assistant"><span>نهج</span><p className="typing">أراجع إجابتك وأجهز الخطوة التالية…</p></div>}
          </div>
          {error && <div className="impact-error">{error}</div>}
          <form className="chat-compose" onSubmit={sendMessage}>
            <textarea value={draft} onChange={event => setDraft(event.target.value)} placeholder="اكتب إجابتك هنا…" rows="2" maxLength="3000" disabled={busy} />
            <button type="submit" disabled={busy || !draft.trim()}>{busy ? '...' : 'إرسال ←'}</button>
          </form>
          <div className="chat-foot">تُرسل الرسالة عند الضغط على «إرسال» فقط · راجع المخرجات قبل اعتماد أي قرار</div>
          <div className="impact-report-actions">
            <button type="button" className="impact-outline-btn" onClick={generateReport} disabled={generatingReport || messages.filter(message => message.role === 'user').length < 2}>
              {generatingReport ? 'جارٍ إعداد التقرير…' : 'إعداد تقرير الأثر'}
            </button>
            <small>يتاح بعد إدخال إجابتين على الأقل، ويُنشأ عند الطلب فقط.</small>
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
