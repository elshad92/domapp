import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import {
  ClipboardList,
  Building2,
  Filter,
  Plus,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import api from '../api'
import { SkeletonTable } from '../components/Skeleton'

const statusConfig = {
  new: { icon: AlertCircle, color: 'text-amber-600 bg-amber-50 border-amber-200', label: '🟡 ' },
  in_progress: { icon: RefreshCw, color: 'text-blue-600 bg-blue-50 border-blue-200', label: '🔵 ' },
  done: { icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200', label: '🟢 ' },
  cancelled: { icon: XCircle, color: 'text-gray-600 bg-gray-50 border-gray-200', label: '⚪ ' },
}

export default function Requests() {
  const { t } = useTranslation()
  const [requests, setRequests] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/requests'),
      api.get('/buildings'),
    ])
      .then(([reqRes, bldRes]) => {
        setRequests(reqRes.data)
        setBuildings(bldRes.data)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = requests.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false
    if (filterBuilding && r.building_id !== parseInt(filterBuilding)) return false
    return true
  })

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('requests.title')}</h1>
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <ClipboardList size={24} className="text-primary" />
        {t('requests.title')}
      </h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {['', 'new', 'in_progress', 'done', 'cancelled'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1.5 rounded-full text-sm border transition font-medium ${
              filterStatus === s
                ? 'bg-primary text-white border-primary'
                : 'bg-white border-gray-300 hover:bg-gray-50 text-gray-600'
            }`}
          >
            {s ? t(`requests.${s}`) : t('requests.all')}
          </button>
        ))}

        <div className="relative ml-auto">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white appearance-none cursor-pointer"
          >
            <option value="">{t('requests.allBuildings')}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.address}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">{t('requests.category')}</th>
                <th className="text-left p-4 font-medium">{t('requests.description')}</th>
                <th className="text-left p-4 font-medium">{t('requests.building')}</th>
                <th className="text-left p-4 font-medium">{t('requests.status')}</th>
                <th className="text-left p-4 font-medium">{t('requests.date')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cfg = statusConfig[r.status] || statusConfig.new
                const StatusIcon = cfg.icon
                return (
                  <tr key={r.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <Link to={`/requests/${r.id}`} className="text-primary hover:underline font-mono font-medium">
                        #{r.id}
                      </Link>
                    </td>
                    <td className="p-4">
                      <span className="capitalize">{r.category}</span>
                    </td>
                    <td className="p-4 max-w-xs truncate text-gray-600">{r.description}</td>
                    <td className="p-4">
                      {buildings.find((b) => b.id === r.building_id)?.address || `#${r.building_id}`}
                    </td>
                    <td className="p-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg.color}`}>
                        <StatusIcon size={12} />
                        {t(`requests.${r.status}`)}
                      </span>
                    </td>
                    <td className="p-4 text-gray-500">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    {t('requests.noRequests')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
