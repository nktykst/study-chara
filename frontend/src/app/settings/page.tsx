'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import NavBar from '@/components/NavBar';
import { getApiKeyStatus, updateApiKey, deleteApiKey } from '@/lib/api';
import type { ApiKeyStatus } from '@/types';
import { KeyRound, CheckCircle2, Trash2 } from 'lucide-react';

const PROVIDERS = [
  { value: 'anthropic', label: 'Claude (Anthropic)', placeholder: 'sk-ant-api03-...' },
  { value: 'google', label: 'Gemini (Google)', placeholder: 'AIzaSy...' },
];

export default function SettingsPage() {
  const { getToken } = useAuth();
  const gt = () => getToken();

  const [status, setStatus] = useState<ApiKeyStatus | null>(null);
  const [provider, setProvider] = useState('anthropic');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = async () => {
    const s = await getApiKeyStatus(gt).catch(() => null);
    setStatus(s);
    if (s?.provider) setProvider(s.provider);
  };

  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) { setMessage({ type: 'error', text: 'APIキーを入力してください' }); return; }
    setSaving(true);
    setMessage(null);
    try {
      await updateApiKey(gt, provider, apiKey);
      setApiKey('');
      await load();
      setMessage({ type: 'success', text: 'APIキーを保存しました' });
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : '保存に失敗しました' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('APIキーを削除しますか？')) return;
    setDeleting(true);
    try {
      await deleteApiKey(gt);
      await load();
      setMessage({ type: 'success', text: 'APIキーを削除しました' });
    } catch {
      setMessage({ type: 'error', text: '削除に失敗しました' });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">設定</h1>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-5">
            <KeyRound className="w-5 h-5 text-primary-500" />
            <h2 className="text-lg font-semibold text-gray-900">AI APIキー設定</h2>
          </div>

          {/* Current status */}
          {status?.is_set && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-green-500" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    {PROVIDERS.find((p) => p.value === status.provider)?.label ?? status.provider}
                  </p>
                  <p className="text-xs text-green-600 font-mono">{status.masked_key}</p>
                </div>
              </div>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600 font-medium"
              >
                <Trash2 className="w-4 h-4" />
                削除
              </button>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="label">AIプロバイダー</label>
              <div className="grid grid-cols-2 gap-3">
                {PROVIDERS.map((p) => (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setProvider(p.value)}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      provider === p.value
                        ? 'border-primary-400 bg-primary-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{p.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label">
                APIキー
                <span className="text-gray-400 font-normal ml-1">（任意）</span>
                {status?.is_set && <span className="text-gray-400 font-normal">（更新する場合は新しいキーを入力）</span>}
              </label>
              <input
                type="password"
                className="input font-mono"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={PROVIDERS.find((p) => p.value === provider)?.placeholder}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                未設定の場合はサービスの共有枠（Gemini無料枠）で動作します。
                自分のキーを登録すると制限なく使えます。キーはサーバー側で暗号化保存されます。
              </p>
            </div>

            {message && (
              <div
                className={`text-sm rounded-lg p-3 ${
                  message.type === 'success'
                    ? 'bg-green-50 text-green-700'
                    : 'bg-red-50 text-red-600'
                }`}
              >
                {message.text}
              </div>
            )}

            <button type="submit" disabled={saving} className="w-full btn-primary">
              {saving ? '保存中...' : 'APIキーを保存'}
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-700 mb-2">APIキーの取得先</h3>
            <ul className="text-sm text-gray-500 space-y-1">
              <li>
                <strong>Anthropic (Claude)：</strong>
                console.anthropic.com でAPIキーを発行できます
              </li>
              <li>
                <strong>Google (Gemini)：</strong>
                aistudio.google.com でAPIキーを発行できます
              </li>
            </ul>
          </div>
        </div>
      </main>
    </div>
  );
}
