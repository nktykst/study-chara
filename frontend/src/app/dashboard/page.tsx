'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import ApiKeyBanner from '@/components/ApiKeyBanner';
import { listStudyPlans, getApiKeyStatus, deleteStudyPlan } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { StudyPlan, ApiKeyStatus } from '@/types';
import { Plus, Calendar, Trash2, MessageCircle, BookOpen } from 'lucide-react';

export default function DashboardPage() {
  const { getToken } = useAuth();
  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const gt = () => getToken();
    const [plansData, keyStatus] = await Promise.all([
      listStudyPlans(gt).catch(() => [] as StudyPlan[]),
      getApiKeyStatus(gt).catch(() => null),
    ]);
    setPlans(plansData);
    setApiKeyStatus(keyStatus);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    await deleteStudyPlan(() => getToken(), id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        {apiKeyStatus && !apiKeyStatus.is_set && (
          <div className="mb-6">
            <ApiKeyBanner />
          </div>
        )}

        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">学習計画</h1>
          <Link href="/plans" className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>新しい計画</span>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">読み込み中...</div>
        ) : plans.length === 0 ? (
          <div className="card p-12 text-center">
            <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-4">まだ学習計画がありません</p>
            <Link href="/plans" className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              最初の計画を作る
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map((plan) => (
              <div key={plan.id} className="card p-5 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <h2 className="font-semibold text-gray-900 text-lg leading-tight">
                    {plan.title}
                  </h2>
                  <button
                    onClick={() => handleDelete(plan.id, plan.title)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-sm text-gray-600 mb-3 line-clamp-2">{plan.goal}</p>

                <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-4">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatDate(plan.start_date)} 〜 {formatDate(plan.end_date)}</span>
                </div>

                <div className="flex gap-2">
                  <Link
                    href={`/plans/${plan.id}`}
                    className="flex-1 text-center btn-secondary text-sm py-1.5"
                  >
                    詳細・タスク
                  </Link>
                  <Link
                    href={`/plans/${plan.id}/chat`}
                    className="flex items-center gap-1 btn-primary text-sm py-1.5 px-3"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>会話</span>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
