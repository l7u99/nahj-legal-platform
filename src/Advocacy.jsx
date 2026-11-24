import { useState } from 'react'
import { Link } from 'react-router-dom'

const stages = [
  { number: '01', title: 'المرحلة الأولى: التكييف القانوني', description: 'سيُضاف محتوى هذه المرحلة لاحقًا.' },
  { number: '02', title: 'المرحلة الثانية: اكتشاف الخلل', description: 'سيُضاف محتوى هذه المرحلة لاحقًا.' },
  { number: '03', title: 'المرحلة الثالثة: اتخاذ القرار', description: 'سيُضاف محتوى هذه المرحلة لاحقًا.' },
  { number: '04', title: 'المرحلة الرابعة: المرافعة الختامية', description: 'سيُتاح هنا حقل كتابة المرافعة بعد اعتماد محتوى المسابقة.' },
]

export default function Advocacy() {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')

  return (
    <div className="site">
      <header>
        <Link to="/" className="brand">
          <img src={`${import.meta.env.BASE_URL}nahj-logo.png`} alt="شعار نهج القانوني"
            style={{ width: 76, height: 76, objectFit: 'contain', borderRadius: 12 }} />
          <span>نهج القانوني<small>المعرفة القانونية تبدأ بسؤال</small></span>
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

        <section className="card">
          <small className="gold">عن المسابقة</small>
          <h2>أثبت مهارتك في التفكير والاستدلال القانوني</h2>
          <p>تتكون المسابقة من أربع مراحل متتابعة. سيُضاف محتوى القضية وأسئلة المراحل لاحقًا بعد اعتمادها، لذلك لن تظهر الآن أي قضية أو أسئلة تجريبية.</p>
          <div className="chips">
            <span>٤ مراحل</span><span>مرافعة كتابية</span><span>تقييم وفق معايير عامة</span>
          </div>
        </section>

        <section className="card form">
          <h2>بيانات المتسابق</h2>
          <label>الاسم الثلاثي
            <input value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك الثلاثي" />
          </label>
          <label>رقم الجوال السعودي
            <input value={phone} maxLength="10" inputMode="numeric"
              onChange={e => setPhone(e.target.value.replace(/\\D/g, ''))} placeholder="05XXXXXXXX" />
          </label>
          <div className="note">هذه واجهة أولية للتصميم فقط؛ لم يُفعّل حفظ البيانات أو إرسال المشاركة بعد.</div>
        </section>

        {stages.map(stage => (
          <section className="card" key={stage.number}>
            <small className="gold">المرحلة {stage.number}</small>
            <h2>{stage.title}</h2>
            <p>{stage.description}</p>
          </section>
        ))}
        <Link className="btn secondary" to="/">العودة للرئيسية</Link>
      </main>
      <footer>© 2026 نهج القانوني · دقيقة قانونية</footer>
    </div>
  )
}
