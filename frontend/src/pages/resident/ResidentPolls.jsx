import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart3, ArrowLeft, CheckCircle2, Clock,
  Loader2, Vote, Check,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

function getAuthHeaders() {
  const token = localStorage.getItem('resident_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function ResidentPolls() {
  const { t } = useTranslation();
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [votingId, setVotingId] = useState(null);
  const [selectedOption, setSelectedOption] = useState({});

  useEffect(() => {
    loadPolls();
  }, []);

  const loadPolls = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/resident/me/polls`, {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        localStorage.removeItem('resident_token');
        window.location.href = '/resident';
        return;
      }
      const data = await res.json();
      setPolls(data);
    } catch (err) {
      console.error('Failed to load polls:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (pollId) => {
    const optionIndex = selectedOption[pollId];
    if (optionIndex === undefined) return;

    setVotingId(pollId);
    try {
      const res = await fetch(`${API_URL}/resident/me/polls/${pollId}/vote`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          poll_id: pollId,
          resident_id: parseInt(localStorage.getItem('resident_id')),
          option_index: optionIndex,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Ошибка голосования');
      }
      loadPolls();
    } catch (err) {
      alert(err.message);
    } finally {
      setVotingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-teal-50 flex items-center justify-center">
        <Loader2 size={24} className="animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-teal-50">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-lg mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/resident/dashboard" className="text-gray-500 hover:text-teal-600 transition">
            <ArrowLeft size={20} />
          </a>
          <h1 className="font-bold text-teal-800 flex items-center gap-2">
            <BarChart3 size={20} className="text-teal-500" />
            {t('polls.title') || 'Опросы'}
          </h1>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        {polls.length === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center">
            <BarChart3 size={48} className="mx-auto mb-3 text-gray-300" />
            <p className="text-gray-400">{t('polls.noPolls') || 'Нет активных опросов'}</p>
          </div>
        ) : (
          polls.map((poll) => (
            <div key={poll.id} className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{poll.question}</h3>
                  {poll.ends_at && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock size={12} />
                      {t('polls.endsAt') || 'До'}: {new Date(poll.ends_at).toLocaleDateString('ru-RU')}
                    </p>
                  )}
                </div>
                {poll.voted && (
                  <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2.5 py-1 rounded-full">
                    <CheckCircle2 size={12} />
                    {t('polls.voted') || 'Голос учтён'}
                  </div>
                )}
              </div>

              {poll.voted ? (
                <div className="space-y-2">
                  {poll.options.map((opt, idx) => {
                    const totalVotes = poll.total_votes || 0;
                    const pct = totalVotes > 0 ? Math.round((poll.vote_counts?.[idx] || 0) / totalVotes * 100) : 0;
                    return (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="flex-1">
                          <div className="flex justify-between text-xs mb-0.5">
                            <span className="text-gray-600">{opt}</span>
                            <span className="text-gray-400">{pct}%</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-2">
                            <div
                              className="bg-teal-400 h-2 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="space-y-2">
                  {poll.options.map((opt, idx) => (
                    <label
                      key={idx}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                        selectedOption[poll.id] === idx
                          ? 'border-teal-400 bg-teal-50'
                          : 'border-gray-100 hover:border-teal-200 hover:bg-teal-50/50'
                      }`}
                    >
                      <input
                        type="radio"
                        name={`poll_${poll.id}`}
                        checked={selectedOption[poll.id] === idx}
                        onChange={() => setSelectedOption({ ...selectedOption, [poll.id]: idx })}
                        className="w-4 h-4 text-teal-500"
                      />
                      <span className="text-sm text-gray-700">{opt}</span>
                    </label>
                  ))}
                  <button
                    onClick={() => handleVote(poll.id)}
                    disabled={votingId === poll.id || selectedOption[poll.id] === undefined}
                    className="w-full flex items-center justify-center gap-2 bg-teal-500 hover:bg-teal-600 disabled:opacity-50 text-white font-medium py-2.5 px-4 rounded-xl transition text-sm mt-3"
                  >
                    {votingId === poll.id ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <><Vote size={16} /> {t('polls.vote') || 'Голосовать'}</>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
