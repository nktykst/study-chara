'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import NavBar from '@/components/NavBar';
import CharacterCard from '@/components/CharacterCard';
import { listCharacters, createCharacter, updateCharacter, deleteCharacter } from '@/lib/api';
import type { Character, CharacterCreate } from '@/types';
import { Plus, X } from 'lucide-react';

interface FormState {
  name: string;
  persona: string;
  tone: string;
  catchphrase: string;
}

const defaultForm: FormState = { name: '', persona: '', tone: '', catchphrase: '' };

export default function CharactersPage() {
  const { getToken } = useAuth();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<Character | null>(null);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const gt = () => getToken();

  const load = async () => {
    const data = await listCharacters(gt).catch(() => [] as Character[]);
    setCharacters(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditTarget(null);
    setForm(defaultForm);
    setError('');
    setShowForm(true);
  };

  const openEdit = (c: Character) => {
    setEditTarget(c);
    setForm({
      name: c.name,
      persona: c.persona ?? '',
      tone: c.tone ?? '',
      catchphrase: c.catchphrase ?? '',
    });
    setError('');
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('名前を入力してください'); return; }
    setSaving(true);
    setError('');
    try {
      const body: CharacterCreate = {
        name: form.name,
        persona: form.persona || undefined,
        tone: form.tone || undefined,
        catchphrase: form.catchphrase || undefined,
      };
      if (editTarget) {
        const updated = await updateCharacter(gt, editTarget.id, body);
        setCharacters((prev) => prev.map((c) => (c.id === editTarget.id ? updated : c)));
      } else {
        const created = await createCharacter(gt, body);
        setCharacters((prev) => [...prev, created]);
      }
      setShowForm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存に失敗しました');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await deleteCharacter(gt, id).catch(() => {});
    setCharacters((prev) => prev.filter((c) => c.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <NavBar />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900">キャラクター管理</h1>
          <button onClick={openCreate} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" />
            <span>新しいキャラ</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-16 text-gray-400">読み込み中...</div>
        ) : characters.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-gray-500 mb-4">キャラクターがまだいません</p>
            <button onClick={openCreate} className="btn-primary inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              最初のキャラを作る
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {characters.map((c) => (
              <CharacterCard key={c.id} character={c} onEdit={openEdit} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      {/* Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-semibold text-gray-900">
                {editTarget ? 'キャラクターを編集' : 'キャラクターを作成'}
              </h2>
              <button onClick={() => setShowForm(false)} className="p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="label">名前 *</label>
                <input
                  className="input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="例：ハルカ"
                />
              </div>
              <div>
                <label className="label">人格設定</label>
                <textarea
                  className="input resize-none h-20"
                  value={form.persona}
                  onChange={(e) => setForm({ ...form, persona: e.target.value })}
                  placeholder="例：明るく元気な先輩。常にポジティブで背中を押してくれる。"
                />
              </div>
              <div>
                <label className="label">口調</label>
                <input
                  className="input"
                  value={form.tone}
                  onChange={(e) => setForm({ ...form, tone: e.target.value })}
                  placeholder="例：タメ口・関西弁・丁寧語"
                />
              </div>
              <div>
                <label className="label">口癖（励ます時の言葉）</label>
                <input
                  className="input"
                  value={form.catchphrase}
                  onChange={(e) => setForm({ ...form, catchphrase: e.target.value })}
                  placeholder="例：絶対できる！一緒に頑張ろ！"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 btn-secondary"
                >
                  キャンセル
                </button>
                <button type="submit" disabled={saving} className="flex-1 btn-primary">
                  {saving ? '保存中...' : '保存'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
