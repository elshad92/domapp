import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { QrCode, ArrowLeft, RefreshCw, Clock, Building2, Home, Loader2 } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('resident_token');
  return token ? { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } : {};
}

export default function ResidentGuestQR() {
  const { t } = useTranslation();
  const [qrData, setQrData] = useState(null);
  const [loading, setLoading] = useState(false);

  const generateQR = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/resident/me/guest-qr`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Ошибка генерации QR-кода');
      }
      const data = await res.json();
      setQrData(data);
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (iso) => {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleString('ru-RU', {
        day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="min-h-screen bg-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/resident/dashboard" className="text-gray-500 hover:text-teal-600 transition">
            <ArrowLeft size={20} />
          </a>
          <h1 className="font-bold text-teal-800 flex items-center gap-2">
            <QrCode size={20} className="text-teal-500" />
            {t('guestQR.title') || 'QR-код для гостя'}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        {!qrData ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <div className="w-20 h-20 bg-teal-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <QrCode size={40} className="text-teal-500" />
            </div>
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {t('guestQR.generateTitle') || 'Пропустите гостя'}
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              {t('guestQR.description') || 'Сгенерируйте QR-код, чтобы гость мог пройти в дом. Код действителен 24 часа.'}
            </p>
            <button
              onClick={generateQR}
              disabled={loading}
              className="w-full max-w-xs mx-auto flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-70 text-white font-semibold py-3 px-6 rounded-xl transition"
            >
              {loading ? (
                <><Loader2 size={18} className="animate-spin" /> {t('common.loading')}</>
              ) : (
                <><QrCode size={18} /> {t('guestQR.generate') || 'Сгенерировать QR-код'}</>
              )}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* QR Code Display */}
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <div className="bg-white p-4 rounded-2xl inline-block shadow-sm border border-gray-100 mb-4">
                <img
                  src={`data:image/png;base64,${qrData.qr_base64}`}
                  alt="Guest QR Code"
                  className="w-48 h-48 mx-auto"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Building2 size={14} className="text-teal-500" />
                  <span>{qrData.building_address}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Home size={14} className="text-teal-500" />
                  <span>{t('apartments.number')}: {qrData.apartment_number}</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-sm text-amber-600">
                  <Clock size={14} />
                  <span>{t('guestQR.expires') || 'Действителен до'}: {formatDate(qrData.expires_at)}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const canvas = document.createElement('canvas');
                  const img = new Image();
                  img.onload = () => {
                    canvas.width = img.width;
                    canvas.height = img.height;
                    canvas.getContext('2d').drawImage(img, 0, 0);
                    canvas.toBlob((blob) => {
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'guest-qr.png';
                      a.click();
                      URL.revokeObjectURL(url);
                    });
                  };
                  img.src = `data:image/png;base64,${qrData.qr_base64}`;
                }}
                className="flex-1 flex items-center justify-center gap-2 bg-white border border-teal-200 text-teal-600 hover:bg-teal-50 font-medium py-3 px-4 rounded-xl transition text-sm"
              >
                <QrCode size={16} />
                {t('guestQR.download') || 'Скачать'}
              </button>
              <button
                onClick={generateQR}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-70 text-white font-medium py-3 px-4 rounded-xl transition text-sm"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <><RefreshCw size={16} /> {t('guestQR.refresh') || 'Обновить'}</>
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 text-center">
              {t('guestQR.shareHint') || 'Покажите QR-код гостю или отправьте скриншот. Охранник отсканирует код для входа.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
