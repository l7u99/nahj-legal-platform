import { useEffect, useState } from 'react'
import { Link, useParams, useLocation } from 'react-router-dom'
import { db, ready } from './lib'

function Header() {
  return (
    <header>
      <Link to="/" className="brand">
        <img
          src={`${import.meta.env.BASE_URL}nahj-logo.png`}
          alt="شعار نهج القانوني"
          style={{
            width: '76px',
            height: '76px',
            objectFit: 'contain',
            borderRadius: '12px'
          }}
        />
        <span>
          نهج القانوني
          <small>المعرفة القانونية تبدأ بسؤال</small>
        </span>
      </Link>

      <nav>
        <Link to="/">الرئيسية</Link>
        <Link to="/leaders">المتصدرون</Link>
        <Link to="/admin">دخول المسؤولين</Link>
      </nav>
    </header>
  )
}

function Shell({ children }) {
  return (
    <div className="site">
      <Header />
      {children}
      <footer>© 2026 نهج القانوني · دقيقة قانونية</footer>
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

function Home() {
  const [questionSet, setQuestionSet] = useState(null)

  useEffect(() => {
    if (!ready) return

    db.from('question_sets')
      .select('id,title,description')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setQuestionSet(data))
  }, [])

  return (
    <Shell>
      <main>
        <Hero
          title={<>دقيقة قانونية <i>|</i> مع نهج القانوني</>}
          desc="مساحة أسبوعية للتعلّم، وفرصة جديدة لاختبار معرفتك القانونية."
        />

        <div className="cols">
          <section className="card">
            <small className="gold">التحدّي القانوني الأسبوعي</small>
            <h2>معرفةٌ تُبنى بسؤال، وثقافةٌ تنمو بالممارسة.</h2>
            <p>
              اختبر معلوماتك القانونية من خلال أسئلة مختارة،
              مع تفسير للإجابة ومصدرها النظامي.
            </p>

            <div className="chips">
              <span>أسئلة موثقة</span>
              <span>نتيجة فورية</span>
              <span>متصدرون أسبوعيًا</span>
            </div>
          </section>

          <section className="card center">
            <div className="seal">⚖</div>
            <h2>هل أنت مستعد للتحدّي؟</h2>

            {!ready ? (
              <Note>
                المنصة قيد التجهيز، وسيتم تفعيل المشاركة بعد ربط قاعدة البيانات.
              </Note>
            ) : questionSet ? (
              <>
                <p>{questionSet.title}</p>
                <Link
                  className="btn"
                  to={`/participate/${questionSet.id}`}
                >
                  ابدأ المشاركة ←
                </Link>
              </>
            ) : (
              <Note>لا توجد مجموعة أسئلة منشورة حاليًا.</Note>
            )}

            <small className="muted">
              بيانات المشاركة لا تظهر للعامة.
            </small>
          </section>
        </div>
      </main>
    </Shell>
  )
}

function Leaders() {
  const [rows, setRows] = useState([])

  useEffect(() => {
    if (!ready) return

    db.from('weekly_leaderboard')
      .select('display_name,score')
      .order('score', { ascending: false })
      .limit(10)
      .then(({ data }) => setRows(data || []))
  }, [])

  return (
    <Shell>
      <main className="narrow">
        <Hero
          title="العشرة الأوائل"
          desc="التميّز القانوني يبدأ بالمعرفة."
        />

        <section className="card">
          <h2>قائمة المتصدرين الأسبوعية</h2>

          {!ready ? (
            <Note>ستظهر القائمة بعد ربط قاعدة البيانات.</Note>
          ) : rows.length ? (
            rows.map((row, index) => (
              <div className="leader" key={index}>
                <b>{index + 1}. {row.display_name}</b>
                <strong>{row.score} / 3</strong>
              </div>
            ))
          ) : (
            <Note>لا يوجد متصدرون لهذا الأسبوع حتى الآن.</Note>
          )}
        </section>
      </main>
    </Shell>
  )
}

function Participate() {
  const { id } = useParams()

  const [setData, setSetData] = useState(null)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [questions, setQuestions] = useState([])
  const [answers, setAnswers] = useState({})
  const [step, setStep] = useState(0)
  const [phase, setPhase] = useState('loading')
  const [result, setResult] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!ready) {
      setErrorMessage('المنصة غير مربوطة بعد.')
      setPhase('error')
      return
    }

    db.from('question_sets')
      .select(`
        id,
        title,
        questions(
          id,
          body,
          explanation,
          law_name,
          article_number,
          source_url,
          position,
          options(id,label,position)
        )
      `)
      .eq('id', id)
      .eq('status', 'published')
      .maybeSingle()
      .then(({ data, error }) => {
        if (error || !data) {
          setErrorMessage('المسابقة غير متاحة.')
          setPhase('error')
          return
        }

        const sortedQuestions = (data.questions || [])
          .sort((a, b) => a.position - b.position)

        sortedQuestions.forEach(question => {
          question.options.sort((a, b) => a.position - b.position)
        })

        setSetData(data)
        setQuestions(sortedQuestions)
        setPhase('identity')
      })
  }, [id])

  async function submitAnswers() {
    if (Object.keys(answers).length !== questions.length) {
      setErrorMessage('أجب عن جميع الأسئلة.')
      return
    }

    const { data, error } = await db.functions.invoke(
      'submit-participation',
      {
        body: {
          p_name: name,
          p_phone: phone,
          set_id: id,
          answers: questions.map(question => ({
            question_id: question.id,
            option_id: answers[question.id]
          }))
        }
      }
    )

    if (error || !data?.result) {
      setErrorMessage('تعذر اعتماد المشاركة.')
      return
    }

    setResult(data.result)
    setPhase('result')
  }

  return (
    <Shell>
      <main className="narrow">
        <Hero
          title="التحدّي القانوني"
          desc={setData?.title || 'مشاركة أسبوعية'}
        />

        {phase === 'loading' && (
          <section className="card">جارٍ التحميل…</section>
        )}

        {phase === 'error' && (
          <Note>{errorMessage}</Note>
        )}

        {phase === 'identity' && (
          <section className="card form">
            <label>
              الاسم الثلاثي
              <input
                value={name}
                onChange={event => setName(event.target.value)}
              />
            </label>

            <label>
              رقم الجوال السعودي
              <input
                value={phone}
                maxLength="10"
                onChange={event =>
                  setPhone(event.target.value.replace(/\D/g, ''))
                }
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
            <small>
              السؤال {step + 1} من {questions.length}
            </small>

            <div className="progress">
              <span
                style={{
                  width: `${((step + 1) / questions.length) * 100}%`
                }}
              />
            </div>

            <h2>{questions[step]?.body}</h2>

            {questions[step]?.options.map((option, index) => (
              <button
                className={
                  'option ' +
                  (answers[questions[step].id] === option.id ? 'chosen' : '')
                }
                key={option.id}
                onClick={() =>
                  setAnswers({
                    ...answers,
                    [questions[step].id]: option.id
                  })
                }
              >
                {String.fromCharCode(65 + index)} · {option.label}
              </button>
            ))}

            {errorMessage && <Note>{errorMessage}</Note>}

            <div className="actions">
              <button
                className="btn secondary"
                disabled={!step}
                onClick={() => setStep(step - 1)}
              >
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
                <button className="btn" onClick={submitAnswers}>
                  اعتماد الإجابات
                </button>
              )}
            </div>
          </section>
        )}

        {phase === 'result' && result && (
          <section className="card center">
            <div className="score">
              {result.score} / {result.total}
            </div>

            <h2>نتيجتك يا {name}</h2>

            {result.answer_details.map((detail, index) => (
              <article className="review" key={index}>
                <b>
                  السؤال {index + 1}: {detail.is_correct ? 'صحيح' : 'غير صحيح'}
                </b>

                <p>{detail.question}</p>
                <p>الإجابة الصحيحة: {detail.correct}</p>
                <p>{detail.explanation}</p>

                <a
                  href={detail.source_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  المصدر الرسمي
                </a>
              </article>
            ))}

            <Link className="btn" to="/">
              الرئيسية
            </Link>
          </section>
        )}
      </main>
    </Shell>
  )
}

function Admin() {
  const [session, setSession] = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState('')
  const [sets, setSets] = useState([])
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    if (!db) return

    db.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription }
    } = db.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession)
    })

    return () => subscription.unsubscribe()
  }, [])

  async function login(event) {
    event.preventDefault()
    setErrorMessage('')

    const { data, error } = await db.functions.invoke('admin-login', {
      body: {
        username,
        password
      }
    })

    if (error || !data?.access_token) {
      setErrorMessage('تعذر تسجيل الدخول؛ تحقق من بيانات الدخول وإعداد الدالة.')
      return
    }

    const { error: sessionError } = await db.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token
    })

    if (sessionError) {
      setErrorMessage('تعذر إنشاء جلسة المسؤول.')
    }
  }

  async function loadSets() {
    const { data } = await db
      .from('question_sets')
      .select('*')
      .order('created_at', { ascending: false })

    setSets(data || [])
  }

  useEffect(() => {
    if (session) loadSets()
  }, [session])

  async function addSet(event) {
    event.preventDefault()

    const { error } = await db.from('question_sets').insert({
      title,
      description,
      status: 'draft'
    })

    if (error) {
      setErrorMessage(error.message)
      return
    }

    setTitle('')
    setDescription('')
    loadSets()
  }

  async function changeStatus(id, status) {
    const { error } = await db
      .from('question_sets')
      .update({ status })
      .eq('id', id)

    if (error) {
      setErrorMessage(error.message)
      return
    }

    loadSets()
  }

  if (!ready) {
    return (
      <Shell>
        <main className="narrow">
          <Hero
            title="دخول المسؤولين"
            desc="مساحة خاصة بالمسؤولين."
          />
          <Note>المنصة قيد الإعداد.</Note>
        </main>
      </Shell>
    )
  }

  return (
    <Shell>
      <main className="narrow">
        <Hero
          title="لوحة الإدارة"
          desc="مساحة خاصة بإدارة دقيقة قانونية."
        />

        {!session ? (
          <form className="card form" onSubmit={login}>
            <label>
              اسم المستخدم
              <input
                value={username}
                onChange={event => setUsername(event.target.value)}
                required
              />
            </label>

            <label>
              كلمة المرور
              <input
                type="password"
                value={password}
                onChange={event => setPassword(event.target.value)}
                required
              />
            </label>

            {errorMessage && <Note>{errorMessage}</Note>}

            <button className="btn">تسجيل الدخول</button>
          </form>
        ) : (
          <>
            <form className="card form" onSubmit={addSet}>
              <h2>إنشاء مجموعة أسئلة (مسودة)</h2>

              <label>
                العنوان
                <input
                  value={title}
                  onChange={event => setTitle(event.target.value)}
                  required
                />
              </label>

              <label>
                الوصف
                <textarea
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                />
              </label>

              <button className="btn">حفظ المسودة</button>

              <button
                type="button"
                className="btn secondary"
                onClick={() => db.auth.signOut()}
              >
                تسجيل الخروج
              </button>
            </form>

            <section className="card">
              <h2>مجموعات الأسئلة</h2>

              {sets.map(set => (
                <div className="leader" key={set.id}>
                  <span>
                    {set.title} — {set.status}
                  </span>

                  <button
                    className="mini"
                    onClick={() =>
                      changeStatus(
                        set.id,
                        set.status === 'published' ? 'archived' : 'published'
                      )
                    }
                  >
                    {set.status === 'published' ? 'أرشفة' : 'نشر'}
                  </button>
                </div>
              ))}
            </section>
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

  if (path.startsWith('/participate/')) {
    return <Participate />
  }

  if (path === '/leaders') {
    return <Leaders />
  }

  if (path === '/admin') {
    return <Admin />
  }

  return <Home />
}
