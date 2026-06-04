import { useState, useEffect } from 'react'
import api from '../api'

export default function Buildings() {
  const [buildings, setBuildings] = useState([])
  const [form, setForm] = useState({ address: '', district: '', floors: '', apartments_count: '' })

  useEffect(() => {
    api.get('/buildings')
      .then((res) => setBuildings(res.data))
      .catch(() => {})
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/buildings', {
        ...form,
        floors: parseInt(form.floors),
        apartments_count: parseInt(form.apartments_count),
      })
      setBuildings((prev) => [...prev, res.data])
      setForm({ address: '', district: '', floors: '', apartments_count: '' })
    } catch (err) {
      console.error('Failed to add building', err)
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Дома</h1>

      {/* Add form */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6">
        <h2 className="font-semibold mb-4">Добавить дом</h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input
            value={form.address}
            onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Адрес"
            required
          />
          <input
            value={form.district}
            onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Район"
            required
          />
          <input
            type="number"
            value={form.floors}
            onChange={(e) => setForm((p) => ({ ...p, floors: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Этажей"
            required
          />
          <input
            type="number"
            value={form.apartments_count}
            onChange={(e) => setForm((p) => ({ ...p, apartments_count: e.target.value }))}
            className="px-4 py-2 border border-gray-300 rounded-lg"
            placeholder="Квартир"
            required
          />
          <button
            type="submit"
            className="md:col-span-2 px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
          >
            Добавить
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500">
            <tr>
              <th className="text-left p-4">ID</th>
              <th className="text-left p-4">Адрес</th>
              <th className="text-left p-4">Район</th>
              <th className="text-left p-4">Этажей</th>
              <th className="text-left p-4">Квартир</th>
            </tr>
          </thead>
          <tbody>
            {buildings.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-4">#{b.id}</td>
                <td className="p-4">{b.address}</td>
                <td className="p-4">{b.district}</td>
                <td className="p-4">{b.floors}</td>
                <td className="p-4">{b.apartments_count}</td>
              </tr>
            ))}
            {buildings.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-400">
                  Нет домов
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
