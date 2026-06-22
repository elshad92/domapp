import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DoorOpen,
  Plus,
  Pencil,
  Trash2,
  Building2,
  Layers,
  Maximize2,
  User,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { SkeletonTable } from '../components/Skeleton'

export default function Apartments() {
  const { t } = useTranslation()
  const [apartments, setApartments] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [form, setForm] = useState({ building_id: '', number: '', floor: '', area: '' })

  const fetchApartments = () => {
    const params = filterBuilding ? { building_id: filterBuilding } : {}
    return api.get('/apartments', { params })
  }

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      fetchApartments(),
      api.get('/buildings'),
    ])
      .then(([aptRes, bldRes]) => {
        setApartments(aptRes.data)
        setBuildings(bldRes.data)
      })
      .catch((err) => {
        setError(err.response?.data?.detail || t('common.error'))
      })
      .finally(() => setLoading(false))
  }, [t])

  useEffect(() => {
    fetchApartments()
      .then((res) => setApartments(res.data))
      .catch(() => {})
  }, [filterBuilding])

  const resetForm = () => {
    setForm({ building_id: '', number: '', floor: '', area: '' })
    setEditing(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        building_id: parseInt(form.building_id),
        floor: parseInt(form.floor),
        area: form.area ? parseFloat(form.area) : null,
      }

      if (editing) {
        await api.patch(`/apartments/${editing.id}`, payload)
        toast.success(t('common.updated'))
      } else {
        await api.post('/apartments', payload)
        toast.success(t('common.created'))
      }
      resetForm()
      const res = await fetchApartments()
      setApartments(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    }
  }

  const handleEdit = (apartment) => {
    setEditing(apartment)
    setForm({
      building_id: apartment.building_id?.toString() || '',
      number: apartment.number || '',
      floor: apartment.floor?.toString() || '',
      area: apartment.area?.toString() || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('apartments.delete'))) return
    try {
      await api.delete(`/apartments/${id}`)
      setApartments((prev) => prev.filter((a) => a.id !== id))
      toast.success(t('common.deleted'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('apartments.title')}</h1>
        <SkeletonTable rows={5} cols={7} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <DoorOpen size={24} className="text-primary" />
          {t('apartments.title')}
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-sm bg-white appearance-none cursor-pointer"
            >
              <option value="">{t('apartments.allBuildings')}</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>{b.address}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => { resetForm(); setShowForm(true) }}
            className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700 transition text-sm font-medium flex items-center gap-2"
          >
            <Plus size={16} />
            {t('apartments.add')}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6 text-red-600 text-sm">
          {error}
        </div>
      )}

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">
                {editing ? t('apartments.edit') : t('apartments.add')}
              </h2>
              <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('apartments.building')}</label>
                <select
                  value={form.building_id}
                  onChange={(e) => setForm((p) => ({ ...p, building_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white"
                  required
                >
                  <option value="">{t('apartments.selectBuilding')}</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.address}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('apartments.number')}</label>
                <input
                  value={form.number}
                  onChange={(e) => setForm((p) => ({ ...p, number: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                  placeholder="42"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('apartments.floor')}</label>
                <input
                  type="number"
                  value={form.floor}
                  onChange={(e) => setForm((p) => ({ ...p, floor: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                  placeholder="5"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('apartments.area')}</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.area}
                  onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                  placeholder="65.5"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition text-sm font-medium"
                >
                  {editing ? t('apartments.save') : t('apartments.add')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  {t('apartments.cancel')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">{t('apartments.building')}</th>
                <th className="text-left p-4 font-medium">{t('apartments.number')}</th>
                <th className="text-left p-4 font-medium">{t('apartments.floor')}</th>
                <th className="text-left p-4 font-medium">{t('apartments.area')}</th>
                <th className="text-left p-4 font-medium">{t('apartments.resident')}</th>
                <th className="text-left p-4 font-medium">{t('apartments.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {apartments.map((a) => (
                <tr key={a.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-gray-500">#{a.id}</td>
                  <td className="p-4">{a.building_name || '—'}</td>
                  <td className="p-4 font-medium">{a.number}</td>
                  <td className="p-4">{a.floor}</td>
                  <td className="p-4">{a.area ? `${a.area} м²` : '—'}</td>
                  <td className="p-4">{a.resident_name || '—'}</td>
                  <td className="p-4">
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(a)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        title={t('apartments.edit')}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        title={t('apartments.delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {apartments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-gray-400">
                    {filterBuilding ? t('apartments.noApartments') : t('apartments.noApartmentsAll')}
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
