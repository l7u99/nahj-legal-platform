import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { db, ready } from './lib'

const emptyStage = { stage_number: '1', title: '', prompt: '', stage_type: 'multiple_choice', options: ['', '', '', ''], points: '5', min_words: '3', max_words: '5', correct_option_index: '0' }

const emptyCaseDetails = {
  parties: [],
  claims: [],
  defenses: [],
  legal_references: []
}

function dateLabel(value) {
  return value ? new Date(value).toLocaleString('ar-SA') : '—'
}

function CaseDetailsEditor({ caseId }) {
  const [details, setDetails] = useState(emptyCaseDetails)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    loadDetails()
  }, [caseId])

  async function loadDetails() {
    setLoading(true)
    setMessage('')

    const { data, error } = await db
      .from('advocacy_case_details')
      .select('*')
      .eq('case_id', caseId)
      .maybeSingle()

    if (error) {
      setMessage('تعذر تحميل التفاصيل: ' + error.message)
    } else if (data) {
      setDetails({
        parties: Array.isArray(data.parties) ? data.parties : [],
        claims: Array.isArray(data.claims) ? data.claims : [],
        defenses: Array.isArray(data.defenses) ? data.defenses : [],
        legal_references: Array.isArray(data.legal_references) ? data.legal_references : []
      })
    } else {
      setDetails(emptyCaseDetails)
    }

    setLoading(false)
  }

  function updateList(field, index, key, value) {
    setDetails(current => ({
      ...current,
      [field]: current[field].map((item, i) =>
        i === index ? { ...item, [key]: value } : item
      )
    }))
  }

  function addItem(field, item) {
    setDetails(current => ({
      ...current,
      [field]: [...current[field], item]
    }))
  }

  function removeItem(field, index) {
    setDetails(current => ({
      ...current,
      [field]: current[field].filter((_, i) => i !== index)
    }))
  }

  async function saveDetails() {
    setSaving(true)
    setMessage('')

    const { error } = await db
      .from('advocacy_case_details')
      .upsert({
        case_id: caseId,
        ...details,
        updated_at: new Date().toISOString()
      }, { onConflict: 'case_id' })

    if (error) {
      setMessage('تعذر حفظ التفاصيل: ' + error.message)
    } else {
      setMessage('تم حفظ تفاصيل القضية بنجاح.')
    }

    setSaving(false)
  }

  if (loading) return <section className="card"><p>جارٍ تحميل تفاصيل القضية...</p></section>

  return (
    <section className="card form">
      <h2>تفاصيل القضية وأطرافها</h2>
      <p className="muted">تُحفظ هذه البيانات مع القضية المحددة، ويمكن تعديلها في أي وقت.</p>

      <h3>أطراف القضية</h3>
      {details.parties.map((item, i) => (
        <div className="review" key={i}>
          <label>اسم الطرف
            <input value={item.name || ''}
              onChange={e => updateList('parties', i, 'name', e.target.value)} />
          </label>
          <label>صفته في القضية
            <input value={item.role || ''}
              onChange={e => updateList('parties', i, 'role', e.target.value)} />
          </label>
          <button type="button" className="mini"
            onClick={() => removeItem('parties', i)}>حذف الطرف</button>
        </div>
      ))}
      <button type="button" className="btn secondary"
        onClick={() => addItem('parties', { name: '', role: '' })}>
        إضافة طرف
      </button>

      <h3>طلبات المدعي</h3>
      {details.claims.map((item, i) => (
        <div className="review" key={i}>
          <textarea value={item.text || ''}
            onChange={e => updateList('claims', i, 'text', e.target.value)}
            placeholder="اكتبي الطلب..." />
          <button type="button" className="mini"
            onClick={() => removeItem('claims', i)}>حذف الطلب</button>
        </div>
      ))}
      <button type="button" className="btn secondary"
        onClick={() => addItem('claims', { text: '' })}>
        إضافة طلب
      </button>

      <h3>دفوع الطرف الآخر</h3>
      {details.defenses.map((item, i) => (
        <div className="review" key={i}>
          <textarea value={item.text || ''}
            onChange={e => updateList('defenses', i, 'text', e.target.value)}
            placeholder="اكتبي الدفع..." />
          <button type="button" className="mini"
            onClick={() => removeItem('defenses', i)}>حذف الدفع</button>
        </div>
      ))}
      <button type="button" className="btn secondary"
        onClick={() => addItem('defenses', { text: '' })}>
        إضافة دفع
      </button>

      <h3>الأنظمة والمواد القانونية والمراجع</h3>
      {details.legal_references.map((item, i) => (
        <div className="review" key={i}>
          <label>اسم النظام أو المرجع
            <input value={item.name || ''}
              onChange={e => updateList('legal_references', i, 'name', e.target.value)} />
          </label>
          <label>رقم المادة أو موضع الاستدلال
            <input value={item.article || ''}
              onChange={e => updateList('legal_references', i, 'article', e.target.value)} />
          </label>
          <label>نص الاستدلال أو الرابط
            <textarea value={item.note || ''}
              onChange={e => updateList('legal_references', i, 'note', e.target.value)} />
          </label>
          <button type="button" className="mini"
            onClick={() => removeItem('legal_references', i)}>حذف المرجع</button>
        </div>
      ))}
      <button type="button" className="btn secondary"
        onClick={() => addItem('legal_references', { name: '', article: '', note: '' })}>
        إضافة مرجع قانوني
      </button>

      <button type="button" className="btn" onClick={saveDetails} disabled={saving}>
        {saving ? 'جارٍ الحفظ...' : 'حفظ تفاصيل القضية'}
      </button>
      {message && <p className="note">{message}</p>}
    </section>
  )
}

export default function AdvocacyAdmin() {
  const [session, setSession] = useState(null)
  const [cases, setCases] = useState([])
  const [activeCase, setActiveCase] = useState(null)
  const [stages, setStages] = useState([])
  const [submissions, setSubmissions] = useState([])
  const [allSubmissions, setAllSubmissions] = useState([])
  const [selectedSubmission, setSelectedSubmission] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [caseForm, setCaseForm] = useState({ title: '', description: '', case_facts: '' })
  const [stageForm, setStageForm] = useState(emptyStage)

  useEffect(() => {
    if (!db) return
    db.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, current) => setSession(current))
    return () => subscription.unsubscribe()
  }, [])

  async function loadCases() {
    setLoading(true); setError('')
    const { data, error } = await db.from('advocacy_cases').select('*').order('created_at', { ascending: false })
    if (error) setError('تعذر تحميل قضايا المرافعة: ' + error.message)
    else {
      setCases(data || [])
      const { data: rows, error: rowsError } = await db.from('advocacy_submissions')
        .select('id,case_id,full_name,answers,final_argument,objective_score,ai_score,ai_feedback,total_score,evaluation_status,submitted_at,evaluated_at,approved_at')
        .order('submitted_at', { ascending: false })
      if (rowsError) setError('تعذر تحميل سجل المشاركات: ' + rowsError.message)
      else setAllSubmissions(rows || [])
    }
    setLoading(false)
  }

  useEffect(() => { if (session) loadCases() }, [session])

  async function createCase(event) {
    event.preventDefault(); setError(''); setNotice('')
    const { data, error } = await db.from('advocacy_cases').insert({
      title: caseForm.title.trim(), description: caseForm.description.trim(),
      case_facts: caseForm.case_facts.trim(), status: 'draft'
    }).select('*').single()
    if (error) { setError('تعذر إنشاء المسابقة: ' + error.message); return }
    setCaseForm({ title: '', description: '', case_facts: '' })
    setNotice('تم إنشاء مسابقة المرافعة كمسودة.')
    await loadCases(); await openCase(data)
  }

  async function openCase(item) {
    setActiveCase(item); setStages([]); setSubmissions([]); setSelectedSubmission(null); setError('')
    const [{ data: stageRows, error: stageError }, { data: submissionRows, error: submissionError }] = await Promise.all([
      db.from('advocacy_stages').select('*').eq('case_id', item.id).order('stage_number'),
      db.from('advocacy_submissions').select('id,full_name,answers,final_argument,objective_score,ai_score,ai_feedback,total_score,evaluation_status,submitted_at,evaluated_at,approved_at').eq('case_id', item.id).order('submitted_at', { ascending: false })
    ])
    if (stageError) setError('تعذر تحميل المراحل: ' + stageError.message)
    else setStages(stageRows || [])
    if (submissionError) setError('تعذر تحميل المشاركات: ' + submissionError.message)
    else setSubmissions(submissionRows || [])
  }

  async function addStage(event) {
    event.preventDefault(); if (!activeCase) return
    setError(''); setNotice('')
    const number = Number(stageForm.stage_number)
    if (stages.some(stage => stage.stage_number === number)) { setError('هذه المرحلة مضافة مسبقًا.'); return }
    const isChoice = stageForm.stage_type === 'multiple_choice'
    const options = isChoice ? stageForm.options.map(value => value.trim()).filter(Boolean) : []
    if (isChoice && options.length < 2) { setError('أضيفي خيارين على الأقل.'); return }
    const payload = {
      case_id: activeCase.id, stage_number: number, title: stageForm.title.trim(), prompt: stageForm.prompt.trim(),
      stage_type: stageForm.stage_type, options, points: Number(stageForm.points),
      min_words: isChoice ? null : (stageForm.min_words ? Number(stageForm.min_words) : null),
      max_words: isChoice ? null : (stageForm.max_words ? Number(stageForm.max_words) : null), position: number
    }
    const { data, error } = await db.from('advocacy_stages').insert(payload).select('*').single()
    if (error) { setError('تعذر حفظ المرحلة: ' + error.message); return }
    if (isChoice) {
      const { error: answerError } = await db.from('advocacy_stage_answers').insert({ stage_id: data.id, correct_option_index: Number(stageForm.correct_option_index) })
      if (answerError) { setError('تم حفظ المرحلة لكن تعذر حفظ مفتاح الإجابة: ' + answerError.message); await openCase(activeCase); return }
    }
    setStageForm({ ...emptyStage, stage_number: String(Math.min(number + 1, 4)), points: number === 3 ? '10' : '5' })
    setNotice('تم حفظ المرحلة في مسودة المسابقة.')
    await openCase(activeCase)
  }

  async function updateCaseStatus(status) {
    if (!activeCase) return
    const { error } = await db.from('advocacy_cases').update({ status, updated_at: new Date().toISOString() }).eq('id', activeCase.id)
    if (error) { setError('تعذر تحديث حالة المسابقة: ' + error.message); return }
    setNotice(status === 'published' ? 'تم نشر المسابقة.' : status === 'closed' ? 'تم إغلاق المسابقة.' : 'تم حفظ الحالة.')
    await loadCases()
    const { data } = await db.from('advocacy_cases').select('*').eq('id', activeCase.id).single()
    if (data) setActiveCase(data)
  }

  if (!ready) return <div className="site"><main className="narrow"><section className="card">إعداد الاتصال بقاعدة البيانات غير مكتمل.</section></main></div>
  if (!session) return <div className="site"><main className="narrow"><section className="card"><h1>إدارة المرافعة القانونية</h1><p>يلزم تسجيل الدخول أولًا من لوحة الإدارة.</p><Link className="btn" to="/admin">العودة إلى تسجيل المسؤولين</Link></section></main></div>

  return <div className="site">
    <header><Link to="/" className="brand"><span>نهج القانوني<small>إدارة المرافعة القانونية</small></span></Link><nav><Link to="/admin">لوحة الإدارة</Link><Link to="/">الرئيسية</Link></nav></header>
    <main className="narrow">
      <section className="hero"><small>NAHJ LEGAL · ADMIN</small><h1>إدارة المرافعة القانونية</h1><p>إدارة مستقلة عن مسابقة الأسئلة الأسبوعية.</p></section>
      {error && <div className="note">{error}</div>}{notice && <div className="note">{notice}</div>}

      <section className="card form"><h2>إنشاء مسابقة / قضية جديدة</h2>
        <form onSubmit={createCase}>
          <label>عنوان المسابقة<input required value={caseForm.title} onChange={e => setCaseForm({ ...caseForm, title: e.target.value })} /></label>
          <label>وصف مختصر<textarea value={caseForm.description} onChange={e => setCaseForm({ ...caseForm, description: e.target.value })} /></label>
          <label>وقائع القضية<textarea required value={caseForm.case_facts} onChange={e => setCaseForm({ ...caseForm, case_facts: e.target.value })} /></label>
          <button className="btn">إنشاء كمسودة</button>
        </form>
      </section>

      <section className="card"><div className="actions" style={{justifyContent:'space-between'}}><h2>المسابقات</h2><button className="mini" type="button" onClick={loadCases}>تحديث</button></div>
        {loading ? <p>جارٍ التحميل…</p> : cases.length ? cases.map(item => <div key={item.id} className="review"><b>{item.title}</b><p>الحالة: {item.status} · أُنشئت: {dateLabel(item.created_at)}</p><button type="button" className="btn secondary" onClick={() => openCase(item)}>إدارة هذه المسابقة</button></div>) : <p>لا توجد مسابقات مرافعة بعد.</p>}
      </section>

      <section className="card">
        <h2>إحصائيات المرافعة</h2>
        <div className="cols">
          <div className="mini"><b>إجمالي المشاركات</b><h2>{allSubmissions.length}</h2></div>
          <div className="mini"><b>بانتظار التقييم</b><h2>{allSubmissions.filter(row => row.evaluation_status === 'pending').length}</h2></div>
          <div className="mini"><b>تم تقييمهم</b><h2>{allSubmissions.filter(row => ['evaluated', 'review_required', 'approved'].includes(row.evaluation_status)).length}</h2></div>
          <div className="mini"><b>تم اعتمادهم</b><h2>{allSubmissions.filter(row => row.evaluation_status === 'approved').length}</h2></div>
        </div>
        <p className="muted">إحصائيات جميع مسابقات المرافعة فقط، مستقلة عن مسابقة الأسئلة الأسبوعية.</p>
      </section>

      <section className="card">
        <h2>العشرة الأوائل</h2>
        <p>ترتيب إداري للمشاركات التي لديها درجة نهائية، ولا يظهر للمتسابقين.</p>
        {allSubmissions.filter(row => row.total_score !== null && row.total_score !== undefined)
          .sort((a, b) => Number(b.total_score) - Number(a.total_score) || new Date(a.submitted_at) - new Date(b.submitted_at))
          .slice(0, 10).length ? allSubmissions.filter(row => row.total_score !== null && row.total_score !== undefined)
            .sort((a, b) => Number(b.total_score) - Number(a.total_score) || new Date(a.submitted_at) - new Date(b.submitted_at))
            .slice(0, 10).map((row, index) => <article className="leader" key={row.id}>
              <b>#{index + 1} · {row.full_name}</b><span>{row.total_score} / 25</span>
              <small>{cases.find(item => item.id === row.case_id)?.title || 'مسابقة مرافعة'} · {row.evaluation_status}</small>
            </article>) : <p>لا توجد نتائج مرتبة حتى الآن. سيظهر المتصدرون بعد تسجيل مشاركات وتقييمها.</p>}
      </section>

      <section className="card">
        <h2>سجل المتسابقين ({allSubmissions.length})</h2>
        {allSubmissions.length ? allSubmissions.map(row => <article className="review" key={row.id}>
          <b>{row.full_name}</b><p>{cases.find(item => item.id === row.case_id)?.title || 'مسابقة مرافعة'} · {row.evaluation_status} · {dateLabel(row.submitted_at)}</p>
        </article>) : <p>لا يوجد متسابقون حتى الآن.</p>}
      </section>

      <section className="card">
        <h2>سجل المشاركات ({allSubmissions.length})</h2>
        <p>سجل مستقل يعرض إجابات كل متسابق ومرافعته الختامية.</p>
        {allSubmissions.length ? allSubmissions.map(row => <article className="review" key={row.id}>
          <b>{row.full_name} · {cases.find(item => item.id === row.case_id)?.title || 'مسابقة مرافعة'}</b>
          <p>تاريخ الإرسال: {dateLabel(row.submitted_at)} · الحالة: {row.evaluation_status} · الدرجة: {row.total_score ?? 'بانتظار التقييم'}</p>
          <details><summary>عرض تفاصيل المشاركة</summary>
            <h4>إجابات المراحل</h4><pre style={{whiteSpace:'pre-wrap'}}>{JSON.stringify(row.answers, null, 2)}</pre>
            <h4>المرافعة الختامية</h4><p style={{whiteSpace:'pre-wrap'}}>{row.final_argument || 'لم تُسجل مرافعة'}</p>
            <p>الدرجة الموضوعية: {row.objective_score} / 15 · درجة المرافعة: {row.ai_score ?? 'لم تُقيّم'} / 10</p>
            <p>ملاحظات التقييم: {row.ai_feedback ? JSON.stringify(row.ai_feedback) : 'لا توجد'}</p>
          </details>
        </article>) : <p>لا توجد مشاركات مسجلة حتى الآن.</p>}
      </section>

      {activeCase && <>
        <CaseDetailsEditor caseId={activeCase.id} />

        <section className="card"><h2>{activeCase.title}</h2><p>{activeCase.description}</p><div className="note">{activeCase.case_facts}</div><p>الحالة الحالية: <b>{activeCase.status}</b></p>
          <div className="actions"><button className="btn" type="button" onClick={() => updateCaseStatus('published')}>نشر المسابقة</button><button className="btn secondary" type="button" onClick={() => updateCaseStatus('closed')}>إغلاق المسابقة</button><button className="btn secondary" type="button" onClick={() => updateCaseStatus('draft')}>إعادتها لمسودة</button></div>
        </section>

        <section className="card"><h2>مراحل المسابقة</h2>{stages.map(stage => <article className="review" key={stage.id}><b>المرحلة {stage.stage_number}: {stage.title}</b><p>{stage.prompt}</p><p>النوع: {stage.stage_type === 'multiple_choice' ? 'اختيار من متعدد' : 'مرافعة مكتوبة'} · الدرجة: {stage.points}</p>{stage.options?.length > 0 && <ol>{stage.options.map((option, i) => <li key={i}>{option}</li>)}</ol>}</article>)}
          <h3>إضافة مرحلة</h3><form onSubmit={addStage}>
            <label>رقم المرحلة<select value={stageForm.stage_number} onChange={e => setStageForm({ ...stageForm, stage_number: e.target.value })}>{[1,2,3,4].map(n => <option key={n} value={n}>{n}</option>)}</select></label>
            <label>عنوان المرحلة<input required value={stageForm.title} onChange={e => setStageForm({ ...stageForm, title: e.target.value })} /></label>
            <label>نص السؤال / المطلوب<textarea required value={stageForm.prompt} onChange={e => setStageForm({ ...stageForm, prompt: e.target.value })} /></label>
            <label>نوع المرحلة<select value={stageForm.stage_type} onChange={e => setStageForm({ ...stageForm, stage_type: e.target.value, points: e.target.value === 'written_argument' ? '10' : '5' })}><option value="multiple_choice">اختيار من متعدد</option><option value="written_argument">مرافعة مكتوبة</option></select></label>
            {stageForm.stage_type === 'multiple_choice' && <>
              {stageForm.options.map((option, i) => <label key={i}>الخيار {i+1}<input value={option} onChange={e => setStageForm({ ...stageForm, options: stageForm.options.map((v, j) => j === i ? e.target.value : v) })} /></label>)}
              <label>رقم الإجابة الصحيحة<select value={stageForm.correct_option_index} onChange={e => setStageForm({ ...stageForm, correct_option_index: e.target.value })}>{stageForm.options.map((_, i) => <option key={i} value={i}>الخيار {i+1}</option>)}</select></label>
            </>}
            {stageForm.stage_type === 'written_argument' && <><label>أقل عدد كلمات<input type="number" min="1" value={stageForm.min_words} onChange={e => setStageForm({ ...stageForm, min_words: e.target.value })} /></label><label>أقصى عدد كلمات<input type="number" min="1" value={stageForm.max_words} onChange={e => setStageForm({ ...stageForm, max_words: e.target.value })} /></label></>}
            <label>الدرجة<input type="number" min="0" max="10" value={stageForm.points} onChange={e => setStageForm({ ...stageForm, points: e.target.value })} /></label>
            <button className="btn">حفظ المرحلة</button>
          </form>
        </section>

        <section className="card">
          <h2>إحصائيات المرافعة</h2>
          <div className="cols">
            <div className="mini"><b>إجمالي المتسابقين</b><h2>{submissions.length}</h2></div>
            <div className="mini"><b>بانتظار التقييم</b><h2>{submissions.filter(row => row.evaluation_status === 'pending').length}</h2></div>
            <div className="mini"><b>تم تقييمهم</b><h2>{submissions.filter(row => ['evaluated', 'review_required', 'approved'].includes(row.evaluation_status)).length}</h2></div>
            <div className="mini"><b>تم اعتمادهم</b><h2>{submissions.filter(row => row.evaluation_status === 'approved').length}</h2></div>
          </div>
          <p className="muted">الإحصائيات تخص المسابقة المحددة فقط، ولا تشمل مسابقة الأسئلة الأسبوعية.</p>
        </section>

        <section className="card">
          <h2>العشرة الأوائل</h2>
          <p>ترتيب إداري خاص بهذه المسابقة، ولا يظهر للمتسابقين.</p>
          {submissions.filter(row => row.total_score !== null && row.total_score !== undefined)
            .sort((a, b) => Number(b.total_score) - Number(a.total_score) || new Date(a.submitted_at) - new Date(b.submitted_at))
            .slice(0, 10).length ? (
              submissions.filter(row => row.total_score !== null && row.total_score !== undefined)
                .sort((a, b) => Number(b.total_score) - Number(a.total_score) || new Date(a.submitted_at) - new Date(b.submitted_at))
                .slice(0, 10)
                .map((row, index) => <article className="leader" key={row.id}>
                  <b>#{index + 1} · {row.full_name}</b>
                  <span>{row.total_score} / 25</span>
                  <small>حالة التقييم: {row.evaluation_status}</small>
                </article>)
            ) : <p>سيظهر ترتيب العشرة الأوائل بعد إدخال الدرجات واعتماد التقييم.</p>}
        </section>

        <section className="card">
          <h2>سجل المتسابقين ({submissions.length})</h2>
          <p>تظهر هذه البيانات للمسؤولين فقط. رقم الجوال غير معروض لأن قاعدة البيانات تحفظ بصمته فقط.</p>
          {submissions.length ? submissions.map(row => <article className="review" key={row.id}>
            <b>{row.full_name}</b>
            <p>الحالة: {row.evaluation_status} · الدرجة: {row.total_score ?? 'بانتظار التقييم'} · وقت الإرسال: {dateLabel(row.submitted_at)}</p>
            <button className="btn secondary" type="button" onClick={() => setSelectedSubmission(row)}>عرض المشاركة</button>
          </article>) : <p>لا توجد مشاركات مسجلة بعد.</p>}
          {selectedSubmission && <article className="review">
            <h3>مشاركة: {selectedSubmission.full_name}</h3>
            <p>الإجابات: {JSON.stringify(selectedSubmission.answers)}</p>
            <h4>المرافعة الختامية</h4>
            <p style={{whiteSpace:'pre-wrap'}}>{selectedSubmission.final_argument}</p>
            <p>الدرجة الموضوعية: {selectedSubmission.objective_score} / 15</p>
            <p>درجة المرافعة: {selectedSubmission.ai_score ?? 'لم تُقيّم بعد'} / 10</p>
            <p>ملاحظات التقييم: {selectedSubmission.ai_feedback ? JSON.stringify(selectedSubmission.ai_feedback) : 'لا توجد'}</p>
            <button className="btn secondary" type="button" onClick={() => setSelectedSubmission(null)}>إغلاق التفاصيل</button>
          </article>}
          <div className="note">اعتماد التقييم ونشر النتائج غير مفعّلين بعد؛ يحتاجان إلى وظيفة خادمية وسياسة صلاحيات إضافية قبل إتاحتهما.</div>
        </section>
      </>}
      <Link className="btn secondary" to="/admin">العودة إلى لوحة الإدارة</Link>
    </main>
    <footer>© 2026 نهج القانوني · دقيقة قانونية</footer>
  </div>
}
