import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Megaphone, Building2, Send, Clock } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'
import { SkeletonList } from '../components/Skeleton'

export default function Announcements() {
  const { t } = useTranslation()
  const [announcements, setAnnouncements] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [buildingId, setBuildingId] = useState('')
  const [filterBuilding, setFilterBuilding] = useState('')

  useEffect(() => {
    setLoading(true)
    Promise.all([
      api.get('/announcements'),
      api.get('/buildings'),
    ])
      .then(([annRes, bldRes]) => {
        setAnnouncements(annRes.data)
        setBuildings(bldRes.data)
      })
      .catch(() => toast.error(t('common.error')))
      .finally(() => setLoading(false))
  }, [t])

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
      toast.success(t('common.created'))
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    }
  }

  const filtered = filterBuilding
    ? announcements.filter((a) => a.building_id === parseInt(filterBuilding) || a.building_id === null)
    : announcements

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">{t('announcements.title')}</h1>
        <SkeletonList rows={4} />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Megaphone size={24} className="text-primary" />
        {t('announcements.title')}
      </h1>

      {/* Create form */}
      <div className="bg-white p-6 rounded-xl shadow-sm mb-6 border border-gray-100">
        <h2 className="font-semibold mb-4 flex items-center gap-2">
          <Megaphone size={16} className="text-primary" />
          {t('announcements.create')}
        </h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm resize-none"
            rows={3}
            placeholder={t('announcements.placeholder')}
            required
          />
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Building2 size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl text-sm bg-white appearance-none cursor-pointer"
              >
                <option value="">{t('announcements.allBuildings')}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.address}</option>
                ))}
              </select>
            </div>
            <button
              type="submit"
              className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm flex items-center gap-2"
            >
              <Send size={16} />
              {t('announcements.send')}
            </button>
          </div>
        </form>
      </div>

      {/* Filter */}
      <div className="mb-4">
        <div className="relative inline-block">
          <Building2 size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <select
            value={filterBuilding}
            onChange={(e) => setFilterBuilding(e.target.value)}
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-xl text-sm bg-white appearance-none cursor-pointer"
          >
            <option value="">{t('announcements.filterAll')}</option>
            {buildings.map((b) => (
              <option key={b.id} value={b.id}>{b.address}</option>
            ))}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-3">
        {filtered.map((a) => (
          <div key={a.id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-2 text-xs text-gray-400 mb-2">
              <Clock size={12} />
              <span>{new Date(a.created_at).toLocaleString()}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Building2 size={12} />
                {a.building_id
                  ? buildings.find((b) => b.id === a.building_id)?.address || `#${a.building_id}`
                  : t('announcements.allBuildings')}
              </span>
            </div>
            <p className="text-gray-800 leading-relaxed">{a.text}</p>
          </div>
        ))}
        {filtered.length === 0 && (
          <p className="text-gray-400 text-center py-8">{t('announcements.noAnnouncements')}</p>
        )}
      </div>
    </div>
  )
}
