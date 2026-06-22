import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Clock, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('resident_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ResidentRequestDetail() {
  const { t } = useTranslation();
  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get ID from URL
  const id = window.location.pathname.split('/').pop();

  useEffect(() => {
    loadRequest();
  }, [id]);

  const loadRequest = async () => {
    try {
      const res = await fetch(`${API_URL}/resident/me/requests`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        localStorage.removeItem('resident_token');
        window.location.href = '/resident';
        return;
      }
      const all = await res.json();
      const found = all.find((r) => r.id === parseInt(id));
      if (found) {
        setRequest(found);
      } else {
        toast.error(t('common.error'));
        window.location.href = '/resident/requests';
      }
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const statusColors = {
    new: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!request) return null;

  return (
    <div className="min-h-screen bg-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/resident/requests" className="text-gray-500 hover:text-teal-600 transition">
            <ArrowLeft size={20} />
          </a>
          <h1 className="font-bold text-teal-800">
            {t('requests.detail')} #{request.id}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <div className="bg-white rounded-xl p-5 shadow-sm space-y-4">
          {/* Status */}
          <div className="flex items-center justify-between">
            <span className={`text-sm px-3 py-1 rounded-full ${statusColors[request.status] || 'bg-gray-100 text-gray-600'}`}>
              {t(`requests.${request.status}`)}
            </span>
            <span className="text-xs text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              {new Date(request.created_at).toLocaleString()}
            </span>
          </div>

          {/* Category */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('requests.category')}</p>
            <p className="font-medium text-gray-800">{request.category}</p>
          </div>

          {/* Description */}
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wide">{t('requests.description')}</p>
            <p className="text-sm text-gray-700">{request.description}</p>
          </div>

          {/* Photo */}
          {request.photo_url && (
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">{t('requests.photo')}</p>
              <img
                src={request.photo_url}
                alt="Request"
                className="w-full rounded-lg max-h-64 object-cover"
              />
            </div>
          )}

          {/* Comment */}
          {request.comment && (
            <div className="bg-teal-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <MessageCircle size={14} className="text-teal-500" />
                <p className="text-xs font-medium text-teal-700">{t('requests.comment')}</p>
              </div>
              <p className="text-sm text-gray-700">{request.comment}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
