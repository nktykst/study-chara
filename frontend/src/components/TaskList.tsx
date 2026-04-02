'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Trash2, Sparkles } from 'lucide-react';
import type { Task } from '@/types';
import { formatDate } from '@/lib/utils';

interface Props {
  tasks: Task[];
  onComplete: (taskId: string) => Promise<string | null>;
  onUncomplete: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export default function TaskList({ tasks, onComplete, onUncomplete, onDelete }: Props) {
  const [cheerMessage, setCheerMessage] = useState<{ taskId: string; msg: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleToggle = async (task: Task) => {
    if (loadingId) return;
    setLoadingId(task.id);
    try {
      if (task.is_completed) {
        await onUncomplete(task.id);
        if (cheerMessage?.taskId === task.id) setCheerMessage(null);
      } else {
        const msg = await onComplete(task.id);
        if (msg) setCheerMessage({ taskId: task.id, msg });
      }
    } finally {
      setLoadingId(null);
    }
  };

  if (tasks.length === 0) {
    return (
      <p className="text-center text-gray-500 py-8 text-sm">
        タスクがありません。AIで生成するか、手動で追加してください。
      </p>
    );
  }

  const completed = tasks.filter((t) => t.is_completed).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          {completed} / {tasks.length} 完了
        </p>
        <div className="h-2 flex-1 mx-4 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-500 rounded-full transition-all"
            style={{ width: `${tasks.length ? (completed / tasks.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li key={task.id}>
            <div
              className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                task.is_completed
                  ? 'bg-gray-50 border-gray-100'
                  : 'bg-white border-gray-200 hover:border-primary-200'
              }`}
            >
              <button
                onClick={() => handleToggle(task)}
                disabled={loadingId === task.id}
                className="mt-0.5 flex-shrink-0 transition-colors"
              >
                {task.is_completed ? (
                  <CheckCircle2 className="w-5 h-5 text-primary-500" />
                ) : (
                  <Circle className="w-5 h-5 text-gray-300 hover:text-primary-400" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <p
                  className={`text-sm font-medium ${
                    task.is_completed ? 'line-through text-gray-400' : 'text-gray-800'
                  }`}
                >
                  {task.title}
                </p>
                {task.description && (
                  <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>
                )}
                {task.due_date && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    期日：{formatDate(task.due_date)}
                  </p>
                )}
              </div>

              <button
                onClick={() => onDelete(task.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {cheerMessage?.taskId === task.id && (
              <div className="mt-1 ml-8 flex items-start gap-1.5 bg-primary-50 rounded-lg p-2.5">
                <Sparkles className="w-4 h-4 text-primary-400 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-primary-700">{cheerMessage.msg}</p>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
