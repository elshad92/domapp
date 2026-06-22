import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BarChart3, Plus, Vote, Clock, CheckCircle2,
  X, Loader2, Building2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../api'

export default function Polls() {
  const { t } = useTranslation()
  const [polls, setPolls] = useState([])
  const [buildings, setBuildings] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [selectedPoll, setSelectedPoll] = useState(null)
  const [results, setResults] = useState(null)

  // Create form
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState(['', ''])
  const [buildingId, setBuildingId] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [pollsRes, buildingsRes] = await Promise.all([
        api.get('/polls'),
        api.get('/buildings'),
      ])
      setPolls(pollsRes.data)
      setBuildings(buildingsRes.data)
    } catch (err) {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!question.trim() || !buildingId) {
      toast.error('Заполните все поля')
      return
    }
    const validOptions = options.filter((o) => o.trim())
    if (validOptions.length < 2) {
      toast.error('Добавьте минимум 2 варианта ответа')
      return
    }

    setCreating(true)
    try {
      await api.post('/polls', {
        company_id: parseInt(localStorage.getItem('company_id')),
        building_id: parseInt(buildingId),
        question: question.trim(),
        options: validOptions,
        ends_at: endsAt || null,
      })
      toast.success(t('common.created'))
      setShowCreate(false)
      resetForm()
      loadData()
    } catch (err) {
      toast.error(err.response?.data?.detail || t('common.error'))
    } finally {
      setCreating(false)
    }
  }

  const resetForm = () => {
    setQuestion('')
    setOptions(['', ''])
    setBuildingId('')
    setEndsAt('')
  }

  const addOption = () => setOptions([...options, ''])
  const removeOption = (idx) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, i) => i !== idx))
  }

  const loadResults = async (poll) => {
    try {
      const res = await api.get(`/polls/${poll.id}/results`)
      setResults(res.data)
      setSelectedPoll(poll)
    } catch (err) {
      toast.error(t('common.error'))
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={24} className="animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BarChart3 size={24} className="text-primary" />
          {t('polls.title') || 'Опросы жильцов'}
        </h1>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary-700 transition text-sm font-medium"
        >
          <Plus size={16} />
          {t('polls.create') || 'Создать опрос'}
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold flex items-center gap-2">
              <Plus size={16} className="text-primary" />
              {t('polls.create') || 'Новый опрос'}
            </h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('buildings.address')}</label>
              <select
                value={buildingId}
                onChange={(e) => setBuildingId(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                required
              >
                <option value="">{t('apartments.selectBuilding')}</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>{b.address}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">{t('polls.question') || 'Вопрос'}</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
                placeholder="Например: Устраивает ли вас работа УК?"
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t('polls.options') || 'Варианты ответа'}
              </label>
              <div className="space-y-2">
                {options.map((opt, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...options]
                        newOpts[idx] = e.target.value
                        setOptions(newOpts)
                      }}
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-xl text-sm"
                      placeholder={`Вариант ${idx + 1}`}
                    />
                    {options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removeOption(idx)}
                        className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOption}
                className="mt-2 text-sm text-primary hover:text-primary-700 flex items-center gap-1"
              >
                <Plus size={14} /> {t('polls.addOption') || 'Добавить вариант'}
              </button>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">
                {t('polls.endsAt') || 'Дата завершения (необязательно)'}
              </label>
              <input
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="px-6 py-2.5 bg-primary text-white rounded-xl hover:bg-primary-700 transition font-medium text-sm disabled:opacity-50 flex items-center gap-2"
            >
              {creating ? (
                <><Loader2 size={16} className="animate-spin" /> {t('common.saving')}</>
              ) : (
                <><Vote size={16} /> {t('polls.create') || 'Создать опрос'}</>
              )}
            </button>
          </form>
        </div>
      )}

      {/* Polls List */}
      {polls.length === 0 ? (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 border border-gray-100">
          <BarChart3 size={48} className="mx-auto mb-3 opacity-30" />
          <p>{t('polls.noPolls') || 'Опросы ещё не созданы'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {polls.map((poll) => (
            <div
              key={poll.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition cursor-pointer"
              onClick={() => loadResults(poll)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{poll.question}</h3>
                  <p className="text-xs text-gray-400 mt-1">
                    {poll.options?.length || 0} вариантов
                    {poll.ends_at && (
                      <> · до {new Date(poll.ends_at).toLocaleDateString('ru-RU')}</>
                    )}
                  </p>
                </div>
                <div className="w-8 h-8 bg-teal-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <BarChart3 size={16} className="text-teal-500" />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {poll.options?.map((opt, idx) => (
                  <span key={idx} className="text-xs bg-gray-50 text-gray-600 px-2.5 py-1 rounded-full border border-gray-100">
                    {opt}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results Modal */}
      {selectedPoll && results && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setSelectedPoll(null); setResults(null) }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-lg">{results.question}</h2>
              <button onClick={() => { setSelectedPoll(null); setResults(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              Всего голосов: <strong>{results.total_votes}</strong>
            </p>
            <div className="space-y-3">
              {results.results?.map((r, idx) => {
                const pct = results.total_votes > 0 ? Math.round((r.votes / results.total_votes) * 100) : 0
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-gray-700">{r.option}</span>
                      <span className="text-gray-500 font-medium">{r.votes} ({pct}%)</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className="bg-teal-500 h-2.5 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
