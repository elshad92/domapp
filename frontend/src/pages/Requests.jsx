import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import api from '../api'

const statusLabels = {
  new: '🟡 Новая',
  in_progress: '🔵 В работе',
  done: '🟢 Выполнено',
}

export default function Requests() {
  const [requests, setRequests] = useState([])
  const [buildings, setBuildings] = useState([])
  const [filterStatus, setFilterStatus] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')

  const companyId = localStorage.getItem('company_id') || 1

  useEffect(() => {
    api.get('/requests')
      .then((res) => setRequests(res.data))
      .catch(() => {})
    api.get(`/buildings?company_id=${companyId}`)
      .then((res) => setBuildings(res.data))
      .catch(() => {})
  }, [companyId])

  const filtered = requests.filter((r) => {
    if (filterStatus && r.status !== filterStatus) return false
    if (filterBuilding && r.building_id !== parseInt(filterBuilding)) return false
    return true
  })

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Заявки</h1>

      {/* Filters */}
      <div className="flex gap-2 mb-4 flex-wrap items-center">
        {['', 'new', 'in_progress', 'done'].map((s) => (
          <button
            key={s}
            onClick={() => setFilterStatus(s)}
            className={`px-4 py-1 rounded-full text-sm border transition ${
              filterStatus === s ? 'bg-primary text-white border-primary' : 'bg-white border-gray-300 hover:bg-gray-50'
            }`}
          >
            {s ? statusLabels[s] : 'Все'}
          </button>
        ))}

        <select
          value={filterBuilding}
          onChange={(e) => setFilterBuilding(e.target.value)}
          className="ml-auto px-3 py-1 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Все дома</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.address}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left p-4">ID</th>
              <th className="text-left p-4">Категория</th>
              <th className="text-left p-4">Описание</th>
              <th className="text-left p-4">Дом</th>
              <th className="text-left p-4">Статус</th>
              <th className="text-left p-4">Дата</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-gray-50">
                <td className="p-4">
                  <Link to={`/requests/${r.id}`} className="text-primary hover:underline">
                    #{r.id}
                  </Link>
                </td>
                <td className="p-4">{r.category}</td>
                <td className="p-4 max-w-xs truncate">{r.description}</td>
                <td className="p-4">
                  {buildings.find((b) => b.id === r.building_id)?.address || `Дом #${r.building_id}`}
                </td>
                <td className="p-4">{statusLabels[r.status] || r.status}</td>
                <td className="p-4">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-400">
                  Нет заявок
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
