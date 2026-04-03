'use client';

import { useState, useEffect, useRef } from 'react';
import type { Character } from '@/types';
import { Play, Pause, RotateCcw, Timer } from 'lucide-react';

interface Props {
  character?: Character | null;
}

const WORK_MIN = 25;
const BREAK_MIN = 5;

const WORK_START = [
  '集中タイム、頑張って！',
  'やるじゃん、始めたね！',
  '一緒に頑張ろ。',
  'その調子！',
];
const WORK_END = [
  'お疲れ様！25分集中できたね。',
  'よく頑張った、少し休んで。',
  'えらい！休憩タイムだよ。',
];
const BREAK_END = [
  'さあ、次いこ！',
  '休憩終わり、もう一回！',
  '準備いい？始めよう！',
];

function pick(arr: string[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function PomodoroTimer({ character }: Props) {
  const [mode, setMode] = useState<'work' | 'break'>('work');
  const [seconds, setSeconds] = useState(WORK_MIN * 60);
  const [running, setRunning] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const total = mode === 'work' ? WORK_MIN * 60 : BREAK_MIN * 60;
  const progress = ((total - seconds) / total) * 100;
  const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
  const secs = String(seconds % 60).padStart(2, '0');

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setSeconds((s) => {
          if (s <= 1) {
            clearInterval(intervalRef.current!);
            setRunning(false);
            if (mode === 'work') {
              setMessage(pick(WORK_END));
              setMode('break');
              setSeconds(BREAK_MIN * 60);
            } else {
              setMessage(pick(BREAK_END));
              setMode('work');
              setSeconds(WORK_MIN * 60);
            }
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }
    return () => clearInterval(intervalRef.current!);
  }, [running, mode]);

  const handleStart = () => {
    if (!running && seconds === (mode === 'work' ? WORK_MIN * 60 : BREAK_MIN * 60)) {
      setMessage(pick(WORK_START));
    }
    setRunning(true);
  };

  const handleReset = () => {
    clearInterval(intervalRef.current!);
    setRunning(false);
    setMode('work');
    setSeconds(WORK_MIN * 60);
    setMessage(null);
  };

  if (!show) {
    return (
      <button
        onClick={() => setShow(true)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary-500 transition-colors"
      >
        <Timer className="w-4 h-4" />
        ポモドーロ
      </button>
    );
  }

  return (
    <div className="card p-4 mb-4 border border-primary-100 bg-primary-50">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold text-primary-600">
          {mode === 'work' ? '🍅 集中タイム' : '☕ 休憩タイム'}
        </span>
        <button onClick={() => setShow(false)} className="text-xs text-gray-400 hover:text-gray-600">閉じる</button>
      </div>

      {/* メッセージ */}
      {message && (
        <div className="flex items-end gap-3 mb-3">
          {character?.avatar_url && (
            <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div className="bg-white border border-primary-200 rounded-2xl rounded-bl-sm px-3 py-2 text-sm text-gray-800">
            {message}
          </div>
        </div>
      )}

      {/* タイマー */}
      <div className="flex items-center gap-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
            <circle cx="32" cy="32" r="28" fill="none" stroke="#e5e7eb" strokeWidth="4" />
            <circle
              cx="32" cy="32" r="28" fill="none"
              stroke={mode === 'work' ? '#8b5cf6' : '#10b981'}
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 28}`}
              strokeDashoffset={`${2 * Math.PI * 28 * (1 - progress / 100)}`}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-gray-800">
            {mins}:{secs}
          </span>
        </div>

        <div className="flex gap-2">
          {running ? (
            <button onClick={() => setRunning(false)} className="btn-secondary p-2">
              <Pause className="w-4 h-4" />
            </button>
          ) : (
            <button onClick={handleStart} className="btn-primary p-2">
              <Play className="w-4 h-4" />
            </button>
          )}
          <button onClick={handleReset} className="btn-secondary p-2">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
