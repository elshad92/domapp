import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const statusLabels = {
  new: '🟡 Новая',
  in_progress: '🔵 В работе',
  done: '🟢 Выполнено',
  cancelled: '⚪ Отменена',
}

export default function Dashboard() {
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
    return <div className="text-gray-400 text-center py-12">Загрузка...</div>
  }

  const cards = [
    { label: 'Новые', value: stats.new, color: 'bg-yellow-100 text-yellow-800', icon: '🆕' },
    { label: 'В работе', value: stats.inProgress, color: 'bg-blue-100 text-blue-800', icon: '🔄' },
    { label: 'Выполнено', value: stats.done, color: 'bg-green-100 text-green-800', icon: '✅' },
    { label: 'Всего', value: stats.total, color: 'bg-gray-100 text-gray-800', icon: '📋' },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Дашборд</h1>
        <Link
          to="/requests"
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition text-sm"
        >
          Все заявки →
        </Link>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {cards.map((card) => (
          <div key={card.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{card.icon}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${card.color}`}>
                {card.label}
              </span>
            </div>
            <div className="text-3xl font-bold">{card.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent requests */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold mb-4">Последние заявки</h2>
          {recentRequests.length === 0 ? (
            <p className="text-gray-400 text-center py-8">Нет заявок</p>
          ) : (
            <div className="space-y-3">
              {recentRequests.map((r) => (
                <Link
                  key={r.id}
                  to={`/requests/${r.id}`}
                  className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition group"
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
                  <span className="text-xs text-gray-400 group-hover:text-primary">
                    #{r.id} →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Category stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-lg font-semibold mb-4">По категориям</h2>
          {Object.keys(categoryStats).length === 0 ? (
            <p className="text-gray-400 text-center py-8">Нет данных</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(categoryStats).map(([category, count]) => {
                const maxCount = Math.max(...Object.values(categoryStats))
                const percentage = (count / maxCount) * 100
                return (
                  <div key={category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{category}</span>
                      <span className="font-medium">{count}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
