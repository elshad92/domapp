import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  Plus,
  RefreshCw,
  CheckCircle2,
  ClipboardList,
  AlertTriangle,
  TrendingUp,
  DollarSign,
  Building2,
} from 'lucide-react'
import api from '../api'
import { SkeletonCard, SkeletonList } from '../components/Skeleton'

const statusLabels = {
  new: '🟡 ',
  in_progress: '🔵 ',
  done: '🟢 ',
  cancelled: '⚪ ',
}

export default function Dashboard() {
  const { t } = useTranslation()
  const [stats, setStats] = useState({ new: 0, inProgress: 0, done: 0, cancelled: 0, total: 0 })
  const [recentRequests, setRecentRequests] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.get('/requests'),
      api.get('/buildings'),
    ])
      .then(([reqRes, bldRes]) => {
        const requests = reqRes.data
        const buildingsData = bldRes.data

        setStats({
          new: requests.filter((r) => r.status === 'new').length,
          inProgress: requests.filter((r) => r.status === 'in_progress').length,
          done: requests.filter((r) => r.status === 'done').length,
          cancelled: requests.filter((r) => r.status === 'cancelled').length,
          total: requests.length,
        })

        setRecentRequests(requests.slice(0, 5))
        setBuildings(buildingsData)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Статистика по категориям
  const categoryStats = {}
  recentRequests.forEach((r) => {
    categoryStats[r.category] = (categoryStats[r.category] || 0) + 1
  })

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonList rows={3} />
      </div>
    )
  }

  const cards = [
    {
      label: t('dashboard.new'),
      value: stats.new,
      color: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: Plus,
      iconBg: 'bg-amber-100',
    },
    {
      label: t('dashboard.inProgress'),
      value: stats.inProgress,
      color: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: RefreshCw,
      iconBg: 'bg-blue-100',
    },
    {
      label: t('dashboard.done'),
      value: stats.done,
      color: 'bg-green-50 text-green-700 border-green-200',
      icon: CheckCircle2,
      iconBg: 'bg-green-100',
    },
    {
      label: t('dashboard.total'),
      value: stats.total,
      color: 'bg-gray-50 text-gray-700 border-gray-200',
      icon: ClipboardList,
      iconBg: 'bg-gray-100',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{t('dashboard.title')}</h1>
        <Link
          to="/requests"
          className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700 transition text-sm font-medium flex items-center gap-2"
        >
          <ClipboardList size={16} />
          {t('dashboard.allRequests')}
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => {
          const Icon = card.icon
          return (
            <div
              key={card.label}
              className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${card.iconBg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color.split(' ')[1]} />
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${card.color}`}>
                  {card.label}
                </span>
              </div>
              <div className="text-3xl font-bold text-gray-900">{card.value}</div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent requests */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <ClipboardList size={18} className="text-primary" />
            {t('dashboard.recentRequests')}
          </h2>
          {recentRequests.length === 0 ? (
            <p className="text-gray-400 text-center py-8">{t('dashboard.noRequests')}</p>
          ) : (
            <div className="space-y-2">
              {recentRequests.map((r) => (
                <Link
                  key={r.id}
                  to={`/requests/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 transition group border border-transparent hover:border-gray-100"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-lg">
                      {r.status === 'new' ? '🆕' : r.status === 'in_progress' ? '🔄' : '✅'}
                    </span>
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">{r.description}</div>
                      <div className="text-xs text-gray-400">
                        {r.category} · {new Date(r.created_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 group-hover:text-primary font-mono">
                    #{r.id}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Category stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={18} className="text-primary" />
              {t('dashboard.byCategory')}
            </h2>
            {Object.keys(categoryStats).length === 0 ? (
              <p className="text-gray-400 text-center py-8">{t('dashboard.noData')}</p>
            ) : (
              <div className="space-y-3">
                {Object.entries(categoryStats).map(([category, count]) => {
                  const maxCount = Math.max(...Object.values(categoryStats))
                  const percentage = (count / maxCount) * 100
                  return (
                    <div key={category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize text-gray-700">{category}</span>
                        <span className="font-semibold text-gray-900">{count}</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2.5">
                        <div
                          className="bg-primary h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              {t('dashboard.activeRequests')}
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <Building2 size={14} className="text-gray-400" />
                  {t('nav.buildings')}
                </span>
                <span className="font-bold text-lg">{buildings.length}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <AlertTriangle size={14} className="text-amber-500" />
                  {t('dashboard.new')}
                </span>
                <span className="font-bold text-lg text-amber-600">{stats.new}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <RefreshCw size={14} className="text-blue-500" />
                  {t('dashboard.inProgress')}
                </span>
                <span className="font-bold text-lg text-blue-600">{stats.inProgress}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-600 flex items-center gap-2">
                  <CheckCircle2 size={14} className="text-green-500" />
                  {t('dashboard.done')}
                </span>
                <span className="font-bold text-lg text-green-600">{stats.done}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
