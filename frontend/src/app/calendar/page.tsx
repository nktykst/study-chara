'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import { listStudyPlans, listTasks } from '@/lib/api';
import type { StudyPlan, Task } from '@/types';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

// プランごとの色（最大8プラン対応）
const PLAN_COLORS = [
  { bg: 'bg-primary-500', light: 'bg-primary-50', text: 'text-primary-700', border: 'border-primary-300' },
  { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-300' },
  { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-300' },
  { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-300' },
  { bg: 'bg-sky-500', light: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-300' },
  { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-300' },
  { bg: 'bg-pink-500', light: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-300' },
  { bg: 'bg-teal-500', light: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-300' },
];

interface TaskWithPlan extends Task {
  plan: StudyPlan;
  colorIndex: number;
}

export default function CalendarPage() {
  const { getToken } = useAuth();
  const gt = () => getToken();

  const [plans, setPlans] = useState<StudyPlan[]>([]);
  const [allTasks, setAllTasks] = useState<TaskWithPlan[]>([]);
  const [enabledPlanIds, setEnabledPlanIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const planList = await listStudyPlans(gt).catch(() => [] as StudyPlan[]);
      setPlans(planList);
      setEnabledPlanIds(new Set(planList.map((p) => p.id)));

      const tasksByPlan = await Promise.all(
        planList.map((plan, i) =>
          listTasks(gt, plan.id)
            .then((tasks) => tasks.map((t) => ({ ...t, plan, colorIndex: i % PLAN_COLORS.length })))
            .catch(() => [] as TaskWithPlan[])
        )
      );
      setAllTasks(tasksByPlan.flat());
      setLoading(false);
    };
    load();
  }, []);

  // 表示対象のタスク（フィルタ済み・期日あり）
  const visibleTasks = useMemo(
    () => allTasks.filter((t) => t.due_date && enabledPlanIds.has(t.plan.id)),
    [allTasks, enabledPlanIds]
  );

  // 日付 → タスク一覧のマップ
  const tasksByDate = useMemo(() => {
    const map = new Map<string, TaskWithPlan[]>();
    for (const task of visibleTasks) {
      if (!task.due_date) continue;
      const key = task.due_date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(task);
    }
    return map;
  }, [visibleTasks]);

  // カレンダーの日付グリッドを生成
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=日
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (string | null)[] = Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const mm = String(month + 1).padStart(2, '0');
      const dd = String(d).padStart(2, '0');
      days.push(`${year}-${mm}-${dd}`);
    }
    // 6週分になるよう末尾をnullで埋める
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentDate]);

  const todayStr = new Date().toISOString().slice(0, 10);

  const prevMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  const nextMonth = () =>
    setCurrentDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));

  const togglePlan = (planId: string) => {
    setEnabledPlanIds((prev) => {
      const next = new Set(prev);
      next.has(planId) ? next.delete(planId) : next.add(planId);
      return next;
    });
  };

  const selectedTasks = selectedDate ? (tasksByDate.get(selectedDate) ?? []) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* サイドバー：プランフィルター */}
          <aside className="lg:w-56 flex-shrink-0">
            <div className="card p-4">
              <h2 className="text-sm font-semibold text-gray-700 mb-3">表示する計画</h2>
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-gray-200 border-t-primary-400 rounded-full animate-spin" />
                  <p className="text-xs text-gray-400">読み込み中...</p>
                </div>
              ) : plans.length === 0 ? (
                <p className="text-xs text-gray-400">計画がありません</p>
              ) : (
                <ul className="space-y-2">
                  {plans.map((plan, i) => {
                    const color = PLAN_COLORS[i % PLAN_COLORS.length];
                    const enabled = enabledPlanIds.has(plan.id);
                    return (
                      <li key={plan.id}>
                        <button
                          onClick={() => togglePlan(plan.id)}
                          className={cn(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left text-sm transition-colors',
                            enabled ? `${color.light} ${color.text}` : 'text-gray-400 hover:bg-gray-50'
                          )}
                        >
                          <span className={cn('w-2.5 h-2.5 rounded-full flex-shrink-0', enabled ? color.bg : 'bg-gray-300')} />
                          <span className="truncate">{plan.title}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}

              {plans.length > 1 && (
                <div className="flex gap-1 mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={() => setEnabledPlanIds(new Set(plans.map((p) => p.id)))}
                    className="flex-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    全て表示
                  </button>
                  <span className="text-gray-200">|</span>
                  <button
                    onClick={() => setEnabledPlanIds(new Set())}
                    className="flex-1 text-xs text-gray-500 hover:text-gray-700"
                  >
                    全て非表示
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* カレンダー本体 */}
          <div className="flex-1 space-y-4">
            <div className="card p-4">
              {/* ヘッダー */}
              <div className="flex items-center justify-between mb-4">
                <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <h2 className="text-lg font-bold text-gray-900">
                  {currentDate.getFullYear()}年{currentDate.getMonth() + 1}月
                </h2>
                <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>

              {/* 曜日ヘッダー */}
              <div className="grid grid-cols-7 mb-1">
                {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
                  <div
                    key={d}
                    className={cn(
                      'text-center text-xs font-medium py-1',
                      i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400'
                    )}
                  >
                    {d}
                  </div>
                ))}
              </div>

              {/* 日付グリッド */}
              <div className="grid grid-cols-7 gap-px bg-gray-100 rounded-lg overflow-hidden">
                {calendarDays.map((dateStr, idx) => {
                  if (!dateStr) {
                    return <div key={`empty-${idx}`} className="bg-gray-50 min-h-[80px]" />;
                  }
                  const tasks = tasksByDate.get(dateStr) ?? [];
                  const isToday = dateStr === todayStr;
                  const isSelected = dateStr === selectedDate;
                  const isPast = dateStr < todayStr;
                  const day = parseInt(dateStr.slice(8));
                  const dayOfWeek = new Date(dateStr).getDay();

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                      className={cn(
                        'bg-white min-h-[80px] p-1 cursor-pointer hover:bg-gray-50 transition-colors',
                        isSelected && 'ring-2 ring-inset ring-primary-400',
                        isPast && !isToday && 'opacity-60'
                      )}
                    >
                      <div className="flex justify-center mb-1">
                        <span
                          className={cn(
                            'text-xs w-6 h-6 flex items-center justify-center rounded-full font-medium',
                            isToday ? 'bg-primary-500 text-white' :
                            dayOfWeek === 0 ? 'text-red-400' :
                            dayOfWeek === 6 ? 'text-blue-400' :
                            'text-gray-700'
                          )}
                        >
                          {day}
                        </span>
                      </div>
                      {/* タスクバッジ（最大3件表示） */}
                      <div className="space-y-0.5">
                        {tasks.slice(0, 3).map((task) => {
                          const color = PLAN_COLORS[task.colorIndex];
                          return (
                            <div
                              key={task.id}
                              className={cn(
                                'text-xs px-1 py-0.5 rounded truncate',
                                color.light,
                                color.text,
                                task.is_completed && 'opacity-50 line-through'
                              )}
                            >
                              {task.title}
                            </div>
                          );
                        })}
                        {tasks.length > 3 && (
                          <div className="text-xs text-gray-400 pl-1">+{tasks.length - 3}</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 選択した日のタスク詳細 */}
            {selectedDate && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">
                  {selectedDate.replace(/-/g, '/')} のタスク
                  {selectedDate < todayStr && (
                    <span className="ml-2 text-xs text-red-400 font-normal">（期日超過）</span>
                  )}
                </h3>
                {selectedTasks.length === 0 ? (
                  <p className="text-sm text-gray-400">タスクなし</p>
                ) : (
                  <ul className="space-y-2">
                    {selectedTasks.map((task) => {
                      const color = PLAN_COLORS[task.colorIndex];
                      return (
                        <li key={task.id} className={cn('flex items-start gap-3 p-2 rounded-lg', color.light)}>
                          <span className="mt-0.5 flex-shrink-0">
                            {task.is_completed
                              ? <CheckCircle2 className={cn('w-4 h-4', color.text)} />
                              : <Circle className={cn('w-4 h-4', color.text)} />
                            }
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium', color.text, task.is_completed && 'line-through opacity-60')}>
                              {task.title}
                            </p>
                            {task.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                            )}
                            <Link
                              href={`/plans/${task.plan.id}`}
                              className={cn('text-xs underline mt-0.5 inline-block', color.text)}
                            >
                              {task.plan.title}
                            </Link>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
