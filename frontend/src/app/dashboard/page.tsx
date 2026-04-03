'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import ApiKeyBanner from '@/components/ApiKeyBanner';
import ProgressRing from '@/components/ProgressRing';
import { listStudyPlans, getApiKeyStatus, deleteStudyPlan, listTodayTasks, completeTask, getDashboardStatus } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import type { StudyPlan, ApiKeyStatus, TodayTask, DashboardStatus } from '@/types';
import CharacterWidget from '@/components/CharacterWidget';
import { Plus, Calendar, Trash2, BookOpen, AlertCircle, Circle } from 'lucide-react';

export default function DashboardPage() {
  const { getToken } = useAuth();
  const gt = () => getToken();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [apiKeyStatus, setApiKeyStatus] = useState<ApiKeyStatus | null>(null);
  const [dashboardStatus, setDashboardStatus] = useState<DashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [todayGoal, setTodayGoal] = useState('');
  const [savedGoal, setSavedGoal] = useState<string | null>(null);
  const [goalReply, setGoalReply] = useState<string | null>(null);

  const load = async () => {
    try {
      const [plansData, keyStatus, todayData, dashStatus] = await Promise.all([
        listStudyPlans(gt).catch(() => [] as StudyPlan[]),
        getApiKeyStatus(gt).catch(() => null),
        listTodayTasks(gt).catch(() => [] as TodayTask[]),
        getDashboardStatus(gt).catch(() => null),
      ]);
      setPlans(plansData);
      setApiKeyStatus(keyStatus);
      setTodayTasks(todayData);
      setDashboardStatus(dashStatus);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  useEffect(() => {
    const today = new Date().toDateString();
    const saved = localStorage.getItem('todayGoal');
    const savedDate = localStorage.getItem('todayGoalDate');
    if (saved && savedDate === today) setSavedGoal(saved);
  }, []);

  // 達成率を全プランで計算
  const totalCompleted = plans.reduce((s, p) => s + p.completed_count, 0);
  const totalTasks = plans.reduce((s, p) => s + p.task_count, 0);
  const overallProgress = totalTasks > 0 ? (totalCompleted / totalTasks) * 100 : 0;

  const handleSaveGoal = () => {
    if (!todayGoal.trim()) return;
    const today = new Date().toDateString();
    localStorage.setItem('todayGoal', todayGoal);
    localStorage.setItem('todayGoalDate', today);
    setSavedGoal(todayGoal);

    // キャラの返答（固定候補からランダム）
    const replies = [
      `「${todayGoal}」了解！一緒に頑張ろ。`,
      `待ってた！「${todayGoal}」ね、応援してる。`,
      `${todayGoal}、いいね。絶対できるよ。`,
      `よし、「${todayGoal}」終わったら教えて！`,
    ];
    setGoalReply(replies[Math.floor(Math.random() * replies.length)]);
    setTodayGoal('');
  };

  const handleComplete = async (taskId: string) => {
    if (togglingId) return;
    setTogglingId(taskId);
    try {
      await completeTask(gt, taskId);
      setTodayTasks((prev) => prev.filter((t) => t.id !== taskId));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`「${title}」を削除しますか？`)) return;
    await deleteStudyPlan(gt, id);
    setPlans((prev) => prev.filter((p) => p.id !== id));
  };

  const overdue = todayTasks.filter((t) => t.is_overdue);
  const dueToday = todayTasks.filter((t) => !t.is_overdue);

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {apiKeyStatus && !apiKeyStatus.is_set && (
          <ApiKeyBanner />
        )}

        {/* キャラクターウィジェット */}
        {!loading && dashboardStatus && (
          <CharacterWidget status={dashboardStatus} overallProgress={overallProgress} />
        )}

        {/* 今日の目標宣言 */}
        {!loading && dashboardStatus?.character && (
          <section className="card p-4">
            <p className="text-xs font-semibold text-gray-500 mb-3">📣 今日の目標を宣言する</p>
            {savedGoal ? (
              <div>
                <div className="bg-primary-50 rounded-xl px-4 py-2.5 text-sm text-primary-800 mb-2">
                  「{savedGoal}」
                </div>
                {goalReply && (
                  <div className="flex items-end gap-2 mt-2">
                    {dashboardStatus.character?.avatar_url && (
                      <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={dashboardStatus.character.avatar_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-800">
                      {goalReply}
                    </div>
                  </div>
                )}
                <button
                  onClick={() => { setSavedGoal(null); setGoalReply(null); localStorage.removeItem('todayGoal'); }}
                  className="text-xs text-gray-400 hover:text-gray-600 mt-2"
                >
                  変更する
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                <input
                  className="flex-1 input text-sm"
                  value={todayGoal}
                  onChange={(e) => setTodayGoal(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveGoal()}
                  placeholder="今日やること一言で..."
                />
                <button onClick={handleSaveGoal} disabled={!todayGoal.trim()} className="btn-primary text-sm px-4">
                  宣言！
                </button>
              </div>
            )}
          </section>
        )}

        {/* 週次レポート（土日のみ） */}
        {!loading && dashboardStatus?.weekly_report && (
          <div className="card p-4 border border-blue-100 bg-blue-50">
            <div className="flex items-end gap-3">
              {dashboardStatus.character?.avatar_url && (
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={dashboardStatus.character.avatar_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div>
                <p className="text-xs text-blue-400 font-semibold mb-1">📊 今週のまとめ</p>
                <p className="text-sm text-gray-800">{dashboardStatus.weekly_report}</p>
              </div>
            </div>
          </div>
        )}

        {/* 称号 */}
        {!loading && dashboardStatus?.titles && dashboardStatus.titles.length > 0 && (
          <section>
            <p className="text-xs font-semibold text-gray-500 mb-2">🏆 獲得した称号</p>
            <div className="flex flex-wrap gap-2">
              {dashboardStatus.titles.map((t) => (
                <span key={t.id} className="inline-flex items-center gap-1 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-medium px-3 py-1.5 rounded-full">
                  {t.emoji} {t.label}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* 今日のタスク */}
        {!loading && todayTasks.length > 0 && (
          <section>
            <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary-500" />
              今日やること
            </h2>
            <div className="space-y-2">
              {overdue.length > 0 && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mb-2">
                    <AlertCircle className="w-3.5 h-3.5" />
                    期日超過
                  </p>
                  <ul className="space-y-1.5">
                    {overdue.map((task) => (
                      <TodayTaskRow key={task.id} task={task} onComplete={handleComplete} loading={togglingId === task.id} />
                    ))}
                  </ul>
                </div>
              )}
              {dueToday.length > 0 && (
                <div className="card p-4">
                  <p className="text-xs font-semibold text-primary-500 mb-2">今日が期日</p>
                  <ul className="space-y-1.5">
                    {dueToday.map((task) => (
                      <TodayTaskRow key={task.id} task={task} onComplete={handleComplete} loading={togglingId === task.id} />
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 学習計画一覧 */}
        <section>
          <div className="flex items-center justify-between mb-4">
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
                      <h2 className="font-semibold text-gray-900 text-lg leading-tight flex-1 mr-2">{plan.title}</h2>
                      <button
                        onClick={() => handleDelete(plan.id, plan.title)}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 mb-3">
                      <ProgressRing completed={plan.completed_count} total={plan.task_count} size={72} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-600 mb-2 line-clamp-2">{plan.goal}</p>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="w-3.5 h-3.5" />
                          <span>{formatDate(plan.start_date)} 〜 {formatDate(plan.end_date)}</span>
                        </div>
                      </div>
                    </div>

                    {plan.task_count > 0 && (
                      <div className="mb-4">
                        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-500 rounded-full transition-all duration-500"
                            style={{ width: `${(plan.completed_count / plan.task_count) * 100}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Link href={`/plans/${plan.id}`} className="flex-1 text-center btn-secondary text-sm py-1.5">
                        詳細・タスク
                      </Link>
                    </div>
                  </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function TodayTaskRow({
  task,
  onComplete,
  loading,
}: {
  task: TodayTask;
  onComplete: (id: string) => void;
  loading: boolean;
}) {
  return (
    <li className="flex items-center gap-3">
      <button
        onClick={() => onComplete(task.id)}
        disabled={loading}
        className="flex-shrink-0 text-gray-300 hover:text-primary-400 transition-colors"
      >
        <Circle className="w-4 h-4" />
      </button>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-800 truncate">{task.title}</p>
        <p className="text-xs text-gray-400 truncate">{task.study_plan_title}</p>
      </div>
      <Link
        href={`/plans/${task.study_plan_id}`}
        className="text-xs text-primary-500 hover:underline flex-shrink-0"
      >
        詳細
      </Link>
    </li>
  );
}
