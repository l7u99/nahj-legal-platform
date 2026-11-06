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
  // useLocation يجعل الصفحة تعيد العرض عند الانتقال بين روابط React Router
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
