import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Building2, Phone, LogIn, Globe, ArrowLeft, KeyRound, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function ResidentLogin() {
  const { t, i18n } = useTranslation();
  const [step, setStep] = useState('phone'); // 'phone' | 'code'
  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error('Введите номер телефона');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/resident/auth/send-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Ошибка отправки кода');
      }
      toast.success('Код отправлен в SMS');
      setStep('code');
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    if (!code.trim()) {
      toast.error('Введите код из SMS');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/resident/auth/verify-code`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), code: code.trim() }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Неверный код');
      }
      const data = await res.json();
      localStorage.setItem('resident_token', data.token);
      localStorage.setItem('resident_name', data.name);
      localStorage.setItem('resident_id', String(data.resident_id));
      toast.success(t('common.success'));
      window.location.href = '/resident/dashboard';
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleLang = () => {
    const next = i18n.language?.startsWith('uz') ? 'ru' : 'uz';
    i18n.changeLanguage(next);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-amber-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Language Toggle */}
        <div className="flex justify-end mb-4">
          <button
            onClick={toggleLang}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-teal-100 rounded-lg text-sm font-medium text-teal-600 hover:bg-teal-50 transition"
          >
            <Globe size={16} />
            {i18n.language?.startsWith('uz') ? 'RU' : 'UZ'}
          </button>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-lg p-8">
          {/* Logo */}
          <div className="flex flex-col items-center mb-6">
            <div className="w-16 h-16 bg-teal-500 rounded-xl flex items-center justify-center mb-3">
              <Building2 size={32} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-teal-800">DomApp</h1>
            <p className="text-sm text-gray-500 mt-1">
              {step === 'phone' ? 'Вход в личный кабинет' : 'Подтверждение'}
            </p>
          </div>

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} className="space-y-4">
              {/* Phone Input */}
              <div className="relative">
                <Phone size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+998 XX XXX XX XX"
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-70 text-white font-semibold py-3 px-4 rounded-xl transition"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Smartphone size={18} />
                    Получить код
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode} className="space-y-4">
              {/* Code Input */}
              <div className="relative">
                <KeyRound size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="6-значный код из SMS"
                  maxLength={6}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:border-teal-400 focus:ring-2 focus:ring-teal-100 outline-none transition text-center text-2xl tracking-widest font-mono"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-70 text-white font-semibold py-3 px-4 rounded-xl transition"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={18} />
                    Подтвердить и войти
                  </>
                )}
              </button>

              {/* Back to phone */}
              <button
                type="button"
                onClick={() => { setStep('phone'); setCode(''); }}
                className="w-full flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-teal-600 transition py-2"
              >
                <ArrowLeft size={14} />
                Сменить номер телефона
              </button>
            </form>
          )}

          <p className="text-xs text-gray-400 text-center mt-6">
            {step === 'phone'
              ? 'Введите номер телефона, который указан в договоре с УК'
              : `Код отправлен на ${phone}`}
          </p>
        </div>
      </div>
    </div>
  );
}
