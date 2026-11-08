
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, ready } from './lib'

function formatDate(value) {
  if (!value) return ''
  return new Date(value).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

export default function Archive() {
  const [rows, setRows] = useState([])
  const [selectedSet, setSelectedSet] = useState(null)
  const [loading, setLoading] = useState(true)
  const [errorMessage, setErrorMessage] = useState('')

  useEffect(() => {
    if (!ready) {
      setLoading(false)
      setErrorMessage('المنصة قيد التجهيز.')
      return
    }

    async function loadArchive() {
      const { data, error } = await db
        .from('archived_question_answers')
        .select('*')
        .order('set_created_at', { ascending: false })
        .order('question_position', { ascending: true })

      if (error) {
        console.error('Archive error:', error)
        setErrorMessage('تعذر تحميل أرشيف الأسئلة.')
        setLoading(false)
        return
      }

      setRows(data || [])
      setLoading(false)
    }

    loadArchive()
  }, [])

  const sets = useMemo(() => {
    const grouped = new Map()

    rows.forEach(row => {
      if (!grouped.has(row.set_id)) {
        grouped.set(row.set_id, {
          id: row.set_id,
          title: row.set_title,
          description: row.set_description,
          created_at: row.set_created_at,
          questions: []
        })
      }

      grouped.get(row.set_id).questions.push(row)
    })

    return Array.from(grouped.values())
  }, [rows])

  const activeSet = sets.find(set => set.id === selectedSet)

  return (
    <div className="site">
      <header>
        <Link to="/" className="brand">
          <img
            src={`${import.meta.env.BASE_URL}nahj-logo.png`}
            alt="شعار نهج القانوني"
            style={{
              width: 76,
              height: 76,
              objectFit: 'contain',
              borderRadius: 12
            }}
          />
          <span>
            نهج القانوني
            <small>المعرفة القانونية تبدأ بسؤال</small>
          </span>
        </Link>

        <nav>
          <Link to="/">الرئيسية</Link>
          <Link to="/admin">دخول المسؤولين</Link>
        </nav>
      </header>

      <main className="narrow">
        <section className="hero">
          <small>NAHJ LEGAL · ARCHIVE</small>
          <h1>أرشيف الأسئلة الأسبوعية</h1>
          <p>
            عُد إلى الأسئلة السابقة، واطّلع على الإجابات الصحيحة
            وتفسيراتها ومصادرها النظامية.
          </p>
        </section>

        {loading ? (
          <section className="card">جارٍ تحميل الأرشيف…</section>
        ) : errorMessage ? (
          <section className="card">
            <div className="note">{errorMessage}</div>
          </section>
        ) : activeSet ? (
          <>
            <section className="card">
              <button
                className="btn secondary"
                onClick={() => setSelectedSet(null)}
              >
                ← العودة إلى الأرشيف
              </button>

              <h2>{activeSet.title}</h2>
              {activeSet.description && <p>{activeSet.description}</p>}
              <small className="muted">
                {formatDate(activeSet.created_at)}
              </small>
            </section>

            {activeSet.questions.map((question, index) => (
              <article className="card review" key={question.question_id}>
                <small className="gold">السؤال {index + 1}</small>
                <h3>{question.question_body}</h3>

                <div className="note">
                  <strong>الإجابة الصحيحة</strong>
                  <p>{question.correct_answer}</p>
                </div>

                {question.explanation && (
                  <>
                    <h4>تفسير الإجابة</h4>
                    <p>{question.explanation}</p>
                  </>
                )}

                {(question.law_name || question.article_number) && (
                  <p>
                    <strong>المرجع النظامي: </strong>
                    {question.law_name || ''}
                    {question.article_number
                      ? ` — ${question.article_number}`
                      : ''}
                  </p>
                )}

                {question.source_url && (
                  <a
                    href={question.source_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    الاطلاع على المصدر الرسمي ←
                  </a>
                )}
              </article>
            ))}
          </>
        ) : sets.length ? (
          <section className="card">
            <h2>المجموعات السابقة</h2>

            {sets.map((set, index) => (
              <button
                type="button"
                className="leader"
                key={set.id}
                onClick={() => setSelectedSet(set.id)}
                style={{
                  width: '100%',
                  border: 0,
                  textAlign: 'right',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 12
                }}
              >
                <span>
                  <strong>{set.title || `الأسبوع ${sets.length - index}`}</strong>
                  <small className="muted" style={{ display: 'block' }}>
                    {formatDate(set.created_at)} · {set.questions.length} أسئلة
                  </small>
                </span>
                <span className="gold">عرض ←</span>
              </button>
            ))}
          </section>
        ) : (
          <section className="card center">
            <h2>لا توجد أسئلة مؤرشفة حتى الآن</h2>
            <p>ستظهر هنا الأسئلة السابقة بعد أرشفتها.</p>
            <Link className="btn" to="/">العودة للرئيسية</Link>
          </section>
        )}
      </main>

      <footer>© 2026 نهج القانوني · دقيقة قانونية</footer>
    </div>
  )
}
