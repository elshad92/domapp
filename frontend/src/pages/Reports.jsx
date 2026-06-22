import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  FileText, Calendar, Download, Loader2,
  BarChart3, PieChart, TrendingUp, Building2,
  Users, CreditCard, ClipboardList, AlertCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

export default function Reports() {
  const { t } = useTranslation()
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [summary, setSummary] = useState(null)
  const [categoryData, setCategoryData] = useState([])
  const [paymentData, setPaymentData] = useState([])
  const [dataLoading, setDataLoading] = useState(true)

  useEffect(() => {
    loadAnalytics()
  }, [])

  const loadAnalytics = async () => {
    setDataLoading(true)
    try {
      const [summaryRes, categoryRes, paymentsRes] = await Promise.all([
        api.get('/reports/summary'),
        api.get('/reports/requests-by-category'),
        api.get('/reports/payments-by-month'),
      ])
      setSummary(summaryRes.data)
      setCategoryData(categoryRes.data)
      setPaymentData(paymentsRes.data)
    } catch (err) {
      toast.error(t('common.error'))
    } finally {
      setDataLoading(false)
    }
  }

  const handleDownload = async (e) => {
    e.preventDefault()
    if (!dateFrom || !dateTo) return

    setLoading(true)
    setError('')

    try {
      const res = await api.get('/reports', {
        params: { date_from: dateFrom, date_to: dateTo },
        responseType: 'blob',
      })

      const url = window.URL.createObjectURL(new Blob([res.data]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', `report_${dateFrom}_${dateTo}.pdf`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      toast.success(t('common.success'))
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
        toast.error(err.response.data.detail)
      } else {
        setError(t('reports.error'))
        toast.error(t('reports.error'))
      }
    } finally {
      setLoading(false)
    }
  }

  const maxCategory = Math.max(...categoryData.map((c) => c.total), 1)
  const maxPayment = Math.max(...paymentData.map((p) => p.amount), 1)

  if (dataLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 size={24} className="text-primary" />
        {t('reports.title')}
      </h1>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Building2 size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.buildings}</p>
                <p className="text-xs text-gray-500">{t('buildings.title')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-50 rounded-lg flex items-center justify-center">
                <Users size={20} className="text-teal-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.residents}</p>
                <p className="text-xs text-gray-500">{t('tenants.title')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-50 rounded-lg flex items-center justify-center">
                <ClipboardList size={20} className="text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.requests?.total || 0}</p>
                <p className="text-xs text-gray-500">{t('requests.title')}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                <CreditCard size={20} className="text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-800">{summary.payments?.paid || 0}</p>
                <p className="text-xs text-gray-500">{t('payments.paid')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Requests Status Bar */}
      {summary && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            {t('dashboard.title')} — {t('requests.title')}
          </h2>
          <div className="flex items-center gap-4 mb-3">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('requests.new')}</span>
                <span className="font-medium">{summary.requests?.new || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-amber-400 h-2 rounded-full"
                  style={{ width: `${summary.requests?.total ? (summary.requests.new / summary.requests.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('requests.inProgress')}</span>
                <span className="font-medium">{summary.requests?.in_progress || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-blue-400 h-2 rounded-full"
                  style={{ width: `${summary.requests?.total ? (summary.requests.in_progress / summary.requests.total) * 100 : 0}%` }}
                />
              </div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">{t('requests.done')}</span>
                <span className="font-medium">{summary.requests?.done || 0}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2">
                <div
                  className="bg-green-400 h-2 rounded-full"
                  style={{ width: `${summary.requests?.total ? (summary.requests.done / summary.requests.total) * 100 : 0}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Requests by Category */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <PieChart size={16} className="text-primary" />
            {t('dashboard.byCategory')}
          </h2>
          {categoryData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('dashboard.noData')}</p>
          ) : (
            <div className="space-y-3">
              {categoryData.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700 capitalize">{cat.category}</span>
                    <span className="text-gray-500 font-medium">{cat.total}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-teal-500 h-3 rounded-full transition-all"
                      style={{ width: `${(cat.total / maxCategory) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                    <span>🟡 {cat.new}</span>
                    <span>🔵 {cat.in_progress}</span>
                    <span>🟢 {cat.done}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Payments by Month */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={16} className="text-primary" />
            {t('payments.byMonth')}
          </h2>
          {paymentData.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('dashboard.noData')}</p>
          ) : (
            <div className="space-y-3">
              {paymentData.slice(0, 12).map((pm) => (
                <div key={pm.period}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span className="text-gray-700">{pm.period}</span>
                    <span className="text-green-600 font-medium">{pm.amount.toLocaleString()} сум</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-3">
                    <div
                      className="bg-green-400 h-3 rounded-full transition-all"
                      style={{ width: `${(pm.amount / maxPayment) * 100}%` }}
                    />
                  </div>
                  <div className="flex gap-3 mt-0.5 text-xs text-gray-400">
                    <span>✅ {pm.paid}</span>
                    <span>⏳ {pm.pending}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* PDF Download */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <FileText size={16} className="text-primary" />
          {t('reports.download')}
        </h2>
        <form onSubmit={handleDownload} className="space-y-4 max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                {t('reports.dateFrom')}
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1.5 flex items-center gap-1.5">
                <Calendar size={14} className="text-gray-400" />
                {t('reports.dateTo')}
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
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
            className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> {t('reports.loading')}</>
            ) : (
              <><Download size={16} /> {t('reports.downloadBtn')}</>
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
