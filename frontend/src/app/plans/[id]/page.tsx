'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import TaskList from '@/components/TaskList';
import ProgressRing from '@/components/ProgressRing';
import PomodoroTimer from '@/components/PomodoroTimer';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  getStudyPlan,
  generateTasks,
  createTask,
  completeTask,
  uncompleteTask,
  deleteTask,
  listCharacters,
  regenerateAiPlan,
  checkDelay,
  rescheduleTasks,
} from '@/lib/api';
import type { StudyPlanDetail, Task, Character } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  Sparkles,
  Plus,
  ChevronLeft,
  User,
  X,
} from 'lucide-react';

export default function PlanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const gt = () => getToken();

  const [plan, setPlan] = useState<StudyPlanDetail | null>(null);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [delayWarning, setDelayWarning] = useState<string | null>(null);
  const [rescheduling, setRescheduling] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDate, setNewTaskDate] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const data = await getStudyPlan(gt, id);
      setPlan(data);

      if (data.character_id) {
        const chars = await listCharacters(gt);
        const found = chars.find((c) => c.id === data.character_id);
        if (found) setCharacter(found);
      }

      const delay = await checkDelay(gt, id).catch(() => null);
      if (delay?.is_delayed && delay.warning) {
        setDelayWarning(delay.warning);
      }
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

  const handleReschedule = async () => {
    setRescheduling(true);
    try {
      const tasks = await rescheduleTasks(gt, id);
      setPlan((prev) => prev ? { ...prev, tasks } : prev);
      setDelayWarning(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '再スケジュールに失敗しました');
    } finally {
      setRescheduling(false);
    }
  };

  const handleRegeneratePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedback.trim()) return;
    setRegenerating(true);
    setError('');
    try {
      const updated = await regenerateAiPlan(gt, id, feedback);
      setPlan((prev) => prev ? { ...prev, ai_plan: updated.ai_plan } : prev);
      setFeedback('');
      setShowFeedback(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '再生成に失敗しました');
    } finally {
      setRegenerating(false);
    }
  };

  const handleGenerateTasks = async () => {
    if (!confirm('AIがタスクを自動生成します。既存のタスクはそのままです。続けますか？')) return;
    setGenerating(true);
    setError('');
    try {
      const tasks = await generateTasks(gt, id);
      setPlan((prev) => prev ? { ...prev, tasks: [...prev.tasks, ...tasks] } : prev);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスク生成に失敗しました');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    try {
      const task = await createTask(gt, id, {
        title: newTaskTitle,
        due_date: newTaskDate || undefined,
        order_index: plan?.tasks.length ?? 0,
      });
      setPlan((prev) => prev ? { ...prev, tasks: [...prev.tasks, task] } : prev);
      setNewTaskTitle('');
      setNewTaskDate('');
      setShowAddTask(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'タスク追加に失敗しました');
    } finally {
      setAddingTask(false);
    }
  };

  const handleComplete = async (taskId: string): Promise<string | null> => {
    const res = await completeTask(gt, taskId);
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, is_completed: true, cheer_message: res.cheer_message } : t
        ),
      };
    });
    return res.cheer_message;
  };

  const handleUncomplete = async (taskId: string): Promise<void> => {
    await uncompleteTask(gt, taskId);
    setPlan((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        tasks: prev.tasks.map((t) =>
          t.id === taskId ? { ...t, is_completed: false } : t
        ),
      };
    });
  };

  const handleDeleteTask = async (taskId: string): Promise<void> => {
    await deleteTask(gt, taskId);
    setPlan((prev) =>
      prev ? { ...prev, tasks: prev.tasks.filter((t) => t.id !== taskId) } : prev
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <LoadingSpinner />
      </div>
    );
  }

  if (!plan) return null;

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Back */}
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6"
        >
          <ChevronLeft className="w-4 h-4" />
          ダッシュボードに戻る
        </Link>

        {/* Plan Header */}
        <div className="card p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <h1 className="text-2xl font-bold text-gray-900">{plan.title}</h1>
          </div>

          {character && (
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 bg-primary-100 rounded-full flex items-center justify-center">
                <User className="w-3 h-3 text-primary-500" />
              </div>
              <span className="text-sm text-gray-600">
                キャラクター：<strong>{character.name}</strong>
              </span>
            </div>
          )}

          <p className="text-gray-700 mb-3">{plan.goal}</p>

          {plan.current_situation && (
            <p className="text-sm text-gray-500 bg-gray-50 rounded-lg px-3 py-2 mb-3">
              <span className="font-medium text-gray-600">現在の状況：</span>
              {plan.current_situation}
            </p>
          )}

          <div className="flex items-center gap-1.5 text-sm text-gray-400">
            <Calendar className="w-4 h-4" />
            <span>{formatDate(plan.start_date)} 〜 {formatDate(plan.end_date)}</span>
          </div>

          {plan.ai_plan && (
            <details className="mt-4">
              <summary className="text-sm font-medium text-primary-600 cursor-pointer flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                AIが生成した学習計画を見る
              </summary>
              <div className="mt-3 p-4 bg-primary-50 rounded-lg border border-primary-100 text-sm text-gray-700 whitespace-pre-wrap">
                {plan.ai_plan}
              </div>
              {!showFeedback ? (
                <button
                  onClick={() => setShowFeedback(true)}
                  className="mt-2 text-xs text-primary-500 hover:text-primary-700 underline"
                >
                  この計画にフィードバックして改善する
                </button>
              ) : (
                <form onSubmit={handleRegeneratePlan} className="mt-3 space-y-2">
                  <textarea
                    className="input resize-none h-20 text-sm"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="例：もう少し基礎から始めたい、週末は休みにしてほしい..."
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setShowFeedback(false); setFeedback(''); }}
                      className="flex-1 btn-secondary text-sm py-1.5"
                    >
                      キャンセル
                    </button>
                    <button
                      type="submit"
                      disabled={!feedback.trim() || regenerating}
                      className="flex-1 btn-primary text-sm py-1.5"
                    >
                      {regenerating ? '再生成中...' : '改善する'}
                    </button>
                  </div>
                </form>
              )}
            </details>
          )}
        </div>

        {/* 遅延警告 */}
        {delayWarning && (
          <div className="card p-4 border border-orange-200 bg-orange-50 mb-6">
            <div className="flex items-start gap-3">
              {character?.avatar_url && (
                <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1">
                {character && <p className="text-xs font-semibold text-orange-400 mb-1">{character.name}</p>}
                <p className="text-sm text-gray-800 mb-3">{delayWarning}</p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReschedule}
                    disabled={rescheduling}
                    className="btn-primary text-sm py-1.5 px-4"
                  >
                    {rescheduling ? '再調整中...' : '再スケジュールする'}
                  </button>
                  <button
                    onClick={() => setDelayWarning(null)}
                    className="btn-secondary text-sm py-1.5 px-4"
                  >
                    このままにする
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tasks */}
        <div className="card p-6">
          {/* 進捗サマリー */}
          {plan.tasks.length > 0 && (
            <div className="flex items-center gap-6 mb-6 p-4 bg-gray-50 rounded-xl">
              <ProgressRing
                completed={plan.tasks.filter((t) => t.is_completed).length}
                total={plan.tasks.length}
                size={88}
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 mb-2">進捗状況</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>完了</span>
                    <span>{plan.tasks.filter((t) => t.is_completed).length} タスク</span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary-500 rounded-full transition-all duration-500"
                      style={{
                        width: `${plan.tasks.length ? (plan.tasks.filter((t) => t.is_completed).length / plan.tasks.length) * 100 : 0}%`,
                      }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>残り</span>
                    <span>{plan.tasks.filter((t) => !t.is_completed).length} タスク</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <PomodoroTimer character={character} />

          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">タスク一覧</h2>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateTasks}
                disabled={generating}
                className="flex items-center gap-1.5 text-sm btn-secondary"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {generating ? 'AI生成中...' : 'AIで生成'}
              </button>
              <button
                onClick={() => setShowAddTask(true)}
                className="flex items-center gap-1.5 text-sm btn-primary"
              >
                <Plus className="w-3.5 h-3.5" />
                手動追加
              </button>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg p-3 mb-4">
              {error}
            </div>
          )}

          {showAddTask && (
            <form onSubmit={handleAddTask} className="bg-gray-50 rounded-lg p-4 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">タスクを追加</span>
                <button type="button" onClick={() => setShowAddTask(false)}>
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <input
                className="input"
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                placeholder="タスク名"
                autoFocus
              />
              <input
                type="date"
                className="input"
                value={newTaskDate}
                onChange={(e) => setNewTaskDate(e.target.value)}
              />
              <button type="submit" disabled={addingTask} className="w-full btn-primary text-sm py-2">
                {addingTask ? '追加中...' : '追加'}
              </button>
            </form>
          )}

          <TaskList
            tasks={plan.tasks}
            character={character}
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            onDelete={handleDeleteTask}
          />
        </div>
      </main>
    </div>
  );
}
