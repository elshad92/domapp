import { useState, useEffect } from 'react'
import api from '../api'

export default function Announcements() {
  const [announcements, setAnnouncements] = useState([])
  const [buildings, setBuildings] = useState([])
  const [text, setText] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')

  const companyId = localStorage.getItem('company_id') || 1

  useEffect(() => {
    api.get('/announcements')
      .then((res) => setAnnouncements(res.data))
      .catch(() => {})
    api.get(`/buildings?company_id=${companyId}`)
      .then((res) => setBuildings(res.data))
      .catch(() => {})
  }, [companyId])

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!text.trim()) return

    try {
      const res = await api.post('/announcements', {
        text,
        building_id: buildingId || null,
      })
      setAnnouncements((prev) => [res.data, ...prev])
      setText('')
      setBuildingId('')
    } catch (err) {
      console.error('Failed to create announcement', err)
    }
  }

  const filtered = filterBuilding
    ? announcements.filter((a) => a.building_id === parseInt(filterBuilding) || a.building_id === null)
    : announcements

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Объявления</h1>

      {/* Create form */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h2 className="font-semibold mb-4">Создать объявление</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg"
            rows={3}
            placeholder="Текст объявления..."
            required
          />
          <div className="flex gap-2">
            <select
              value={buildingId}
              onChange={(e) => setBuildingId(e.target.value)}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
            >
              <option value="">Всем домам</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.address}</option>
              ))}
            </select>
            <button
              type="submit"
              className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
            >
              Отправить
            </button>
          </div>
        </form>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <select
          value={filterBuilding}
          onChange={(e) => setFilterBuilding(e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Все объявления</option>
          {buildings.map((b) => (
            <option key={b.id} value={b.id}>{b.address}</option>
          ))}
        </select>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="bg-white p-4 rounded-xl shadow-sm">
            <p className="text-sm text-gray-500 mb-1">
              {new Date(a.created_at).toLocaleString()}
              {a.building_id
                ? ` • ${buildings.find((b) => b.id === a.building_id)?.address || `Дом #${a.building_id}`}`
                : ' • Всем домам'}
            </p>
            <p>{a.text}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-center py-8">Нет объявлений</p>
        )}
      </div>
    </div>
  )
}
