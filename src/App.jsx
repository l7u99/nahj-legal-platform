import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { db, ready } from './lib'
import Archive from './Archive'
import Advocacy from './Advocacy'
import AdvocacyAdmin from './AdvocacyAdmin'
import { ImpactHome, ImpactCategoryDashboard, ImpactPortal, ImpactAssistantHome, ImpactAdmin, ImpactSurveyAdmin, ImpactSurveyPublic } from './Impact'

function Header() {
  return (
    <header>
      <Link to="/" className="brand">
        <img
          src={`${import.meta.env.BASE_URL}nahj-logo.png?v=20261127`}
          alt="شعار نهج القانوني"
          style={{ width: 76, height: 76, objectFit: 'contain', borderRadius: 12 }}
        />
        <span>
          نهج القانوني
          <small>من المعرفة إلى الأثر</small>
        </span>
      </Link>
      <nav>
        <Link to="/">الرئيسية</Link>
        <Link to="/competitions">المسابقات</Link>
        <Link to="/assistant">مساعد نهج الذكي</Link>
      </nav>
    </header>
  )
}

function Shell({ children }) {
  return (
    <div className="site">
      <Header />
      {children}
      <footer>© 2026 نهج القانوني · المعرفة إلى الأثر</footer>
    </div>
  )
}

function Hero({ title, desc }) {
  return (
    <section className="hero">
      <small>NAHJ LEGAL · دقيقة قانونية</small>
      <h1>{title}</h1>
      <p>{desc}</p>
    </section>
  )
}

function Note({ children }) {
  return <div className="note">{children}</div>
}

function formatDate(value) {
  if (!value) return 'غير متوفر'
  return new Date(value).toLocaleString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function Home() {
  return (
    <Shell>
      <main className="home-v2">
        <section className="home-hero">
          <div className="home-hero-copy">
            <span className="eyebrow">NAHJ LEGAL · KNOWLEDGE TO IMPACT</span>
            <h1>من المعرفة القانونية<br /><em>إلى أثرٍ يُصنع.</em></h1>
            <p>منصة نهج القانوني؛ مساحة للمنافسة والتعلّم، ومنظومة لقياس الأثر والاستدامة وتطوير جودة العمل.</p>
            <div className="home-actions">
              <a className="btn" href="#nahj-gateways">استكشف بوابات نهج ↓</a>
              <Link className="impact-outline-btn" to="/assistant">افتح مساعد نهج الذكي ←</Link>
            </div>
          </div>
          <div className="home-hero-art" aria-hidden="true">
            <div className="hero-ring ring-a" /><div className="hero-ring ring-b" />
            <img className="hero-emblem hero-logo" src={`${import.meta.env.BASE_URL}nahj-logo.png?v=20261127`} alt="شعار نهج القانوني" /><span className="hero-art-caption">NAHJ · 2026</span>
          </div>
        </section>
        <section className="home-section-head" id="nahj-gateways">
          <div><span className="eyebrow">EXPLORE NAHJ</span><h2>بوابات نهج</h2></div>
          <p>اختر المسار الذي يناسب هدفك وابدأ تجربتك.</p>
        </section>
        <section className="gateway-grid">
          <article className="gateway-card gateway-competition">
            <div className="gateway-top"><span>01 / COMPETITIONS</span><b>⚖</b></div>
            <h3>بوابة المسابقات</h3>
            <p>تجارب قانونية تفاعلية تختبر المعرفة والتحليل والاستدلال وصياغة المرافعة.</p>
            <Link className="gateway-enter" to="/competitions">الدخول إلى بوابة المسابقات <span>←</span></Link>
          </article>
          <article className="gateway-card gateway-impact">
            <div className="gateway-top"><span>02 / IMPACT & SUSTAINABILITY</span><b>✧</b></div>
            <h3>منظومة قياس الأثر والاستدامة</h3>
            <p>منظومة ذكية لتحليل جودة اللقاءات والشراكات وأداء الفرق، وتحويل البيانات إلى فرص تطوير وقرارات أوضح.</p>
            <div className="gateway-pills"><span>تقييم اللقاءات</span><span>تقييم الشركاء</span><span>تقييم الفرق</span></div>
            <Link className="gateway-enter" to="/impact">استكشف المنظومة <span>←</span></Link>
          </article>
        </section>

        <section className="home-bottom-note">
          <div><span className="eyebrow">A BETTER WAY TO MEASURE</span><h2>لا نكتفي بما أُنجز؛<br /><em>نسأل عن الأثر الذي تحقق.</em></h2></div>
          <p>نهج يجمع بين المعرفة، والتجربة، والتحليل؛ ليجعل التطوير مستمرًا والأثر أكثر وضوحًا.</p>
        </section>
      </main>
    </Shell>
  )
}

function Competitions() {
  const [questionSet, setQuestionSet] = useState(null)
  useEffect(() => {
    if (!ready) return
    db.from('question_sets').select('id,title,description').eq('status', 'published')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
      .then(({ data }) => setQuestionSet(data))
  }, [])
  return (
    <Shell>
      <main className="competition-page">
        <Hero title="بوابة المسابقات" desc="تعلّم، حلّل، استدل، واصنع حجتك القانونية." />
        <div className="competition-grid">
          <section className="card competition-feature">
            <span className="gold">01 · التحدّي الأسبوعي</span>
            <h2>دقيقة قانونية</h2>
            <p>أسئلة قانونية موثقة، نتيجة فورية، وتفسير مدعوم بالمصدر النظامي.</p>
            {questionSet ? <><h3>{questionSet.title}</h3><Link className="btn" to={'/participate/' + questionSet.id}>ابدأ التحدّي ←</Link></> : <Note>لا توجد مجموعة أسئلة منشورة حاليًا.</Note>}
            <Link className="competition-sub-link" to="/archive">تصفّح أرشيف الأسئلة ←</Link>
          </section>
          <section className="card competition-feature">
            <span className="gold">02 · التجربة التطبيقية</span>
            <h2>المرافعة القانونية</h2>
            <p>اقرأ وقائع القضية، حدّد التكييف، حلّل الأدلة، ثم اكتب مرافعتك الختامية.</p>
            <Link className="btn" to="/advocacy">استعراض مسابقات المرافعة ←</Link>
          </section>
        </div>
        <div className="competition-footer"><Link to="/">← العودة إلى الرئيسية</Link></div>
      </main>
    </Shell>
  )
}

function Participate() {
  const { pathname } = useLocation()
  const pathParts = pathname.split('/').filter(Boolean)
  const participateIndex = pathParts.lastIndexOf('participate')
  const id = participateIndex >= 0 ? pathParts[participateIndex + 1] : undefined

  const [setData, setSetData] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('loading')
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // يمنع الضغط المتكرر ويحتفظ بمعرّف واحد للمحاولة الحالية.
  const submittingRef = useRef(false)
  const submissionTokenRef = useRef(crypto.randomUUID())

  useEffect(() => {
    if (!ready || !id) {
      setErrorMessage('رابط المسابقة غير متاح.')
      setPhase('error')
      return
    }

    async function loadPublishedSet() {
      const { data, error } = await db
        .from('question_sets')
        .select('id,title,questions(id,body,explanation,law_name,article_number,source_url,position)')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (error || !data) {
        setErrorMessage('المسابقة غير متاحة.')
        setPhase('error')
        return
      }

      const sortedQuestions = (data.questions || [])
        .sort((a, b) => a.position - b.position)

      if (!sortedQuestions.length) {
        setErrorMessage('لا توجد أسئلة في هذه المجموعة.')
        setPhase('error')
        return
      }

      const questionIds = sortedQuestions.map(q => q.id)
      const { data: publicOptions, error: optionsError } = await db
        .from('public_options')
        .select('id,question_id,label,position')
        .in('question_id', questionIds)

      if (optionsError) {
        setErrorMessage('تعذر تحميل خيارات الأسئلة.')
        setPhase('error')
        return
      }

      sortedQuestions.forEach(question => {
        question.options = (publicOptions || [])
          .filter(option => option.question_id === question.id)
          .sort((a, b) => a.position - b.position)
      })

      setSetData(data)
      setQuestions(sortedQuestions)
      setPhase('identity')
    }

    loadPublishedSet()
  }, [id])

  async function submitAnswers() {
    // الحماية الأولى: منع أي طلب ثانٍ أثناء تنفيذ الطلب الأول.
    if (submittingRef.current) return

    if (Object.keys(answers).length !== questions.length) {
      setErrorMessage('أجب عن جميع الأسئلة.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    setErrorMessage('')

    try {
      const { data, error } = await db.functions.invoke(
        'submit-participation',
        {
          body: {
            p_name: name,
            p_phone: phone,
            set_id: id,
            submission_token: submissionTokenRef.current,
            answers: questions.map(question => ({
              question_id: question.id,
              option_id: answers[question.id]
            }))
          }
        }
      )

      if (error || !data?.result) {
        console.error('Submit error:', error)
        setErrorMessage(data?.error || 'تعذر اعتماد المشاركة.')
        return
      }

      setResult(data.result)
      setPhase('result')
    } catch (error) {
      console.error('Submit error:', error)
      setErrorMessage('تعذر اعتماد المشاركة. حاول مرة أخرى.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  return (
    <Shell>
      <main className="narrow">
        <Hero title="التحدّي القانوني" desc={setData?.title || 'مشاركة أسبوعية'} />

        {phase === 'loading' && <section className="card">جارٍ التحميل…</section>}
        {phase === 'error' && <Note>{errorMessage}</Note>}

        {phase === 'identity' && (
          <section className="card form">
            <label>
              الاسم الثلاثي
              <input value={name} onChange={e => setName(e.target.value)} />
            </label>
            <label>
              رقم الجوال السعودي
              <input
                value={phone}
                maxLength="10"
                inputMode="numeric"
                onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="05XXXXXXXX"
              />
            </label>
            {errorMessage && <Note>{errorMessage}</Note>}
            <button
              className="btn"
              onClick={() => {
                if (name.trim().length < 5 || !/^05\d{8}$/.test(phone)) {
                  setErrorMessage('تحقق من الاسم ورقم الجوال.')
                  return
                }
                setErrorMessage('')
                setPhase('quiz')
              }}
            >
              ابدأ الأسئلة ←
            </button>
          </section>
        )}

        {phase === 'quiz' && (
          <section className="card">
            <small>السؤال {step + 1} من {questions.length}</small>
            <div className="progress">
              <span style={{ width: `${((step + 1) / questions.length) * 100}%` }} />
            </div>
            <h2>{questions[step]?.body}</h2>

            {questions[step]?.options.map((option, index) => (
              <button
                className={'option ' + (answers[questions[step].id] === option.id ? 'chosen' : '')}
                key={option.id}
                onClick={() => setAnswers({ ...answers, [questions[step].id]: option.id })}
              >
                {String.fromCharCode(65 + index)} · {option.label}
              </button>
            ))}

            {errorMessage && <Note>{errorMessage}</Note>}

            <div className="actions">
              <button className="btn secondary" disabled={!step} onClick={() => setStep(step - 1)}>
                السابق
              </button>
              {step < questions.length - 1 ? (
                <button
                  className="btn"
                  onClick={() => {
                    if (!answers[questions[step].id]) {
                      setErrorMessage('اختر إجابة أولًا.')
                      return
                    }
                    setErrorMessage('')
                    setStep(step + 1)
                  }}
                >
                  التالي
                </button>
              ) : (
                <button
                  className="btn"
                  onClick={submitAnswers}
                  disabled={submitting}
                >
                  {submitting ? 'جارٍ اعتماد المشاركة…' : 'اعتماد الإجابات'}
                </button>
              )}
            </div>
          </section>
        )}

        {phase === 'result' && result && (
          <section className="card center">
            <div className="score">{result.score} / {result.total}</div>
            <h2>نتيجتك يا {name}</h2>
            {(result.answer_details || []).map((detail, index) => (
              <article className="review" key={index}>
                <b>السؤال {index + 1}: {detail.is_correct ? 'صحيح' : 'غير صحيح'}</b>
                <p>{detail.question}</p>
                <p>إجابتك: {detail.selected}</p>
                <p>الإجابة الصحيحة: {detail.correct}</p>
                <p>{detail.explanation}</p>
                {detail.source_url && (
                  <a href={detail.source_url} target="_blank" rel="noreferrer">
                    المصدر الرسمي
                  </a>
                )}
              </article>
            ))}
            <Link className="btn" to="/">الرئيسية</Link>
          </section>
        )}
      </main>
    </Shell>
  )
}


function QuestionsAssistant() {
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'مرحبًا! أنا مساعد دقيقة قانونية. أستطيع الإجابة عن الأسئلة والخيارات والإجابات الصحيحة ونتائج المشاركات والإحصائيات من بيانات المنصة.' }])
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function send(event) {
    event.preventDefault()
    const question = draft.trim()
    if (!question || busy) return
    const next = [...messages, { role: 'user', content: question }]
    setMessages(next); setDraft(''); setBusy(true); setError('')
    try {
      const { data, error: invokeError } = await db.functions.invoke('questions-assistant', { body: { messages: next } })
      if (invokeError || !data?.reply) throw new Error(data?.error || invokeError?.message || 'تعذر الحصول على رد.')
      setMessages([...next, { role: 'assistant', content: data.reply }])
    } catch (err) { setError(err.message || 'تعذر الاتصال بالمساعد.') }
    finally { setBusy(false) }
  }
  return (
    <section className="card" style={{ borderColor: 'rgba(217,189,125,.55)' }}>
      <div className="actions" style={{justifyContent:'space-between',alignItems:'center'}}>
        <div><span className="gold">NAHJ AI · QUIZ INSIGHTS</span><h2 style={{margin:'7px 0'}}>مساعد الأسئلة الذكي</h2><small className="muted">متصل ببيانات الأسئلة والإجابات والإحصائيات الفعلية</small></div>
        <span className="mini">AI</span>
      </div>
      <div aria-live="polite" style={{display:'grid',gap:10,maxHeight:360,overflowY:'auto',padding:'14px 0'}}>
        {messages.map((message,index) => <div key={index} style={{justifySelf:message.role==='user'?'end':'start',maxWidth:'92%',padding:12,borderRadius:11,background:message.role==='user'?'rgba(217,189,125,.13)':'#203747',whiteSpace:'pre-wrap',fontSize:13,lineHeight:1.9}}>
          <small className="gold" style={{display:'block',marginBottom:4}}>{message.role==='user'?'أنت':'مساعد دقيقة قانونية'}</small>{message.content}
        </div>)}
        {busy && <Note>جارٍ تحليل بيانات الأسئلة والإحصائيات…</Note>}
      </div>
      {error && <Note>{error}</Note>}
      <form onSubmit={send} style={{display:'flex',gap:9,flexWrap:'wrap'}}>
        <input value={draft} onChange={e=>setDraft(e.target.value)} placeholder="اسأل عن الأسئلة أو الإجابات أو الإحصائيات…" style={{flex:'1 1 260px'}} disabled={busy}/>
        <button className="btn" disabled={busy || !draft.trim()}>{busy?'جارٍ التحليل…':'إرسال السؤال'}</button>
      </form>
      <small className="muted" style={{display:'block',marginTop:9}}>لا تُرسل أسماء المشاركين أو أرقام جوالاتهم إلى خدمة الذكاء الاصطناعي.</small>
    </section>
  )
}

function Admin() {
  const [session, setSession] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [notice, setNotice] = useState('')
  const [sets, setSets] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [activeSet, setActiveSet] = useState(null)
  const [questions, setQuestions] = useState([])
  const [questionBody, setQuestionBody] = useState('')
  const [explanation, setExplanation] = useState('')
  const [lawName, setLawName] = useState('')
  const [articleNumber, setArticleNumber] = useState('')
  const [sourceUrl, setSourceUrl] = useState('')
  const [options, setOptions] = useState(['', '', '', ''])
  const [correctIndex, setCorrectIndex] = useState('0')
  const [savingQuestion, setSavingQuestion] = useState(false)

  const [participations, setParticipations] = useState([])
  const [participationCount, setParticipationCount] = useState(0)
  const [averageScore, setAverageScore] = useState(0)
  const [loadingParticipations, setLoadingParticipations] = useState(false)
  const [participantSearch, setParticipantSearch] = useState('')
  const [answerSummaries, setAnswerSummaries] = useState({})
  const [topTen, setTopTen] = useState([])
  const [loadingTopTen, setLoadingTopTen] = useState(false)
  const [topTenError, setTopTenError] = useState('')
  const [selectedParticipation, setSelectedParticipation] = useState(null)
  const [participationAnswers, setParticipationAnswers] = useState([])
  const [loadingAnswers, setLoadingAnswers] = useState(false)
  const [aiUsage, setAiUsage] = useState(null)
  const [aiUsageLoading, setAiUsageLoading] = useState(false)
  const [aiUsageError, setAiUsageError] = useState('')

  useEffect(() => {
    if (!db) return
    db.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function login(event) {
    event.preventDefault()
    setErrorMessage('')
    const { data, error } = await db.functions.invoke('admin-login', {
      body: { username, password }
    })
    if (error || !data?.access_token) {
      setErrorMessage('تعذر تسجيل الدخول؛ تحقق من بيانات الدخول.')
      return
    }
    const { error: sessionError } = await db.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    })
    if (sessionError) setErrorMessage('تعذر إنشاء جلسة المسؤول.')
  }

  async function loadAiUsage() {
    setAiUsageLoading(true)
    setAiUsageError('')
    const { data, error } = await db.functions.invoke('admin-ai-usage', { body: {} })
    if (error || !data?.usage) {
      setAiUsageError(data?.error || 'تعذر تحميل بيانات استهلاك الذكاء الاصطناعي.')
    } else {
      setAiUsage(data)
    }
    setAiUsageLoading(false)
  }

  async function loadSets() {
    const { data, error } = await db
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setSets(data || [])
  }

  async function loadParticipations() {
    setLoadingParticipations(true)
    setErrorMessage('')

    const { count, error: countError } = await db
      .from('participations')
      .select('id', { count: 'exact', head: true })

    if (countError) {
      setErrorMessage('تعذر تحميل عدد المشاركات: ' + countError.message)
      setLoadingParticipations(false)
      return
    }
    setParticipationCount(count || 0)

    const { data, error } = await db
      .from('participations')
      .select('id,set_id,full_name,phone,score,total,completed_at')
      .order('completed_at', { ascending: false })
      .limit(1000)

    if (error) {
      setErrorMessage('تعذر تحميل سجل المشاركات: ' + error.message)
      setLoadingParticipations(false)
      return
    }

    // ترتيب المشاركات المعروضة من الأقدم إلى الأحدث لعرض أرقام متسلسلة.
    const rows = (data || []).reverse().map(item => ({
      ...item,
      set_title: sets.find(set => set.id === item.set_id)?.title || 'مجموعة أسئلة'
    }))
    setParticipations(rows)

    if (rows.length) {
      const { data: answerRows, error: answersError } = await db
        .from('participation_answers')
        .select('participation_id,is_correct,options(label)')
        .in('participation_id', rows.map(row => row.id))

      if (answersError) {
        console.error('تعذر تحميل ملخص الإجابات:', answersError)
        setAnswerSummaries({})
      } else {
        const summaries = {}
        ;(answerRows || []).forEach(answer => {
          if (!summaries[answer.participation_id]) summaries[answer.participation_id] = { labels: [], correct: 0, total: 0 }
          summaries[answer.participation_id].total += 1
          if (answer.is_correct) summaries[answer.participation_id].correct += 1
          if (answer.options?.label) summaries[answer.participation_id].labels.push(answer.options.label)
        })
        setAnswerSummaries(summaries)
      }
    } else {
      setAnswerSummaries({})
    }

    const percentages = rows.filter(row => Number(row.total) > 0)
      .map(row => (Number(row.score) / Number(row.total)) * 100)
    setAverageScore(percentages.length ? percentages.reduce((sum, value) => sum + value, 0) / percentages.length : 0)
    setLoadingParticipations(false)
  }

  async function loadTopTen() {
    setLoadingTopTen(true)
    setTopTenError('')
    const { data, error } = await db
      .from('admin_top_ten_perfect_participants')
      .select('id,full_name,score,total,completed_at')
      .order('completed_at', { ascending: true })
      .order('id', { ascending: true })
      .limit(10)

    if (error) {
      console.error('Top ten error:', error)
      setTopTenError('تعذر تحميل العشرة الأوائل. نفّذي استعلام إعداد القائمة أولًا.')
      setTopTen([])
    } else {
      setTopTen((data || []).filter(row => Number(row.total) > 0 && Number(row.score) === Number(row.total)))
    }
    setLoadingTopTen(false)
  }

  async function openParticipation(participation) {
    setSelectedParticipation(participation)
    setParticipationAnswers([])
    setLoadingAnswers(true)
    setErrorMessage('')

    const { data, error } = await db
      .from('participation_answers')
      .select('id,question_id,option_id,is_correct')
      .eq('participation_id', participation.id)

    if (error) {
      setErrorMessage('تعذر تحميل الإجابات: ' + error.message)
      setLoadingAnswers(false)
      return
    }

    const questionIds = [...new Set((data || []).map(row => row.question_id))]
    const optionIds = [...new Set((data || []).map(row => row.option_id))]

    const [{ data: questionRows, error: questionsError }, { data: optionRows, error: optionsError }] =
      await Promise.all([
        db.from('questions')
          .select('id,body,explanation,law_name,article_number,source_url')
          .in('id', questionIds),
        db.from('options')
          .select('id,label,question_id,is_correct')
          .in('id', optionIds)
      ])

    if (questionsError || optionsError) {
      setErrorMessage(
        'تعذر تحميل نص الأسئلة والخيارات: ' +
        (questionsError?.message || optionsError?.message || '')
      )
      setLoadingAnswers(false)
      return
    }

    const combined = (data || []).map(answer => {
      const question = questionRows?.find(row => row.id === answer.question_id)
      const selectedOption = optionRows?.find(row => row.id === answer.option_id)

      return {
        ...answer,
        question,
        selectedOption
      }
    })

    setParticipationAnswers(combined)
    setLoadingAnswers(false)
  }

  useEffect(() => {
    if (session) loadSets()
  }, [session])

  useEffect(() => {
    if (session) {
      loadParticipations()
      loadTopTen()
      loadAiUsage()
    }
  }, [session, sets])

  async function addSet(event) {
    event.preventDefault()
    setErrorMessage('')
    const { error } = await db.from('question_sets').insert({
      title: title.trim(),
      description: description.trim(),
      status: 'draft'
    })
    if (error) {
      setErrorMessage(error.message)
      return
    }
    setTitle('')
    setDescription('')
    setNotice('تم حفظ مجموعة الأسئلة كمسودة.')
    await loadSets()
  }

  async function openSet(set) {
    setActiveSet(set)
    setErrorMessage('')
    setNotice('')
    const { data, error } = await db
      .from('questions')
      .select('id,body,explanation,law_name,article_number,source_url,position,options(id,label,is_correct,position)')
      .eq('set_id', set.id)
      .order('position', { ascending: true })

    if (error) {
      setErrorMessage('تعذر تحميل الأسئلة: ' + error.message)
      setQuestions([])
      return
    }

    setQuestions((data || []).map(question => ({
      ...question,
      options: (question.options || []).sort((a, b) => a.position - b.position)
    })))
  }

  async function saveQuestion(event) {
    event.preventDefault()
    if (!activeSet) return

    if (!questionBody.trim() || options.some(option => !option.trim()) || !explanation.trim()) {
      setErrorMessage('أكملي نص السؤال والخيارات الأربعة والتفسير.')
      return
    }

    setSavingQuestion(true)
    setErrorMessage('')
    setNotice('')

    const nextPosition = questions.reduce(
      (max, question) => Math.max(max, question.position || 0), 0
    ) + 1

    const { data: question, error: questionError } = await db
      .from('questions')
      .insert({
        set_id: activeSet.id,
        body: questionBody.trim(),
        explanation: explanation.trim(),
        law_name: lawName.trim() || null,
        article_number: articleNumber.trim() || null,
        source_url: sourceUrl.trim() || null,
        position: nextPosition
      })
      .select('id')
      .single()

    if (questionError || !question) {
      setErrorMessage('تعذر حفظ السؤال: ' + (questionError?.message || 'خطأ غير معروف'))
      setSavingQuestion(false)
      return
    }

    const optionRows = options.map((label, index) => ({
      question_id: question.id,
      label: label.trim(),
      is_correct: index === Number(correctIndex),
      position: index + 1
    }))

    const { error: optionsError } = await db.from('options').insert(optionRows)

    if (optionsError) {
      setErrorMessage('تم حفظ السؤال لكن تعذر حفظ الخيارات: ' + optionsError.message)
      setSavingQuestion(false)
      await openSet(activeSet)
      return
    }

    setQuestionBody('')
    setExplanation('')
    setLawName('')
    setArticleNumber('')
    setSourceUrl('')
    setOptions(['', '', '', ''])
    setCorrectIndex('0')
    setNotice('تم حفظ السؤال وخياراته بنجاح.')
    setSavingQuestion(false)
    await openSet(activeSet)
  }

  async function changeStatus(id, status) {
    setErrorMessage('')
    const { error } = await db
      .from('question_sets')
      .update({ status })
      .eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setNotice(status === 'published' ? 'تم نشر المجموعة.' : 'تمت أرشفة المجموعة.')
    await loadSets()
  }

  if (!ready) {
    return (
      <Shell>
        <main className="narrow">
          <Hero title="دخول المسؤولين" desc="مساحة خاصة بالمسؤولين." />
          <Note>المنصة قيد الإعداد.</Note>
        </main>
      </Shell>
    )
  }

  return (
    <Shell>
      <main className="narrow">
        <Hero title="لوحة الإدارة" desc="مساحة خاصة بإدارة دقيقة قانونية." />

        {!session ? (
          <form className="card form" onSubmit={login}>
            <label>
              اسم المستخدم
              <input value={username} onChange={e => setUsername(e.target.value)} required />
            </label>
            <label>
              كلمة المرور
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
            </label>
            {errorMessage && <Note>{errorMessage}</Note>}
            <button className="btn">تسجيل الدخول</button>
          </form>
        ) : (
          <>
            <section className="card">
              <h2>منظومة قياس الأثر والاستدامة</h2>
              <p>استعراض التقارير المحفوظة ومتابعة مراجعتها وأرشفتها.</p>
              <Link className="btn" to="/admin/impact">فتح سجل تقارير الأثر ←</Link>
            </section>
            <section className="card">
              <div className="actions" style={{justifyContent:'space-between',alignItems:'center'}}>
                <h2>استهلاك الذكاء الاصطناعي للمرافعات</h2>
                <button type="button" className="mini" onClick={loadAiUsage} disabled={aiUsageLoading}>تحديث</button>
              </div>
              {aiUsageLoading ? <Note>جارٍ تحميل بيانات الاستهلاك…</Note> : aiUsageError ? <Note>{aiUsageError}</Note> : aiUsage ? (
                <div className="impact-admin-stats">
                  <div><strong>{aiUsage.usage.request_count.toLocaleString('ar-SA')}</strong><span>طلبات هذا الشهر</span></div>
                  <div><strong>{aiUsage.monthly_limit ? aiUsage.monthly_limit.toLocaleString('ar-SA') : '—'}</strong><span>السقف الشهري</span></div>
                  <div><strong>{(aiUsage.usage.actual_input_tokens || 0).toLocaleString('ar-SA')}</strong><span>رموز الإدخال</span></div>
                  <div><strong>{(aiUsage.usage.actual_output_tokens || 0).toLocaleString('ar-SA')}</strong><span>رموز الإخراج</span></div>
                </div>
              ) : <Note>لا توجد بيانات استهلاك بعد.</Note>}
              {aiUsage && !aiUsage.configured && <Note>التقييم الآلي للمرافعات متوقف حتى يتم تحديد سقف ADVOCACY_AI_MONTHLY_LIMIT في إعدادات Supabase.</Note>}
              {aiUsage?.usage?.failed_count > 0 && <p className="muted">محاولات تقييم المرافعات المتعثرة هذا الشهر: {aiUsage.usage.failed_count}</p>}
              {aiUsage && <>
                <h3>مساعد «أثَر»</h3>
                <div className="impact-admin-stats">
                  <div><strong>{aiUsage.impact_usage.request_count.toLocaleString('ar-SA')}</strong><span>طلبات هذا الشهر</span></div>
                  <div><strong>{aiUsage.impact_monthly_limit ? aiUsage.impact_monthly_limit.toLocaleString('ar-SA') : '—'}</strong><span>السقف الشهري</span></div>
                  <div><strong>{(aiUsage.impact_usage.actual_input_tokens || 0).toLocaleString('ar-SA')}</strong><span>رموز الإدخال</span></div>
                  <div><strong>{(aiUsage.impact_usage.actual_output_tokens || 0).toLocaleString('ar-SA')}</strong><span>رموز الإخراج</span></div>
                </div>
                {!aiUsage.impact_configured && <Note>مساعد أثَر متوقف حتى يتم تحديد سقف IMPACT_AI_MONTHLY_LIMIT في إعدادات Supabase.</Note>}
                {aiUsage.impact_usage.failed_count > 0 && <p className="muted">طلبات مساعد أثَر المتعثرة هذا الشهر: {aiUsage.impact_usage.failed_count}</p>}
              </>}
            </section>
            <QuestionsAssistant />\n            <section className="card">
              <h2>إدارة المرافعة القانونية</h2>
              <p>إدارة مستقلة لقضايا المرافعة ومراحلها وسجل متسابقيها.</p>
              <Link className="btn" to="/admin/advocacy">فتح إدارة المرافعة ←</Link>
            </section>
            <form className="card form" onSubmit={addSet}>
              <h2>إنشاء مجموعة أسئلة (مسودة)</h2>
              <label>
                العنوان
                <input value={title} onChange={e => setTitle(e.target.value)} required />
              </label>
              <label>
                الوصف
                <textarea value={description} onChange={e => setDescription(e.target.value)} />
              </label>
              <button className="btn">حفظ المسودة</button>
              <button type="button" className="btn secondary" onClick={() => db.auth.signOut()}>
                تسجيل الخروج
              </button>
            </form>

            {errorMessage && <Note>{errorMessage}</Note>}
            {notice && <Note>{notice}</Note>}

            <section className="card">
              <div className="actions" style={{ justifyContent: 'space-between' }}>
                <h2>إحصائيات المشاركات</h2>
                <button type="button" className="mini" onClick={() => { loadParticipations(); loadTopTen() }} disabled={loadingParticipations || loadingTopTen}>تحديث البيانات</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, marginTop: 14 }}>
                <div style={{ textAlign: 'center', padding: '16px 10px', border: '1px solid rgba(185, 148, 82, 0.28)', borderRadius: 14, background: 'rgba(185, 148, 82, 0.06)', minWidth: 0 }}>
                  <small className="gold" style={{ display: 'block', fontSize: 12 }}>إجمالي المشاركات</small>
                  <div style={{ fontSize: 'clamp(25px, 5vw, 34px)', fontWeight: 800, lineHeight: 1.3, marginTop: 5 }}>{participationCount.toLocaleString('ar-SA')}</div>
                </div>
                <div style={{ textAlign: 'center', padding: '16px 10px', border: '1px solid rgba(185, 148, 82, 0.28)', borderRadius: 14, background: 'rgba(185, 148, 82, 0.06)', minWidth: 0 }}>
                  <small className="gold" style={{ display: 'block', fontSize: 12 }}>متوسط المشاركات المعروضة</small>
                  <div style={{ fontSize: 'clamp(25px, 5vw, 34px)', fontWeight: 800, lineHeight: 1.3, marginTop: 5 }}>{averageScore.toFixed(1)}%</div>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <div>
                  <h2 style={{ marginBottom: 4 }}>العشرة الأوائل</h2>
                  <small className="gold">أول عشرة مشاركين يحققون الدرجة الكاملة حسب وقت إكمال المشاركة</small>
                </div>
                <button type="button" className="mini" onClick={loadTopTen} disabled={loadingTopTen}>تحديث القائمة</button>
              </div>
              {loadingTopTen ? <Note>جارٍ تحميل العشرة الأوائل…</Note> : topTenError ? <Note>{topTenError}</Note> : topTen.length ? (
                <div style={{ overflowX: 'auto', marginTop: 12 }}>
                  <table style={{ width: '100%', minWidth: 460, borderCollapse: 'collapse', textAlign: 'right' }}>
                    <thead><tr>{['الترتيب', 'الاسم', 'النتيجة', 'وقت الإكمال'].map(label => <th key={label} style={{ color: '#c7a96b', padding: '12px 10px', borderBottom: '1px solid rgba(199,169,107,.35)', whiteSpace: 'nowrap' }}>{label}</th>)}</tr></thead>
                    <tbody>{topTen.map((row, index) => <tr key={row.id}>
                      <td style={{ padding: '13px 10px', borderBottom: '1px solid rgba(199,169,107,.16)' }}>{index + 1}</td>
                      <td style={{ padding: '13px 10px', borderBottom: '1px solid rgba(199,169,107,.16)' }}>{row.full_name}</td>
                      <td style={{ padding: '13px 10px', borderBottom: '1px solid rgba(199,169,107,.16)', whiteSpace: 'nowrap' }}>{row.score} / {row.total}</td>
                      <td style={{ padding: '13px 10px', borderBottom: '1px solid rgba(199,169,107,.16)', whiteSpace: 'nowrap' }}>{formatDate(row.completed_at)}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              ) : <Note>لا يوجد مشاركون حققوا الدرجة الكاملة حتى الآن.</Note>}
            </section>

            <section className="card">
              <div className="actions" style={{ justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap' }}>
                <h2>سجل المشاركات</h2>
                <button type="button" className="mini" onClick={loadParticipations} disabled={loadingParticipations}>تحديث السجل</button>
              </div>
              <input type="search" value={participantSearch} onChange={event => setParticipantSearch(event.target.value)} placeholder="بحث بالاسم أو رقم الجوال…" aria-label="بحث بالاسم أو رقم الجوال" style={{ width: '100%', margin: '14px 0 18px', boxSizing: 'border-box' }} />
              {loadingParticipations ? <Note>جارٍ تحميل سجل المشاركات…</Note> : (() => {
                const term = participantSearch.trim().toLowerCase()
                const filtered = participations.filter(row => (row.full_name || '').toLowerCase().includes(term) || (row.phone || '').includes(term))
                return filtered.length ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse', textAlign: 'right' }}>
                      <thead><tr>{['#', 'الاسم الثلاثي', 'رقم الجوال', 'الحالة', 'الدرجة', 'التفاصيل'].map(label => <th key={label} style={{ color: '#c7a96b', padding: '13px 10px', borderBottom: '1px solid rgba(199,169,107,.4)', whiteSpace: 'nowrap' }}>{label}</th>)}</tr></thead>
                      <tbody>{filtered.map((row, index) => {
                        const summary = answerSummaries[row.id]
                        const isPerfect = Number(row.total) > 0 && Number(row.score) === Number(row.total)
                        return <tr key={row.id}>
                          <td style={{ padding: '15px 10px', borderBottom: '1px solid rgba(199,169,107,.18)' }}>{index + 1}</td>
                          <td style={{ padding: '15px 10px', borderBottom: '1px solid rgba(199,169,107,.18)', minWidth: 140 }}>{row.full_name}</td>
                          <td style={{ padding: '15px 10px', borderBottom: '1px solid rgba(199,169,107,.18)', whiteSpace: 'nowrap' }}>{row.phone || '—'}</td>
                          <td style={{ padding: '15px 10px', borderBottom: '1px solid rgba(199,169,107,.18)', whiteSpace: 'nowrap' }}><span style={{ display: 'inline-block', padding: '5px 10px', borderRadius: 9, background: isPerfect ? 'rgba(35,185,145,.16)' : 'rgba(190,145,70,.14)', color: isPerfect ? '#54d6b3' : '#d6b66e' }}>{isPerfect ? 'صحيحة' : 'غير مكتملة'}</span></td>
                          <td style={{ padding: '15px 10px', borderBottom: '1px solid rgba(199,169,107,.18)', whiteSpace: 'nowrap' }}>{row.score} / {row.total}</td>
                          <td style={{ padding: '15px 10px', borderBottom: '1px solid rgba(199,169,107,.18)' }}><button type="button" className="mini" onClick={() => openParticipation(row)}>عرض</button></td>
                        </tr>
                      })}</tbody>
                    </table>
                  </div>
                ) : <Note>{participations.length ? 'لا توجد نتائج مطابقة للبحث.' : 'لا توجد مشاركات مسجلة حتى الآن.'}</Note>
              })()}
            </section>

            {selectedParticipation && (
              <section className="card">
                <div className="actions" style={{ justifyContent: 'space-between' }}>
                  <h2>تفاصيل المشاركة</h2>
                  <button
                    type="button"
                    className="mini"
                    onClick={() => {
                      setSelectedParticipation(null)
                      setParticipationAnswers([])
                    }}
                  >
                    إغلاق التفاصيل
                  </button>
                </div>

                <h3>{selectedParticipation.full_name}</h3>
                <p>رقم الجوال: {selectedParticipation.phone || 'غير محفوظ'}</p>
                <p>الدرجة: {selectedParticipation.score} / {selectedParticipation.total}</p>
                <p>تاريخ المشاركة: {formatDate(selectedParticipation.completed_at)}</p>

                {loadingAnswers ? (
                  <Note>جارٍ تحميل الإجابات…</Note>
                ) : participationAnswers.length ? (
                  participationAnswers.map((answer, index) => (
                    <article className="review" key={answer.id}>
                      <b>
                        السؤال {index + 1} — {answer.is_correct ? 'إجابة صحيحة' : 'إجابة غير صحيحة'}
                      </b>
                      <p>{answer.question?.body || 'نص السؤال غير متوفر'}</p>
                      <p>إجابة المشارك: {answer.selectedOption?.label || 'غير متوفرة'}</p>
                      <p>النتيجة: {answer.is_correct ? 'صحيح' : 'غير صحيح'}</p>
                      {answer.question?.explanation && <p>التفسير: {answer.question.explanation}</p>}
                      {answer.question?.law_name && <p>النظام: {answer.question.law_name}</p>}
                      {answer.question?.article_number && <p>المادة: {answer.question.article_number}</p>}
                      {answer.question?.source_url && (
                        <a href={answer.question.source_url} target="_blank" rel="noreferrer">
                          فتح المصدر الرسمي
                        </a>
                      )}
                    </article>
                  ))
                ) : (
                  <Note>لم يتم العثور على تفاصيل الإجابات.</Note>
                )}
              </section>
            )}

            <section className="card">
              <h2>مجموعات الأسئلة</h2>
              {sets.map(set => (
                <div className="leader" key={set.id}>
                  <span>{set.title} — {set.status}</span>
                  <div className="actions">
                    <button className="mini" type="button" onClick={() => openSet(set)}>
                      إدارة الأسئلة
                    </button>
                    {set.status !== 'published' && (
                      <button className="mini" type="button" onClick={() => changeStatus(set.id, 'published')}>
                        نشر
                      </button>
                    )}
                    {set.status !== 'archived' && (
                      <button className="mini" type="button" onClick={() => changeStatus(set.id, 'archived')}>
                        أرشفة
                      </button>
                    )}
                    {set.status !== 'draft' && (
                      <button className="mini" type="button" onClick={() => changeStatus(set.id, 'draft')}>
                        إعادة كمسودة
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </section>

            {activeSet && (
              <section className="card form">
                <div className="actions" style={{ justifyContent: 'space-between' }}>
                  <h2>إدارة أسئلة: {activeSet.title}</h2>
                  <button type="button" className="mini" onClick={() => setActiveSet(null)}>
                    إغلاق
                  </button>
                </div>

                <h3>الأسئلة المحفوظة ({questions.length})</h3>
                {questions.map((question, index) => (
                  <article className="review" key={question.id}>
                    <b>{index + 1}. {question.body}</b>
                    <p>
                      الإجابة الصحيحة:{' '}
                      {question.options?.find(option => option.is_correct)?.label || 'غير محددة'}
                    </p>
                    <small>{question.law_name || ''} {question.article_number || ''}</small>
                  </article>
                ))}

                <hr />
                <h3>إضافة سؤال جديد</h3>

                <label>
                  نص السؤال
                  <textarea value={questionBody} onChange={e => setQuestionBody(e.target.value)} required />
                </label>
                <label>
                  اسم النظام
                  <input value={lawName} onChange={e => setLawName(e.target.value)} placeholder="مثال: نظام المرافعات الشرعية" />
                </label>
                <label>
                  رقم المادة
                  <input value={articleNumber} onChange={e => setArticleNumber(e.target.value)} placeholder="مثال: المادة ٧٦" />
                </label>
                <label>
                  رابط المصدر الرسمي
                  <input type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)} placeholder="https://..." />
                </label>

                <h3>الخيارات (أربعة خيارات)</h3>
                {options.map((option, index) => (
                  <label key={index}>
                    الخيار {index + 1}
                    <input
                      value={option}
                      onChange={e => setOptions(current =>
                        current.map((value, optionIndex) =>
                          optionIndex === index ? e.target.value : value
                        )
                      )}
                      required
                    />
                  </label>
                ))}

                <label>
                  الإجابة الصحيحة
                  <select value={correctIndex} onChange={e => setCorrectIndex(e.target.value)}>
                    {options.map((_, index) => (
                      <option key={index} value={String(index)}>الخيار {index + 1}</option>
                    ))}
                  </select>
                </label>

                <label>
                  تفسير الإجابة
                  <textarea value={explanation} onChange={e => setExplanation(e.target.value)} required />
                </label>

                <button
                  className="btn"
                  type="button"
                  disabled={savingQuestion}
                  onClick={saveQuestion}
                >
                  {savingQuestion ? 'جارٍ الحفظ…' : 'حفظ السؤال والخيارات'}
                </button>
              </section>
            )}
          </>
        )}
      </main>
    </Shell>
  )
}


export default function App() {
  const { pathname } = useLocation()
  const basePath = import.meta.env.BASE_URL || '/'
  const path = pathname.startsWith(basePath)
    ? `/${pathname.slice(basePath.length)}`.replace(/\/{2,}/g, '/')
    : pathname

  if (path.startsWith('/participate/')) return <Participate />
  if (path === '/archive') return <Archive />
  if (path === '/competitions') return <Competitions />
  if (path.startsWith('/rate/')) return <ImpactSurveyPublic token={path.slice('/rate/'.length).split('/')[0]} />
  if (path === '/impact') return <Shell><ImpactHome /></Shell>
  if (path === '/assistant') return <Shell><ImpactAssistantHome /></Shell>
  if (path === '/impact/meetings' || path === '/impact/teams' || path === '/impact/partners' || path === '/impact/general') return <Shell><ImpactCategoryDashboard category={path.split('/')[2]} /></Shell>
  if (path.startsWith('/impact/assistant/')) return <Shell><ImpactPortal portal={path.slice('/impact/assistant/'.length).split('/')[0]} /></Shell>
  if (path === '/admin/impact/surveys') return <Shell><ImpactSurveyAdmin /></Shell>
  if (path.startsWith('/impact/')) return <Shell><ImpactPortal portal={path.slice('/impact/'.length).split('/')[0]} /></Shell>
  if (path === '/advocacy') return <Advocacy />
  if (path === '/admin/advocacy') return <AdvocacyAdmin />
  if (path === '/admin/impact') return <Shell><ImpactAdmin /></Shell>
  if (path === '/admin') return <Admin />
  return <Home />
}
