import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import api from '../api'

const statusOptions = [
  { value: 'new', label: '🟡 Новая' },
  { value: 'in_progress', label: '🔵 В работе' },
  { value: 'done', label: '🟢 Выполнено' },
]

export default function RequestDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [request, setRequest] = useState(null)
  const [status, setStatus] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    // Получаем все заявки и находим нужную по id
    api.get('/requests')
      .then((res) => {
        const found = res.data.find((r) => r.id === parseInt(id))
        if (found) {
          setRequest(found)
          setStatus(found.status)
        } else {
          navigate('/requests')
        }
      })
      .catch(() => navigate('/requests'))
  }, [id, navigate])

  const handleStatusChange = async () => {
    try {
      await api.patch(`/requests/${id}`, { status })
      setRequest((prev) => ({ ...prev, status }))
    } catch (err) {
      console.error('Failed to update status', err)
    }
  }

  const handleSaveComment = async () => {
    if (!comment.trim()) return
    try {
      await api.patch(`/requests/${id}`, { comment: comment.trim() })
      setRequest((prev) => ({ ...prev, comment: comment.trim() }))
      setComment('')
    } catch (err) {
      console.error('Failed to save comment', err)
    }
  }

  if (!request) return <div className="text-gray-400">Загрузка...</div>

  return (
    <div>
      <button
        onClick={() => navigate('/requests')}
        className="text-gray-500 hover:text-gray-700 mb-4"
      >
        ← Назад к заявкам
      </button>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h1 className="text-xl font-bold mb-4">Заявка #{request.id}</h1>

        <div className="space-y-3">
          <div>
            <span className="text-gray-500 text-sm">Категория:</span>
            <p className="font-medium">{request.category}</p>
          </div>
          <div>
            <span className="text-gray-500 text-sm">Описание:</span>
            <p className="font-medium">{request.description}</p>
          </div>
          {request.photo_url && (
            <div>
              <span className="text-gray-500 text-sm">Фото:</span>
              <img src={request.photo_url} alt="Фото заявки" className="mt-1 max-w-sm rounded-lg" />
            </div>
          )}
          <div>
            <span className="text-gray-500 text-sm">Дата:</span>
            <p className="font-medium">{new Date(request.created_at).toLocaleString()}</p>
          </div>

          {/* Comment */}
          {request.comment && (
            <div>
              <span className="text-gray-500 text-sm">Комментарий УК:</span>
              <p className="font-medium bg-gray-50 p-3 rounded-lg mt-1">{request.comment}</p>
            </div>
          )}

          {/* Status change */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Статус</label>
            <div className="flex gap-2">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg"
              >
                {statusOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
              <button
                onClick={handleStatusChange}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
              >
                Сохранить
              </button>
            </div>
          </div>

          {/* Add comment */}
          <div className="pt-4 border-t">
            <label className="block text-sm font-medium text-gray-700 mb-2">Добавить комментарий</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Напишите комментарий..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg"
              />
              <button
                onClick={handleSaveComment}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition"
              >
                Отправить
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
