'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import TaskList from '@/components/TaskList';
import {
  getStudyPlan,
  generateTasks,
  createTask,
  completeTask,
  uncompleteTask,
  deleteTask,
  listCharacters,
} from '@/lib/api';
import type { StudyPlanDetail, Task, Character } from '@/types';
import { formatDate } from '@/lib/utils';
import {
  Calendar,
  MessageCircle,
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
    } catch {
      router.push('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [id]);

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
        <div className="text-center py-16 text-gray-400">読み込み中...</div>
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
            <Link
              href={`/plans/${plan.id}/chat`}
              className="btn-primary flex items-center gap-2 ml-4"
            >
              <MessageCircle className="w-4 h-4" />
              <span>会話</span>
            </Link>
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
            </details>
          )}
        </div>

        {/* Tasks */}
        <div className="card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-lg font-semibold text-gray-900">タスク一覧</h2>
            <div className="flex gap-2">
              <button
                onClick={handleGenerateTasks}
                disabled={generating || !plan.character_id}
                className="flex items-center gap-1.5 text-sm btn-secondary"
                title={!plan.character_id ? 'キャラクターが設定されていません' : ''}
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
            onComplete={handleComplete}
            onUncomplete={handleUncomplete}
            onDelete={handleDeleteTask}
          />
        </div>
      </main>
    </div>
  );
}
