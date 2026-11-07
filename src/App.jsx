
import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
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
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadHome() {
      if (!ready) {
        setLoading(false)
        return
      }

      const { data, error } = await db
        .from('question_sets')
        .select('id,title,description')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error('Home question set error:', error)
        setQuestionSet(null)
      } else {
        setQuestionSet(data)
      }

      setLoading(false)
    }

    loadHome()
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

            {loading ? (
              <Note>جارٍ تحميل المسابقة…</Note>
            ) : !ready ? (
              <Note>المنصة قيد التجهيز.</Note>
            ) : questionSet ? (
              <>
                <p>{questionSet.title}</p>
                <Link className="btn" to={`/participate/${questionSet.id}`}>
                  ابدأ المشاركة ←
                </Link>
              </>
            ) : (
              <Note>لا توجد مجموعة أسئلة منشورة حاليًا.</Note>
            )}

            <small className="muted">بيانات المشاركة لا تظهر للعامة.</small>
          </section>
        </div>
      </main>
    </Shell>
  )
}

function Leaders() {
  const [rows, setRows] = useState([])
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    async function loadLeaders() {
      if (!ready) return

      const { data, error } = await db
        .from('weekly_leaderboard')
        .select('display_name,score')
        .order('score', { ascending: false })
        .limit(10)

      if (error) {
        setErrorMessage('تعذر تحميل قائمة المتصدرين.')
        return
      }

      setRows(data || [])
    }

    loadLeaders()
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
          ) : errorMessage ? (
            <Note>{errorMessage}</Note>
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
  const { pathname } = useLocation()
  const id = pathname.split('/').filter(Boolean).at(-1)

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

  useEffect(() => {
    async function loadPublishedSet() {
      if (!ready || !id) {
        setErrorMessage('تعذر تحديد المسابقة المطلوبة.')
        setPhase('error')
        return
      }

      setPhase('loading')
      setErrorMessage('')

      const { data: publishedSet, error: setError } = await db
        .from('question_sets')
        .select('id,title,description')
        .eq('id', id)
        .eq('status', 'published')
        .maybeSingle()

      if (setError || !publishedSet) {
        console.error('Published set error:', setError)
        setErrorMessage('تعذر العثور على المسابقة المنشورة.')
        setPhase('error')
        return
      }

      const { data: questionRows, error: questionsError } = await db
        .from('questions')
        .select('id,body,explanation,law_name,article_number,source_url,position')
        .eq('set_id', id)
        .order('position', { ascending: true })

      if (questionsError) {
        console.error('Questions loading error:', questionsError)
        setErrorMessage('تعذر تحميل أسئلة المسابقة.')
        setPhase('error')
        return
      }

      const sortedQuestions = questionRows || []

      if (!sortedQuestions.length) {
        setErrorMessage('لا توجد أسئلة في هذه المجموعة حتى الآن.')
        setPhase('error')
        return
      }

      const questionIds = sortedQuestions.map(question => question.id)

      const { data: publicOptions, error: optionsError } = await db
        .from('public_options')
        .select('id,question_id,label,position')
        .in('question_id', questionIds)

      if (optionsError) {
        console.error('Public options loading error:', optionsError)
        setErrorMessage('تعذر تحميل خيارات الأسئلة.')
        setPhase('error')
        return
      }

      const questionsWithOptions = sortedQuestions.map(question => ({
        ...question,
        options: (publicOptions || [])
          .filter(option => option.question_id === question.id)
          .sort((a, b) => a.position - b.position)
      }))

      const missingOptions = questionsWithOptions.some(
        question => question.options.length !== 4
      )

      if (missingOptions) {
        setErrorMessage('بعض الأسئلة لا تحتوي على أربعة خيارات مكتملة.')
        setPhase('error')
        return
      }

      setSetData(publishedSet)
      setQuestions(questionsWithOptions)
      setPhase('identity')
    }

    loadPublishedSet()
  }, [id])

  async function submitAnswers() {
    if (submitting) return

    if (Object.keys(answers).length !== questions.length) {
      setErrorMessage('أجب عن جميع الأسئلة.')
      return
    }

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
            answers: questions.map(question => ({
              question_id: question.id,
              option_id: answers[question.id]
            }))
          }
        }
      )

      if (error || !data?.result) {
        console.error('Participation submission error:', error)
        setErrorMessage('تعذر اعتماد المشاركة. حاول مرة أخرى.')
        setSubmitting(false)
        return
      }

      setResult(data.result)
      setPhase('result')
    } catch (error) {
      console.error(error)
      setErrorMessage('حدث خطأ أثناء إرسال الإجابات.')
    }

    setSubmitting(false)
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
          <section className="card">
            <Note>{errorMessage}</Note>
            <Link className="btn" to="/">العودة للرئيسية</Link>
          </section>
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

        {phase === 'quiz' && questions.length > 0 && (
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
                  setAnswers(current => ({
                    ...current,
                    [questions[step].id]: option.id
                  }))
                }
              >
                {String.fromCharCode(65 + index)} · {option.label}
              </button>
            ))}

            {errorMessage && <Note>{errorMessage}</Note>}

            <div className="actions">
              <button
                className="btn secondary"
                disabled={!step || submitting}
                onClick={() => {
                  setErrorMessage('')
                  setStep(step - 1)
                }}
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
                <button
                  className="btn"
                  disabled={submitting}
                  onClick={submitAnswers}
                >
                  {submitting ? 'جارٍ اعتماد الإجابات…' : 'اعتماد الإجابات'}
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

            {(result.answer_details || []).map((detail, index) => (
              <article className="review" key={index}>
                <b>
                  السؤال {index + 1}: {detail.is_correct ? 'صحيح' : 'غير صحيح'}
                </b>

                <p>{detail.question}</p>
                <p>الإجابة الصحيحة: {detail.correct}</p>
                <p>{detail.explanation}</p>

                {detail.source_url && (
                  <a
                    href={detail.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
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

  useEffect(() => {
    if (!db) return

    db.auth.getSession().then(({ data }) => setSession(data.session))

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
      body: { username, password }
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

  useEffect(() => {
    if (session) loadSets()
  }, [session])

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

    const ordered = (data || []).map(question => ({
      ...question,
      options: (question.options || []).sort(
        (a, b) => a.position - b.position
      )
    }))

    setQuestions(ordered)
  }

  async function saveQuestion(event) {
    if (event) event.preventDefault()
    if (!activeSet || savingQuestion) return

    if (
      !questionBody.trim() ||
      options.some(option => !option.trim()) ||
      !explanation.trim()
    ) {
      setErrorMessage('أكملي نص السؤال والخيارات الأربعة والتفسير.')
      return
    }

    setSavingQuestion(true)
    setErrorMessage('')
    setNotice('')

    const nextPosition =
      questions.reduce(
        (max, question) => Math.max(max, question.position || 0),
        0
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
      setErrorMessage(
        'تعذر حفظ السؤال: ' +
        (questionError?.message || 'خطأ غير معروف')
      )
      setSavingQuestion(false)
      return
    }

    const optionRows = options.map((label, index) => ({
      question_id: question.id,
      label: label.trim(),
      is_correct: index === Number(correctIndex),
      position: index + 1
    }))

    const { error: optionsError } = await db
      .from('options')
      .insert(optionRows)

    if (optionsError) {
      setErrorMessage(
        'تم حفظ نص السؤال لكن تعذر حفظ الخيارات: ' +
        optionsError.message
      )
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

    setNotice(
      status === 'published' ? 'تم نشر المجموعة.' : 'تمت أرشفة المجموعة.'
    )

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

            {errorMessage && <Note>{errorMessage}</Note>}
            {notice && <Note>{notice}</Note>}

            <section className="card">
              <h2>مجموعات الأسئلة</h2>

              {sets.map(set => (
                <div className="leader" key={set.id}>
                  <span>{set.title} — {set.status}</span>

                  <div className="actions">
                    <button
                      className="mini"
                      type="button"
                      onClick={() => openSet(set)}
                    >
                      إدارة الأسئلة
                    </button>

                    <button
                      className="mini"
                      type="button"
                      onClick={() =>
                        changeStatus(
                          set.id,
                          set.status === 'published'
                            ? 'archived'
                            : 'published'
                        )
                      }
                    >
                      {set.status === 'published' ? 'أرشفة' : 'نشر'}
                    </button>
                  </div>
                </div>
              ))}
            </section>

            {activeSet && (
              <section className="card form">
                <div
                  className="actions"
                  style={{
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <h2>إدارة أسئلة: {activeSet.title}</h2>

                  <button
                    type="button"
                    className="mini"
                    onClick={() => setActiveSet(null)}
                  >
                    إغلاق
                  </button>
                </div>

                <h3>الأسئلة المحفوظة ({questions.length})</h3>

                {questions.map((question, index) => (
                  <article className="review" key={question.id}>
                    <b>{index + 1}. {question.body}</b>
                    <p>
                      الإجابة الصحيحة:{' '}
                      {question.options?.find(option => option.is_correct)?.label ||
                        'غير محددة'}
                    </p>
                    <small>
                      {question.law_name || ''} {question.article_number || ''}
                    </small>
                  </article>
                ))}

                <hr />
                <h3>إضافة سؤال جديد</h3>

                <label>
                  نص السؤال
                  <textarea
                    value={questionBody}
                    onChange={event => setQuestionBody(event.target.value)}
                    required
                  />
                </label>

                <label>
                  اسم النظام
                  <input
                    value={lawName}
                    onChange={event => setLawName(event.target.value)}
                    placeholder="مثال: نظام المرافعات الشرعية"
                  />
                </label>

                <label>
                  رقم المادة
                  <input
                    value={articleNumber}
                    onChange={event => setArticleNumber(event.target.value)}
                    placeholder="مثال: المادة ٧٦"
                  />
                </label>

                <label>
                  رابط المصدر الرسمي
                  <input
                    type="url"
                    value={sourceUrl}
                    onChange={event => setSourceUrl(event.target.value)}
                    placeholder="https://..."
                  />
                </label>

                <h3>الخيارات (أربعة خيارات)</h3>

                {options.map((option, index) => (
                  <label key={index}>
                    الخيار {index + 1}
                    <input
                      value={option}
                      onChange={event =>
                        setOptions(current =>
                          current.map((value, optionIndex) =>
                            optionIndex === index
                              ? event.target.value
                              : value
                          )
                        )
                      }
                      required
                    />
                  </label>
                ))}

                <label>
                  الإجابة الصحيحة
                  <select
                    value={correctIndex}
                    onChange={event => setCorrectIndex(event.target.value)}
                  >
                    {options.map((_, index) => (
                      <option key={index} value={String(index)}>
                        الخيار {index + 1}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  تفسير الإجابة
                  <textarea
                    value={explanation}
                    onChange={event => setExplanation(event.target.value)}
                    required
                  />
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
