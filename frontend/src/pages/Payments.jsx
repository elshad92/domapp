import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Search,
  Calendar,
  Building2,
  Download,
} from 'lucide-react'
import api from '../api'
import { SkeletonCard, SkeletonTable } from '../components/Skeleton'

const formatAmount = (value) => {
  const number = Number(value || 0)
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency',
    currency: 'UZS',
    maximumFractionDigits: 0,
  }).format(number)
}

const statusIcons = {
  pending: Clock,
  paid: CheckCircle2,
  failed: XCircle,
}

const statusColors = {
  pending: 'text-amber-600 bg-amber-50 border-amber-200',
  paid: 'text-green-600 bg-green-50 border-green-200',
  failed: 'text-red-600 bg-red-50 border-red-200',
}

export default function Payments() {
  const { t } = useTranslation()
  const [summary, setSummary] = useState(null)
  const [months, setMonths] = useState([])
  const [year, setYear] = useState(new Date().getFullYear().toString())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Детальный реестр
  const [payments, setPayments] = useState([])
  const [buildings, setBuildings] = useState([])
  const [filterBuilding, setFilterBuilding] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [loadingDetail, setLoadingDetail] = useState(false)

  useEffect(() => {
    setLoading(true)
    setError('')

    Promise.all([
      api.get('/reports/summary'),
      api.get('/reports/payments-by-month', { params: year ? { year } : {} }),
      api.get('/buildings'),
    ])
      .then(([summaryRes, monthsRes, bldRes]) => {
        setSummary(summaryRes.data.payments || null)
        setMonths(monthsRes.data)
        setBuildings(bldRes.data)
      })
      .catch((err) => {
        setError(err.response?.data?.detail || t('common.error'))
      })
      .finally(() => setLoading(false))
  }, [year, t])

  // Загрузка детального реестра
  useEffect(() => {
    setLoadingDetail(true)
    const params = {}
    if (filterBuilding) params.building_id = filterBuilding
    if (filterStatus) params.status = filterStatus

    api.get('/payments', { params })
      .then((res) => setPayments(res.data))
      .catch(() => setPayments([]))
      .finally(() => setLoadingDetail(false))
  }, [filterBuilding, filterStatus])

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('payments.title')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </div>
        <SkeletonTable rows={4} cols={5} />
      </div>
    )
  }

  const summaryCards = [
    {
      label: t('payments.total'),
      value: summary?.total ?? 0,
      icon: CreditCard,
      color: 'text-gray-900',
      bg: 'bg-gray-50',
    },
    {
      label: t('payments.paid'),
      value: summary?.paid ?? 0,
      icon: CheckCircle2,
      color: 'text-green-600',
      bg: 'bg-green-50',
    },
    {
      label: t('payments.pending'),
      value: summary?.pending ?? 0,
      icon: Clock,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CreditCard size={24} className="text-primary" />
          {t('payments.title')}
        </h1>
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-gray-400" />
          <input
            type="number"
            min="2000"
            max="2100"
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="w-24 px-3 py-2 border border-gray-300 rounded-xl text-sm bg-white text-center font-medium"
            placeholder={t('payments.year')}
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-600 text-sm flex items-center gap-2">
          <XCircle size={16} />
          {error}
        </div>
      )}

      {/* Сводка */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon
          return (
            <div key={card.label} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-3 mb-2">
                <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center`}>
                  <Icon size={20} className={card.color} />
                </div>
                <span className="text-sm text-gray-500">{card.label}</span>
              </div>
              <div className={`text-3xl font-bold ${card.color}`}>{card.value}</div>
            </div>
          )
        })}
      </div>

      {/* По месяцам */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-6 border border-gray-100">
        <div className="px-5 py-4 border-b bg-gray-50 flex items-center gap-2">
          <Calendar size={16} className="text-primary" />
          <h2 className="font-semibold text-sm">{t('payments.byMonth')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4 font-medium">{t('payments.period')}</th>
                <th className="text-left p-4 font-medium">{t('payments.totalCount')}</th>
                <th className="text-left p-4 font-medium">{t('payments.paidCount')}</th>
                <th className="text-left p-4 font-medium">{t('payments.pendingCount')}</th>
                <th className="text-left p-4 font-medium">{t('payments.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {months.map((month) => (
                <tr key={month.period} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-medium text-gray-900">{month.period}</td>
                  <td className="p-4">{month.total}</td>
                  <td className="p-4 text-green-600 font-medium">{month.paid}</td>
                  <td className="p-4 text-amber-600">{month.pending}</td>
                  <td className="p-4 font-medium">{formatAmount(month.amount)}</td>
                </tr>
              ))}
              {months.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    {t('payments.noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Детальный реестр */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="px-5 py-4 border-b bg-gray-50">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Search size={16} className="text-primary" />
              {t('payments.registry')}
            </h2>
            <div className="flex gap-2">
              <div className="relative">
                <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <select
                  value={filterBuilding}
                  onChange={(e) => setFilterBuilding(e.target.value)}
                  className="pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white appearance-none cursor-pointer"
                >
                  <option value="">{t('payments.allBuildings')}</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.address}</option>
                  ))}
                </select>
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs bg-white appearance-none cursor-pointer"
              >
                <option value="">{t('payments.allStatuses')}</option>
                <option value="pending">{t('payments.pending')}</option>
                <option value="paid">{t('payments.paid')}</option>
                <option value="failed">{t('payments.failed')}</option>
              </select>
            </div>
          </div>
        </div>

        {loadingDetail ? (
          <SkeletonTable rows={3} cols={6} />
        ) : payments.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500">
                <tr>
                  <th className="text-left p-4 font-medium">ID</th>
                  <th className="text-left p-4 font-medium">{t('payments.resident')}</th>
                  <th className="text-left p-4 font-medium">{t('payments.period')}</th>
                  <th className="text-left p-4 font-medium">{t('payments.amount')}</th>
                  <th className="text-left p-4 font-medium">{t('payments.statusLabel')}</th>
                  <th className="text-left p-4 font-medium">{t('payments.paidAt')}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => {
                  const StatusIcon = statusIcons[p.status] || Clock
                  const statusColor = statusColors[p.status] || 'text-gray-600 bg-gray-50 border-gray-200'
                  return (
                    <tr key={p.id} className="border-t hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-mono text-gray-500">#{p.id}</td>
                      <td className="p-4 font-medium">{p.resident_name || `#${p.resident_id}`}</td>
                      <td className="p-4">{p.period}</td>
                      <td className="p-4 font-semibold">{formatAmount(p.amount)}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
                          <StatusIcon size={12} />
                          {t(`payments.${p.status}`)}
                        </span>
                      </td>
                      <td className="p-4 text-gray-500">
                        {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CreditCard size={24} className="text-gray-400" />
            </div>
            <p className="text-gray-500 mb-2">{t('payments.noRegistry')}</p>
            <p className="text-xs text-gray-400 max-w-md mx-auto">
              {t('payments.noRegistryHint')}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
