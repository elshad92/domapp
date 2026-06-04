import { Link, useNavigate, useLocation } from 'react-router-dom'

const navItems = [
  { path: '/', label: 'Дашборд' },
  { path: '/buildings', label: 'Дома' },
  { path: '/requests', label: 'Заявки' },
  { path: '/announcements', label: 'Объявления' },
  { path: '/reports', label: 'Отчёты' },
]

export default function Layout({ children }) {
  const navigate = useNavigate()
  const location = useLocation()
  const companyName = localStorage.getItem('company_name') || 'DomApp'

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('company_id')
    localStorage.removeItem('company_name')
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-primary">DomApp</span>
            <span className="text-sm text-gray-400">|</span>
            <span className="text-sm text-gray-600">{companyName}</span>
          </div>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-500 hover:text-red-500 transition"
          >
            Выйти
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto flex">
        {/* Sidebar */}
        <nav className="w-48 min-h-[calc(100vh-60px)] bg-white border-r p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`block px-3 py-2 rounded-lg text-sm transition ${
                location.pathname === item.path
                  ? 'bg-primary text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
