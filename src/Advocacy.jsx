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
  const [step, setStep] = useState(0)

  const validName = name.trim().split(/\s+/).length >= 3
  const validPhone = /^05\d{8}$/.test(phone)
  const canContinue = validName && validPhone

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

        <div className="progress" aria-label="تقدم المسابقة">
          {step === 0 ? 'الصفحة الأولى من ٥ · بيانات المتسابق' : `المرحلة ${String(step).padStart(2, '0')} من ٤`}
        </div>

        {step === 0 ? (
          <section className="card form">
            <small className="gold">الصفحة الأولى</small>
            <h2>بيانات المتسابق</h2>
            <p>أدخل بياناتك للانتقال إلى مراحل المسابقة.</p>
            <label>الاسم الثلاثي
              <input value={name} onChange={e => setName(e.target.value)} placeholder="اكتب اسمك الثلاثي" />
            </label>
            <label>رقم الجوال السعودي
              <input value={phone} maxLength="10" inputMode="numeric"
                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="05XXXXXXXX" />
            </label>
            <div className="note">لن تنتقل للمرحلة التالية إلا بعد إدخال الاسم الثلاثي ورقم جوال صحيح.</div>
            <button className="btn" type="button" disabled={!canContinue} onClick={() => setStep(1)}>
              الانتقال إلى المرحلة الأولى ←
            </button>
          </section>
        ) : (
          <section className="card">
            <small className="gold">المرحلة {stages[step - 1].number} من ٤</small>
            <h2>{stages[step - 1].title}</h2>
            <p>{stages[step - 1].description}</p>
            <div className="note">
              هذه المرحلة لم يُضف محتواها بعد. لن تظهر أي قضية أو أسئلة افتراضية؛ ستُضاف بعد اعتمادك للمحتوى.
            </div>
            <div className="actions">
              {step > 1 && (
                <button className="btn secondary" type="button" onClick={() => setStep(step - 1)}>
                  → المرحلة السابقة
                </button>
              )}
              {step < 4 ? (
                <button className="btn" type="button" onClick={() => setStep(step + 1)}>
                  الانتقال إلى المرحلة التالية ←
                </button>
              ) : (
                <p>وصلت إلى نهاية عرض المراحل. ستُفعّل المشاركة بعد إضافة محتوى المسابقة وربط الحفظ.</p>
              )}
            </div>
          </section>
        )}

        <Link className="btn secondary" to="/">العودة للرئيسية</Link>
      </main>
      <footer>© 2026 نهج القانوني · دقيقة قانونية</footer>
    </div>
  )
}
