import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Users, Plus, Pencil, Trash2, Building2, DoorOpen, Phone, User, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { SkeletonTable } from '../components/Skeleton'

export default function Tenants() {
  const { t } = useTranslation()
  const [tenants, setTenants] = useState([])
  const [buildings, setBuildings] = useState([])
  const [apartments, setApartments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)
  const [filterBuilding, setFilterBuilding] = useState('')
  const [form, setForm] = useState({ building_id: '', apartment_id: '', name: '', phone: '' })

  useEffect(() => {
    setLoading(true)
    setError('')
    Promise.all([
      api.get('/tenants'),
      api.get('/buildings'),
      api.get('/apartments'),
    ])
      .then(([tenRes, bldRes, aptRes]) => {
        setTenants(tenRes.data)
        setBuildings(bldRes.data)
        setApartments(aptRes.data)
      })
      .catch((err) => {
        setError(err.response?.data?.detail || t('common.error'))
      })
      .finally(() => setLoading(false))
  }, [t])

  const filteredTenants = filterBuilding
    ? tenants.filter((t) => {
        const apt = apartments.find((a) => a.id === t.apartment_id)
        return apt && apt.building_id === parseInt(filterBuilding)
      })
    : tenants

  const filteredApartments = form.building_id
    ? apartments.filter((a) => a.building_id === parseInt(form.building_id))
    : apartments

  const resetForm = () => {
    setForm({ building_id: '', apartment_id: '', name: '', phone: '' })
    setEditing(null)
    setShowForm(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      const payload = {
        ...form,
        building_id: parseInt(form.building_id),
        apartment_id: parseInt(form.apartment_id),
      }

      if (editing) {
        await api.put(`/tenants/${editing.id}`, payload)
        toast.success(t('common.updated'))
      } else {
        await api.post('/tenants', payload)
        toast.success(t('common.created'))
      }
      resetForm()
      const res = await api.get('/tenants')
      setTenants(res.data)
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    }
  }

  const handleEdit = (tenant) => {
    setEditing(tenant)
    const apt = apartments.find((a) => a.id === tenant.apartment_id)
    setForm({
      building_id: apt?.building_id?.toString() || '',
      apartment_id: tenant.apartment_id?.toString() || '',
      name: tenant.name || '',
      phone: tenant.phone || '',
    })
    setShowForm(true)
  }

  const handleDelete = async (id) => {
    if (!window.confirm(t('tenants.delete'))) return
    try {
      await api.delete(`/tenants/${id}`)
      setTenants((prev) => prev.filter((t) => t.id !== id))
      toast.success(t('common.deleted'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('tenants.title')}</h1>
        <SkeletonTable rows={5} cols={6} />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Users size={24} className="text-primary" />
          {t('tenants.title')}
        </h1>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterBuilding}
              onChange={(e) => setFilterBuilding(e.target.value)}
              className="pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-sm bg-white appearance-none cursor-pointer"
            >
              <option value="">{t('tenants.allBuildings')}</option>
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
            {t('tenants.add')}
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
                {editing ? t('tenants.edit') : t('tenants.add')}
              </h2>
              <button onClick={resetForm} className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('tenants.building')}</label>
                <select
                  value={form.building_id}
                  onChange={(e) => {
                    setForm((p) => ({ ...p, building_id: e.target.value, apartment_id: '' }))
                  }}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white"
                  required
                >
                  <option value="">{t('tenants.selectBuilding')}</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>{b.address}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('tenants.apartment')}</label>
                <select
                  value={form.apartment_id}
                  onChange={(e) => setForm((p) => ({ ...p, apartment_id: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white"
                  required
                >
                  <option value="">{t('tenants.selectApartment')}</option>
                  {filteredApartments.map((a) => (
                    <option key={a.id} value={a.id}>{a.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('tenants.name')}</label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.name}
                    onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                    placeholder="Иван Иванов"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-500 mb-1">{t('tenants.phone')}</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    value={form.phone}
                    onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                    placeholder="+998901234567"
                    required
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition text-sm font-medium"
                >
                  {editing ? t('tenants.save') : t('tenants.add')}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="px-4 py-2.5 border border-gray-300 rounded-xl text-sm hover:bg-gray-50 transition"
                >
                  {t('tenants.cancel')}
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
                <th className="text-left p-4 font-medium">{t('tenants.name')}</th>
                <th className="text-left p-4 font-medium">{t('tenants.phone')}</th>
                <th className="text-left p-4 font-medium">{t('tenants.apartment')}</th>
                <th className="text-left p-4 font-medium">{t('tenants.building')}</th>
                <th className="text-left p-4 font-medium">{t('tenants.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {filteredTenants.map((tenant) => {
                const apt = apartments.find((a) => a.id === tenant.apartment_id)
                const bld = buildings.find((b) => b.id === (apt?.building_id || tenant.building_id))
                return (
                  <tr key={tenant.id} className="border-t hover:bg-gray-50 transition-colors">
                    <td className="p-4 font-mono text-gray-500">#{tenant.id}</td>
                    <td className="p-4 font-medium">{tenant.name}</td>
                    <td className="p-4">{tenant.phone}</td>
                    <td className="p-4">{apt?.number || '—'}</td>
                    <td className="p-4">{bld?.address || '—'}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(tenant)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => handleDelete(tenant.id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredTenants.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-400">
                    {filterBuilding ? t('tenants.noTenants') : t('tenants.noTenantsAll')}
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
