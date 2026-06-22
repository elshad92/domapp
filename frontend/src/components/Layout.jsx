import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  LayoutDashboard,
  Building2,
  DoorOpen,
  Users,
  Briefcase,
  ClipboardList,
  CreditCard,
  Megaphone,
  FileText,
  BarChart3,
  LogOut,
  Menu,
  X,
  Globe,
} from 'lucide-react'

const navItems = [
  { path: '/dashboard', label: 'nav.dashboard', icon: LayoutDashboard },
  { path: '/buildings', label: 'nav.buildings', icon: Building2 },
  { path: '/apartments', label: 'nav.apartments', icon: DoorOpen },
  { path: '/tenants', label: 'nav.tenants', icon: Users },
  { path: '/employees', label: 'nav.employees', icon: Briefcase },
  { path: '/requests', label: 'nav.requests', icon: ClipboardList },
  { path: '/payments', label: 'nav.payments', icon: CreditCard },
  { path: '/announcements', label: 'nav.announcements', icon: Megaphone },
  { path: '/polls', label: 'nav.polls', icon: BarChart3 },
  { path: '/reports', label: 'nav.reports', icon: FileText },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { t, i18n } = useTranslation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const companyName = localStorage.getItem('company_name') || 'DomApp'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('company_id')
    localStorage.removeItem('company_name')
    localStorage.removeItem('plan')
    navigate('/login')
  }

  const toggleLang = () => {
    const next = i18n.language === 'ru' ? 'uz' : 'ru'
    i18n.changeLanguage(next)
  }

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/'
    return location.pathname.startsWith(path)
  }

  const sidebarContent = (
    <nav className="space-y-1">
      {navItems.map((item) => {
        const Icon = item.icon
        return (
          <Link
            key={item.path}
            to={item.path}
            onClick={() => setSidebarOpen(false)}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
              isActive(item.path)
                ? 'bg-primary text-white shadow-sm'
                : 'text-gray-600 hover:bg-primary-50 hover:text-primary'
            }`}
          >
            <Icon size={18} />
            <span>{t(item.label)}</span>
          </Link>
        )
      })}
    </nav>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Mobile menu button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 -ml-2 text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition"
            >
              <Menu size={20} />
            </button>

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Building2 size={18} className="text-white" />
              </div>
              <span className="text-lg font-bold text-primary">{t('app.name')}</span>
              <span className="text-xs text-gray-400 hidden sm:inline">|</span>
              <span className="text-sm text-gray-500 hidden sm:inline font-medium">{companyName}</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            {/* Language toggle */}
            <button
              onClick={toggleLang}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-primary hover:bg-primary-50 rounded-lg transition border border-gray-200"
            >
              <Globe size={14} />
              {i18n.language === 'ru' ? 'UZ' : 'RU'}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
            >
              <LogOut size={14} />
              <span className="hidden sm:inline">{t('nav.logout')}</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex relative">
        {/* Desktop sidebar */}
        <aside className="hidden lg:block w-56 min-h-[calc(100vh-60px)] bg-white border-r border-gray-200 p-4 sticky top-[60px] self-start">
          {sidebarContent}
        </aside>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 lg:hidden">
            <div
              className="fixed inset-0 bg-black/40 backdrop-blur-sm"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-64 bg-white shadow-xl z-50 animate-slide-in">
              <div className="flex items-center justify-between p-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
                    <Building2 size={16} className="text-white" />
                  </div>
                  <span className="font-bold text-primary">{t('app.name')}</span>
                </div>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="p-4">
                {sidebarContent}
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 p-4 sm:p-6 min-h-[calc(100vh-60px)]">
          {children}
        </main>
      </div>
    </div>
  )
}
