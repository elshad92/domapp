import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ClipboardList, AlertCircle, ChevronRight, ArrowLeft, Plus,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('resident_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ResidentRequests() {
  const { t } = useTranslation();
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      const res = await fetch(`${API_URL}/resident/me/requests`, { headers: getAuthHeaders() });
      if (res.status === 401) {
        localStorage.removeItem('resident_token');
        window.location.href = '/resident';
        return;
      }
      setRequests(await res.json());
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const filtered = filter ? requests.filter((r) => r.status === filter) : requests;

  const filters = [
    { value: '', label: t('requests.all') },
    { value: 'new', label: t('requests.new') },
    { value: 'in_progress', label: t('requests.inProgress') },
    { value: 'done', label: t('requests.done') },
  ];

  const statusColors = {
    new: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    done: 'bg-green-100 text-green-700',
  };

  return (
    <div className="min-h-screen bg-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/resident/dashboard" className="text-gray-500 hover:text-teal-600 transition">
            <ArrowLeft size={20} />
          </a>
          <div className="w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <ClipboardList size={16} className="text-white" />
          </div>
          <h1 className="font-bold text-teal-800">{t('requests.title')}</h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4">
        {/* Filters */}
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                filter === f.value
                  ? 'bg-teal-500 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-teal-300'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center text-gray-400">
            <ClipboardList size={40} className="mx-auto mb-3 opacity-50" />
            <p className="text-sm">{t('requests.noRequests')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <a
                key={r.id}
                href={`/resident/requests/${r.id}`}
                className="block bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-teal-600">#{r.id}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[r.status] || 'bg-gray-100 text-gray-600'}`}>
                    {t(`requests.${r.status}`)}
                  </span>
                </div>
                <p className="font-medium text-gray-800 text-sm mb-1">{r.category}</p>
                <p className="text-sm text-gray-600 line-clamp-2">{r.description}</p>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-xs text-gray-400">
                    {new Date(r.created_at).toLocaleDateString()}
                  </span>
                  <ChevronRight size={14} className="text-gray-300" />
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
