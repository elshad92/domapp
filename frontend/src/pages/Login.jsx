import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Building2, Mail, Lock, User, Phone, LogIn, UserPlus, Globe } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

export default function Login() {
  const { t, i18n } = useTranslation()
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/login', { email, password })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('company_id', res.data.company_id)
      localStorage.setItem('company_name', res.data.company_name)
      toast.success(t('common.success'))
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail || t('login.error')
      setError(detail)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const res = await api.post('/auth/register', {
        name,
        phone,
        email,
        password,
      })
      localStorage.setItem('token', res.data.token)
      localStorage.setItem('company_id', res.data.company_id)
      localStorage.setItem('company_name', res.data.company_name)
      toast.success(t('common.created'))
      navigate('/')
    } catch (err) {
      const detail = err.response?.data?.detail || t('login.registerError')
      setError(detail)
      toast.error(detail)
    } finally {
      setLoading(false)
    }
  }

  const switchMode = () => {
    setMode(mode === 'login' ? 'register' : 'login')
    setError('')
  }

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'uz' : 'ru'
    i18n.changeLanguage(next)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-amber-50">
      {/* Language toggle */}
      <button
        onClick={toggleLang}
        className="absolute top-4 right-4 flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-primary hover:bg-white rounded-lg transition border border-gray-200 bg-white/80 shadow-sm"
      >
        <Globe size={14} />
        {i18n.language === 'ru' ? 'UZ' : 'RU'}
      </button>

      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md mx-4 border border-gray-100">
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center mb-3 shadow-sm">
            <Building2 size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{t('app.name')}</h1>
          <p className="text-gray-500 text-sm mt-1">
            {mode === 'login' ? t('login.title') : t('login.registerTitle')}
          </p>
        </div>

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="uk@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-xl hover:bg-primary-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('login.loginLoading')}
                </span>
              ) : (
                <><LogIn size={16} /> {t('login.login')}</>
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.name')}</label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="ООО УК Дом"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.phone')}</label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="+998901234567"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.email')}</label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="uk@example.com"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">{t('login.password')}</label>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>
            {error && (
              <p className="text-red-500 text-sm bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary text-white py-2.5 rounded-xl hover:bg-primary-700 transition font-medium disabled:opacity-50 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  {t('login.registerLoading')}
                </span>
              ) : (
                <><UserPlus size={16} /> {t('login.register')}</>
              )}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <button
            onClick={switchMode}
            className="text-sm text-primary hover:text-primary-700 transition font-medium"
          >
            {mode === 'login' ? t('login.noAccount') : t('login.hasAccount')}
          </button>
        </div>
      </div>
    </div>
  )
}
