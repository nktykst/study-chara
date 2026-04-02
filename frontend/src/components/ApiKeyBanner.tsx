'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';

export default function ApiKeyBanner() {
  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-center gap-3 text-sm">
      <Info className="w-4 h-4 text-blue-400 flex-shrink-0" />
      <span className="text-blue-800">
        現在は共有の無料枠でAIを利用中です。制限なく使いたい場合は
      </span>
      <Link href="/settings" className="font-medium text-blue-700 underline whitespace-nowrap">
        設定画面
      </Link>
      <span className="text-blue-800">で自分のAPIキーを登録してください。</span>
    </div>
  );
}
