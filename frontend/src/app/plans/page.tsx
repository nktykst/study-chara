'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import NavBar from '@/components/NavBar';
import { createStudyPlan, listCharacters } from '@/lib/api';
import type { Character } from '@/types';
import { Sparkles } from 'lucide-react';

export default function NewPlanPage() {
  const router = useRouter();
  const { getToken } = useAuth();
  const gt = () => getToken();

  const [characters, setCharacters] = useState<Character[]>([]);
  const [form, setForm] = useState({
    title: '',
    goal: '',
    current_situation: '',
    character_id: '',
    start_date: '',
    end_date: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    listCharacters(gt).then(setCharacters).catch(() => {});
    const today = new Date().toISOString().slice(0, 10);
    const threeMonths = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    setForm((f) => ({ ...f, start_date: today, end_date: threeMonths }));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { setError('タイトルを入力してください'); return; }
    if (!form.goal.trim()) { setError('目標を入力してください'); return; }
    if (!form.start_date || !form.end_date) { setError('期間を入力してください'); return; }
    if (form.start_date > form.end_date) { setError('開始日は終了日より前にしてください'); return; }

    setSubmitting(true);
    setError('');
    try {
      const plan = await createStudyPlan(gt, {
        title: form.title,
        goal: form.goal,
        current_situation: form.current_situation || undefined,
        character_id: form.character_id || undefined,
        start_date: form.start_date,
        end_date: form.end_date,
      });
      router.push(`/plans/${plan.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : '作成に失敗しました');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">新しい学習計画</h1>

        {submitting && (
          <div className="card p-6 mb-6 flex items-center gap-3 text-primary-600 bg-primary-50 border-primary-100">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <p className="text-sm">
              キャラクターがAIで学習計画を生成中です。少々お待ちください...
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="card p-6 space-y-5">
          <div>
            <label className="label">計画タイトル *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="例：英語学習、プログラミング入門"
            />
          </div>

          <div>
            <label className="label">目標 *</label>
            <textarea
              className="input resize-none h-24"
              value={form.goal}
              onChange={(e) => setForm({ ...form, goal: e.target.value })}
              placeholder="例：3ヶ月でTOEIC800点を取得する。リスニングとリーディングをバランスよく学習する。"
            />
          </div>

          <div>
            <label className="label">
              現在の状況・レベル
              <span className="text-gray-400 font-normal ml-1">（任意・記入するとAIがより適切な計画を生成します）</span>
            </label>
            <textarea
              className="input resize-none h-20"
              value={form.current_situation}
              onChange={(e) => setForm({ ...form, current_situation: e.target.value })}
              placeholder="例：英語は中学レベル。単語力は弱め。毎日1時間勉強できる。"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">開始日 *</label>
              <input
                type="date"
                className="input"
                value={form.start_date}
                onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              />
            </div>
            <div>
              <label className="label">終了日 *</label>
              <input
                type="date"
                className="input"
                value={form.end_date}
                onChange={(e) => setForm({ ...form, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="label">キャラクター（任意）</label>
            <select
              className="input"
              value={form.character_id}
              onChange={(e) => setForm({ ...form, character_id: e.target.value })}
            >
              <option value="">キャラクターなし（AI生成なし）</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.tone ? `（${c.tone}）` : ''}
                </option>
              ))}
            </select>
            {characters.length === 0 && (
              <p className="text-xs text-gray-400 mt-1">
                キャラクターがいません。先に
                <a href="/characters" className="text-primary-500 underline mx-1">キャラクター管理</a>
                で作成してください。
              </p>
            )}
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button type="submit" disabled={submitting} className="w-full btn-primary py-3">
            {submitting ? '作成中...' : '計画を作成'}
            {form.character_id && !submitting && (
              <span className="ml-2 text-xs opacity-80">（AIが計画文を生成します）</span>
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
