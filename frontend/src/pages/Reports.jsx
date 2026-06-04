import { useState } from 'react'
import api from '../api'

export default function Reports() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
    } catch (err) {
      if (err.response?.data?.detail) {
        setError(err.response.data.detail)
      } else {
        setError('Ошибка при формировании отчёта')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Отчёты</h1>

      <div className="bg-white p-6 rounded-xl shadow-sm max-w-md">
        <h2 className="font-semibold mb-4">Скачать отчёт по заявкам (PDF)</h2>
        <form onSubmit={handleDownload} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Дата с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Дата по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          {error && (
            <p className="text-red-500 text-sm">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {loading ? 'Формирование...' : 'Скачать PDF'}
          </button>
        </form>
      </div>
    </div>
  )
}
