import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Briefcase, Plus, User, Phone, BadgeCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { SkeletonTable } from '../components/Skeleton'

export default function Employees() {
  const { t } = useTranslation()
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [role, setRole] = useState('')

  useEffect(() => {
    api.get('/employees')
      .then((res) => setEmployees(res.data))
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

  const handleAdd = async (e) => {
    e.preventDefault()
    try {
      const res = await api.post('/employees', { name, phone, role })
      setEmployees((prev) => [...prev, res.data])
      setName('')
      setPhone('')
      setRole('')
      toast.success(t('common.created'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('employees.title')}</h1>
        <SkeletonTable rows={4} cols={4} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Briefcase size={24} className="text-primary" />
        {t('employees.title')}
      </h1>

      {/* Add form */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Plus size={16} className="text-primary" />
          {t('employees.add')}
        </h2>
        <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              placeholder={t('employees.name')}
              required
            />
          </div>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              placeholder={t('employees.phone')}
              required
            />
          </div>
          <div className="relative">
            <BadgeCheck size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              placeholder={t('employees.role')}
              required
            />
          </div>
          <button
            type="submit"
            className="md:col-span-3 px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm flex items-center justify-center gap-2"
          >
            <Plus size={16} />
            {t('employees.add')}
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
                <th className="text-left p-4 font-medium">{t('employees.name')}</th>
                <th className="text-left p-4 font-medium">{t('employees.phone')}</th>
                <th className="text-left p-4 font-medium">{t('employees.role')}</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => (
                <tr key={emp.id} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="p-4 font-mono text-gray-500">#{emp.id}</td>
                  <td className="p-4 font-medium">{emp.name}</td>
                  <td className="p-4">{emp.phone}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-primary-50 text-primary rounded-full text-xs font-medium">
                      {emp.role}
                    </span>
                  </td>
                </tr>
              ))}
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-8 text-center text-gray-400">
                    {t('employees.noEmployees')}
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
