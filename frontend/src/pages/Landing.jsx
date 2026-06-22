import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Building2, ClipboardList, CreditCard, BarChart3,
  QrCode, Bell, Megaphone, CheckCircle2, Users,
  ChevronRight, Globe, Menu, X, PlayCircle,
} from 'lucide-react'
import { useState } from 'react'

const features = [
  { icon: ClipboardList, key: 'requests' },
  { icon: CreditCard, key: 'payments' },
  { icon: BarChart3, key: 'polls' },
  { icon: QrCode, key: 'guestQr' },
  { icon: Bell, key: 'notifications' },
  { icon: Megaphone, key: 'announcements' },
]

const plans = [
  { key: 'basic', price: '$300', popular: false },
  { key: 'standard', price: '$600', popular: true },
  { key: 'premium', price: '$1000', popular: false },
]

export default function Landing() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [mobileMenu, setMobileMenu] = useState(false)

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'uz' : 'ru'
    i18n.changeLanguage(next)
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Navbar */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-teal-500 rounded-xl flex items-center justify-center">
                <Building2 size={20} className="text-white" />
              </div>
              <span className="text-xl font-bold text-gray-900">DomApp</span>
            </div>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-6">
              <a href="#features" className="text-sm text-gray-600 hover:text-teal-600 transition">{t('landing.features')}</a>
              <a href="#pricing" className="text-sm text-gray-600 hover:text-teal-600 transition">{t('landing.pricing')}</a>
              <button onClick={toggleLang} className="flex items-center gap-1 text-sm text-gray-500 hover:text-teal-600 transition">
                <Globe size={14} /> {i18n.language === 'ru' ? 'UZ' : 'RU'}
              </button>
              <button onClick={() => navigate('/login')} className="text-sm text-gray-700 hover:text-teal-600 transition font-medium">
                {t('landing.login')}
              </button>
              <button onClick={() => navigate('/register')} className="bg-teal-500 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-600 transition shadow-sm">
                {t('landing.startFree')}
              </button>
            </nav>

            {/* Mobile menu button */}
            <button onClick={() => setMobileMenu(!mobileMenu)} className="md:hidden p-2 text-gray-500">
              {mobileMenu ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenu && (
          <div className="md:hidden border-t border-gray-100 bg-white px-4 py-4 space-y-3">
            <a href="#features" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600">{t('landing.features')}</a>
            <a href="#pricing" onClick={() => setMobileMenu(false)} className="block text-sm text-gray-600">{t('landing.pricing')}</a>
            <button onClick={() => { toggleLang(); setMobileMenu(false) }} className="block text-sm text-gray-500">
              <Globe size={14} className="inline mr-1" /> {i18n.language === 'ru' ? 'UZ' : 'RU'}
            </button>
            <button onClick={() => navigate('/login')} className="block w-full text-center text-sm text-gray-700 py-2">{t('landing.login')}</button>
            <button onClick={() => navigate('/register')} className="block w-full text-center bg-teal-500 text-white py-2 rounded-xl text-sm font-medium">
              {t('landing.startFree')}
            </button>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-50 via-white to-amber-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-3xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 leading-tight mb-6">
              {t('landing.heroTitle')}
            </h1>
            <p className="text-lg md:text-xl text-gray-600 mb-10 max-w-2xl mx-auto">
              {t('landing.heroSubtitle')}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={() => navigate('/register')}
                className="w-full sm:w-auto bg-teal-500 text-white px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-teal-600 transition shadow-lg shadow-teal-200 flex items-center justify-center gap-2"
              >
                {t('landing.startFree')} <ChevronRight size={18} />
              </button>
              <button
                onClick={async () => {
                  try {
                    const api = (await import('../api')).default
                    const res = await api.post('/auth/demo-login')
                    localStorage.setItem('token', res.data.token)
                    localStorage.setItem('company_id', res.data.company_id)
                    localStorage.setItem('company_name', res.data.company_name)
                    localStorage.setItem('plan', 'premium')
                    window.location.href = '/dashboard'
                  } catch {
                    // fallback
                  }
                }}
                className="w-full sm:w-auto border-2 border-gray-200 text-gray-700 px-8 py-3.5 rounded-xl text-base font-semibold hover:border-teal-300 hover:text-teal-600 transition flex items-center justify-center gap-2"
              >
                <PlayCircle size={18} /> {t('landing.tryDemo')}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('landing.featuresTitle')}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t('landing.featuresSubtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((f) => {
              const Icon = f.icon
              return (
                <div key={f.key} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover:shadow-md transition">
                  <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={24} className="text-teal-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t(`landing.feature.${f.key}.title`)}</h3>
                  <p className="text-sm text-gray-500">{t(`landing.feature.${f.key}.desc`)}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('landing.pricingTitle')}</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">{t('landing.pricingSubtitle')}</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan) => (
              <div
                key={plan.key}
                className={`relative rounded-2xl p-8 border-2 transition ${
                  plan.popular
                    ? 'border-teal-500 bg-white shadow-xl shadow-teal-100'
                    : 'border-gray-100 bg-white hover:border-gray-200'
                }`}
              >
                {plan.popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-teal-500 text-white text-xs font-semibold px-4 py-1 rounded-full">
                    {t('landing.popular')}
                  </span>
                )}
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">{t(`pricing.${plan.key}.name`)}</h3>
                  <div className="text-4xl font-bold text-gray-900">{plan.price}<span className="text-base text-gray-400 font-normal">/мес</span></div>
                </div>
                <ul className="space-y-3 mb-8">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                      <CheckCircle2 size={16} className="text-teal-500 mt-0.5 shrink-0" />
                      <span>{t(`pricing.${plan.key}.feature${i}`)}</span>
                    </li>
                  ))}
                </ul>
                <button
                  onClick={() => navigate('/register')}
                  className={`w-full py-3 rounded-xl text-sm font-semibold transition ${
                    plan.popular
                      ? 'bg-teal-500 text-white hover:bg-teal-600 shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {t('landing.startFree')}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 bg-gradient-to-br from-teal-500 to-teal-700">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">{t('landing.ctaTitle')}</h2>
          <p className="text-teal-100 mb-8 text-lg">{t('landing.ctaSubtitle')}</p>
          <button
            onClick={() => navigate('/register')}
            className="bg-white text-teal-600 px-8 py-3.5 rounded-xl text-base font-semibold hover:bg-teal-50 transition shadow-lg inline-flex items-center gap-2"
          >
            {t('landing.startFree')} <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
                <Building2 size={16} className="text-white" />
              </div>
              <span className="text-white font-bold">DomApp</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span>© 2026 DomApp</span>
              <a href="mailto:support@domapp.uz" className="hover:text-white transition">support@domapp.uz</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
