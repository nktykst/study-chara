'use client';

import type { DashboardStatus } from '@/types';
import { Flame } from 'lucide-react';

interface Props {
  status: DashboardStatus;
  overallProgress?: number;
}

const MOOD_BG = {
  happy: 'bg-yellow-50 border-yellow-200',
  normal: 'bg-primary-50 border-primary-100',
  lonely: 'bg-blue-50 border-blue-200',
};

const MOOD_BUBBLE = {
  happy: 'bg-yellow-100 border-yellow-300',
  normal: 'bg-white border-primary-200',
  lonely: 'bg-blue-100 border-blue-300',
};

const AFFECTION_LABEL = (n: number) => {
  if (n >= 30) return '親密度：深い絆';
  if (n >= 10) return '親密度：友達';
  return '親密度：知り合い';
};

function getProgressComment(progress: number): string | null {
  if (progress >= 100) return '全部終わった！本当にすごい。';
  if (progress >= 50) return '半分以上来てる、いい感じ！';
  if (progress > 0) return 'ちょっとずつ進んでるね。';
  return null;
}

export default function CharacterWidget({ status, overallProgress }: Props) {
  const { character, affection, login_streak, mood, greeting } = status;
  const progressComment = overallProgress !== undefined ? getProgressComment(overallProgress) : null;
  const displayGreeting = progressComment ?? greeting;

  return (
    <div className={`card p-4 border ${MOOD_BG[mood]} transition-all`}>
      <div className="flex items-end gap-4">
        {/* アバター */}
        <div className="flex-shrink-0 relative">
          <div className="w-20 h-20 rounded-2xl overflow-hidden bg-white border-2 border-white shadow-md">
            {character?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={character.avatar_url}
                alt={character.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-4xl">
                🎭
              </div>
            )}
          </div>
          {/* 気分アイコン */}
          <div className="absolute -top-1 -right-1 text-lg">
            {mood === 'happy' ? '😊' : mood === 'lonely' ? '🥺' : '😊'}
          </div>
        </div>

        {/* 吹き出し＋ステータス */}
        <div className="flex-1 min-w-0">
          {character && (
            <p className="text-xs font-semibold text-gray-500 mb-1">{character.name}</p>
          )}

          {/* 吹き出し */}
          <div className={`relative border rounded-2xl rounded-bl-sm px-4 py-2.5 mb-3 ${MOOD_BUBBLE[mood]}`}>
            <p className="text-sm text-gray-800 leading-relaxed">{displayGreeting}</p>
          </div>

          {/* 好感度・連続ログイン */}
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              {login_streak}日連続
            </span>
            <span>·</span>
            <span>
              {AFFECTION_LABEL(affection)}
              <span className="text-gray-400 ml-1">({affection})</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
