import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Building2, Plus, MapPin, Layers, DoorOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { SkeletonTable } from '../components/Skeleton'

export default function Buildings() {
  const { t } = useTranslation()
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ address: '', district: '', floors: '', apartments_count: '' })

  useEffect(() => {
    api.get('/buildings')
      .then((res) => setBuildings(res.data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

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
      toast.success(t('common.created'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('buildings.title')}</h1>
        <SkeletonTable rows={4} cols={5} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Building2 size={24} className="text-primary" />
        {t('buildings.title')}
      </h1>

      {/* Add form */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          {t('buildings.addTitle')}
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              placeholder={t('buildings.address')}
              required
            />
          </div>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={form.district}
              onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              placeholder={t('buildings.district')}
              required
            />
          </div>
          <div className="relative">
            <Layers size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              value={form.floors}
              onChange={(e) => setForm((p) => ({ ...p, floors: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              placeholder={t('buildings.floors')}
              required
            />
          </div>
          <div className="relative">
            <DoorOpen size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="number"
              value={form.apartments_count}
              onChange={(e) => setForm((p) => ({ ...p, apartments_count: e.target.value }))}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              placeholder={t('buildings.apartments')}
              required
            />
          </div>
          <button
            type="submit"
            className="md:col-span-2 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {t('buildings.add')}
          </button>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-100">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="text-left p-4 font-medium">ID</th>
                <th className="text-left p-4 font-medium">{t('buildings.address')}</th>
                <th className="text-left p-4 font-medium">{t('buildings.district')}</th>
                <th className="text-left p-4 font-medium">{t('buildings.floors')}</th>
                <th className="text-left p-4 font-medium">{t('buildings.apartments')}</th>
              </tr>
            </thead>
            <tbody>
              {buildings.map((b) => (
                <tr key={b.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-gray-500">#{b.id}</td>
                  <td className="p-4 font-medium">{b.address}</td>
                  <td className="p-4">{b.district}</td>
                  <td className="p-4">{b.floors}</td>
                  <td className="p-4">{b.apartments_count}</td>
                </tr>
              ))}
              {buildings.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-gray-400">
                    {t('buildings.noBuildings')}
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
