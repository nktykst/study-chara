'use client';

import { useState } from 'react';
import { CheckCircle2, Circle, Trash2, Play } from 'lucide-react';
import type { Task, Character } from '@/types';
import { formatDate } from '@/lib/utils';

const START_MESSAGES = [
  'いってらっしゃい！',
  '頑張って！応援してる。',
  'やるじゃん、始めたね。',
  '待ってるよ！',
];

interface Props {
  tasks: Task[];
  character?: Character | null;
  onComplete: (taskId: string) => Promise<string | null>;
  onUncomplete: (taskId: string) => Promise<void>;
  onDelete: (taskId: string) => Promise<void>;
}

export default function TaskList({ tasks, character, onComplete, onUncomplete, onDelete }: Props) {
  const [popup, setPopup] = useState<{ msg: string } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  const handleStart = (task: Task) => {
    setStartingId(task.id);
    const msg = START_MESSAGES[Math.floor(Math.random() * START_MESSAGES.length)];
    setPopup({ msg });
    setTimeout(() => setPopup(null), 4000);
  };

  const handleToggle = async (task: Task) => {
    if (loadingId) return;
    setLoadingId(task.id);
    try {
      if (task.is_completed) {
        await onUncomplete(task.id);
      } else {
        const msg = await onComplete(task.id);
        if (msg) {
          setPopup({ msg });
          setTimeout(() => setPopup(null), 5000);
        }
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
      {/* タスク完了ポップアップ */}
      {popup && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-bounce-in"
          onClick={() => setPopup(null)}
        >
          <div className="bg-white rounded-2xl shadow-xl border border-primary-100 px-5 py-4 flex items-end gap-4 max-w-sm cursor-pointer">
            <div className="w-16 h-16 rounded-2xl overflow-hidden flex-shrink-0 bg-primary-50 flex items-center justify-center">
              {character?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary-200 rounded-2xl" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {character && (
                <p className="text-xs font-semibold text-primary-400 mb-1">{character.name}</p>
              )}
              <p className="text-sm text-gray-800 leading-relaxed">{popup.msg}</p>
            </div>
          </div>
        </div>
      )}

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

              {!task.is_completed && startingId !== task.id && (
                <button
                  onClick={() => handleStart(task)}
                  className="p-1 rounded hover:bg-primary-50 text-gray-300 hover:text-primary-400 transition-colors"
                  title="開始する"
                >
                  <Play className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => onDelete(task.id)}
                className="p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
