'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { listTodayTasks, listUpcomingTasks, listCompletedTasks, completeTask, getDashboardStatus } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';
import type { TodayTask, DashboardStatus } from '@/types';
import { formatDate } from '@/lib/utils';
import { CheckCircle2, Circle, AlertCircle, Calendar, ChevronRight, Trophy } from 'lucide-react';

type CompletedTask = {
  id: string;
  title: string;
  study_plan_title: string;
  due_date: string | null;
  completed_at: string;
  cheer_message: string | null;
};

export default function TasksPage() {
  const { getToken } = useAuth();
  const gt = () => getToken();

  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<TodayTask[]>([]);
  const [completedTasks, setCompletedTasks] = useState<CompletedTask[]>([]);
  const [dashStatus, setDashStatus] = useState<DashboardStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [popup, setPopup] = useState<{ msg: string } | null>(null);
  const [showCompleted, setShowCompleted] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const [today, upcoming, completed, dash] = await Promise.all([
          listTodayTasks(gt).catch(() => [] as TodayTask[]),
          listUpcomingTasks(gt).catch(() => [] as TodayTask[]),
          listCompletedTasks(gt).catch(() => [] as CompletedTask[]),
          getDashboardStatus(gt).catch(() => null),
        ]);
        setTodayTasks(today);
        setUpcomingTasks(upcoming);
        setCompletedTasks(completed);
        setDashStatus(dash);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleComplete = async (task: TodayTask) => {
    if (completingId) return;
    setCompletingId(task.id);
    try {
      const res = await completeTask(gt, task.id);
      setTodayTasks((prev) => prev.filter((t) => t.id !== task.id));
      setUpcomingTasks((prev) => prev.filter((t) => t.id !== task.id));

      const newCompleted: CompletedTask = {
        id: task.id,
        title: task.title,
        study_plan_title: task.study_plan_title,
        due_date: task.due_date,
        completed_at: new Date().toISOString(),
        cheer_message: res.cheer_message,
      };
      setCompletedTasks((prev) => [newCompleted, ...prev]);

      if (res.cheer_message) {
        setPopup({ msg: res.cheer_message });
        setTimeout(() => setPopup(null), 6000);
      }
    } finally {
      setCompletingId(null);
    }
  };

  const overdue = todayTasks.filter((t) => t.is_overdue);
  const dueToday = todayTasks.filter((t) => !t.is_overdue);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <NavBar />

      {/* キャラポップアップ */}
      {popup && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 cursor-pointer w-full max-w-sm px-4"
          onClick={() => setPopup(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-primary-100 px-5 py-4 flex items-end gap-4">
            <div className="w-14 h-14 rounded-2xl overflow-hidden flex-shrink-0 bg-primary-50 flex items-center justify-center">
              {dashStatus?.character?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dashStatus.character.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-200 rounded-2xl" />
              )}
            </div>
            <div className="flex-1">
              {dashStatus?.character && (
                <p className="text-xs font-semibold text-primary-400 mb-1">{dashStatus.character.name}</p>
              )}
              <p className="text-sm text-gray-800">{popup.msg}</p>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-8">
        <h1 className="text-2xl font-bold text-gray-900">タスク</h1>

        {loading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* 今日のタスク */}
            <section>
              <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-primary-500" />
                今日やること
              </h2>

              {todayTasks.length === 0 ? (
                <div className="card p-6 text-center text-gray-400 text-sm">
                  今日のタスクはありません
                </div>
              ) : (
                <div className="space-y-2">
                  {overdue.length > 0 && (
                    <div className="card p-4">
                      <p className="text-xs font-semibold text-red-500 flex items-center gap-1 mb-3">
                        <AlertCircle className="w-3.5 h-3.5" />
                        期日超過
                      </p>
                      <ul className="space-y-2">
                        {overdue.map((task) => (
                          <TaskRow key={task.id} task={task} onComplete={handleComplete} loading={completingId === task.id} />
                        ))}
                      </ul>
                    </div>
                  )}
                  {dueToday.length > 0 && (
                    <div className="card p-4">
                      <p className="text-xs font-semibold text-primary-500 mb-3">今日が期日</p>
                      <ul className="space-y-2">
                        {dueToday.map((task) => (
                          <TaskRow key={task.id} task={task} onComplete={handleComplete} loading={completingId === task.id} />
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </section>

            {/* 今後のタスク */}
            {upcomingTasks.length > 0 && (
              <section>
                <h2 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  今後のタスク
                </h2>
                <div className="card p-4">
                  <ul className="space-y-2">
                    {upcomingTasks.map((task) => (
                      <TaskRow key={task.id} task={task} onComplete={handleComplete} loading={completingId === task.id} />
                    ))}
                  </ul>
                </div>
              </section>
            )}

            {/* 達成済みタスク */}
            {completedTasks.length > 0 && (
              <section>
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="w-full flex items-center justify-between text-base font-bold text-gray-800 mb-3"
                >
                  <span className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    達成済み（{completedTasks.length}件）
                  </span>
                  <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${showCompleted ? 'rotate-90' : ''}`} />
                </button>

                {showCompleted && (
                  <div className="card p-4 space-y-3">
                    {completedTasks.map((task) => (
                      <div key={task.id} className="flex items-start gap-3">
                        <CheckCircle2 className="w-5 h-5 text-primary-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-500 line-through">{task.title}</p>
                          <p className="text-xs text-gray-400">{task.study_plan_title}</p>
                          {task.cheer_message && (
                            <p className="text-xs text-primary-500 mt-1 italic">「{task.cheer_message}」</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
  loading,
}: {
  task: TodayTask;
  onComplete: (task: TodayTask) => void;
  loading: boolean;
}) {
  const [done, setDone] = useState(false);

  const handle = async () => {
    if (done || loading) return;
    setDone(true);
    await onComplete(task);
  };

  return (
    <li className={`flex items-start gap-3 p-2 rounded-lg transition-all ${done ? 'opacity-30' : ''}`}>
      <button
        onClick={handle}
        disabled={loading || done}
        className="mt-0.5 flex-shrink-0 transition-colors"
      >
        {done ? (
          <CheckCircle2 className="w-5 h-5 text-primary-500" />
        ) : (
          <Circle className="w-5 h-5 text-gray-300 hover:text-primary-400" />
        )}
      </button>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${done ? 'line-through text-gray-400' : 'text-gray-800'}`}>
          {task.title}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-gray-400">{task.study_plan_title}</span>
          {task.due_date && (
            <span className={`text-xs ${task.is_overdue ? 'text-red-400' : 'text-gray-400'}`}>
              · {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
      <Link href={`/plans/${task.study_plan_id}`} className="text-xs text-gray-300 hover:text-primary-400 flex-shrink-0 mt-1">
        <ChevronRight className="w-4 h-4" />
      </Link>
    </li>
  );
}
