'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';

export default function ApiKeyBanner() {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center gap-3 text-sm">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
      <span className="text-amber-800">
        AIキーが設定されていません。AI機能を使うには
      </span>
      <Link href="/settings" className="font-medium text-amber-700 underline">
        設定ページ
      </Link>
      <span className="text-amber-800">でAPIキーを登録してください。</span>
    </div>
  );
}
