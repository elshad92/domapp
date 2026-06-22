import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, CreditCard, ClipboardList, AlertCircle,
  CheckCircle2, Clock, LogOut, ChevronRight, Home, Phone,
  BarChart3, QrCode,
} from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('resident_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ResidentDashboard() {
  const { t } = useTranslation();
  const [profile, setProfile] = useState(null);
  const [payments, setPayments] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profileRes, paymentsRes, requestsRes] = await Promise.all([
        fetch(`${API_URL}/resident/me`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/resident/me/payments`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/resident/me/requests`, { headers: getAuthHeaders() }),
      ]);

      if (profileRes.status === 401) {
        localStorage.removeItem('resident_token');
        window.location.href = '/resident';
        return;
      }
      if (!profileRes.ok || !paymentsRes.ok || !requestsRes.ok) {
        throw new Error('Resident dashboard request failed');
      }

      setProfile(await profileRes.json());
      const paymentsData = await paymentsRes.json();
      const requestsData = await requestsRes.json();
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setRequests(Array.isArray(requestsData) ? requestsData : []);
    } catch (err) {
      toast.error(t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('resident_token');
    localStorage.removeItem('resident_name');
    localStorage.removeItem('resident_id');
    window.location.href = '/resident';
  };

  const paidCount = payments.filter((p) => p.status === 'paid').length;
  const pendingCount = payments.filter((p) => p.status === 'pending').length;
  const totalAmount = payments.reduce((sum, p) => sum + (p.status === 'paid' ? parseFloat(p.amount) : 0), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-teal-500 rounded-xl flex items-center justify-center">
              <Building2 size={20} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-teal-800">DomApp</h1>
              <p className="text-xs text-gray-500">{t('dashboard.title')}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-red-500 transition"
          >
            <LogOut size={16} />
            {t('nav.logout')}
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Profile Card */}
        {profile && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                <Home size={24} className="text-teal-600" />
              </div>
              <div>
                <h2 className="font-semibold text-gray-800">{profile.name}</h2>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <Phone size={12} />
                  {profile.phone}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">{t('apartments.number')}</p>
                <p className="font-semibold text-gray-800">{profile.apartment_number || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-gray-500">{t('buildings.address')}</p>
                <p className="font-semibold text-gray-800">{profile.building_address || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="/resident/polls"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition text-center"
          >
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <BarChart3 size={20} className="text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">{t('polls.title') || 'Опросы'}</p>
          </a>
          <a
            href="/resident/guest-qr"
            className="bg-white rounded-xl p-4 shadow-sm hover:shadow-md transition text-center"
          >
            <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center mx-auto mb-2">
              <QrCode size={20} className="text-amber-500" />
            </div>
            <p className="text-sm font-medium text-gray-700">{t('guestQR.title') || 'QR для гостя'}</p>
          </a>
        </div>

        {/* Balance */}
        {profile && (
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{t('dashboard.debt')}</p>
                <p className={`text-2xl font-bold ${profile.balance > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {profile.balance > 0 ? `-${profile.balance.toLocaleString()} сум` : '0 сум'}
                </p>
              </div>
              <div className={`p-3 rounded-xl ${profile.balance > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                <CreditCard size={28} className={profile.balance > 0 ? 'text-red-400' : 'text-green-400'} />
              </div>
            </div>
          </div>
        )}

        {/* Payment Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-teal-600">{payments.length}</p>
            <p className="text-xs text-gray-500">{t('payments.totalCount')}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-green-500">{paidCount}</p>
            <p className="text-xs text-gray-500">{t('payments.paidCount')}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm text-center">
            <p className="text-2xl font-bold text-amber-500">{pendingCount}</p>
            <p className="text-xs text-gray-500">{t('payments.pendingCount')}</p>
          </div>
        </div>

        {/* Recent Requests */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ClipboardList size={18} className="text-teal-500" />
              {t('dashboard.recentRequests')}
            </h3>
            <a href="/resident/requests" className="text-sm text-teal-600 hover:text-teal-700 flex items-center gap-1">
              {t('dashboard.allRequests')} <ChevronRight size={14} />
            </a>
          </div>

          {requests.length === 0 ? (
            <div className="bg-white rounded-xl p-6 text-center text-gray-400 text-sm">
              <AlertCircle size={32} className="mx-auto mb-2 opacity-50" />
              {t('dashboard.noRequests')}
            </div>
          ) : (
            <div className="space-y-2">
              {requests.slice(0, 5).map((r) => (
                <a
                  key={r.id}
                  href={`/resident/requests/${r.id}`}
                  className="block bg-white rounded-xl p-3 shadow-sm hover:shadow-md transition"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-teal-600">#{r.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      r.status === 'new' ? 'bg-amber-100 text-amber-700' :
                      r.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {r.status === 'new' ? t('requests.new') :
                       r.status === 'in_progress' ? t('requests.inProgress') :
                       t('requests.done')}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 line-clamp-1">{r.description}</p>
                  <p className="text-xs text-gray-400 mt-1">{r.category}</p>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
