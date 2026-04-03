'use client';

import { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import type { Character } from '@/types';

interface Props {
  character: Character;
  onEdit: (c: Character) => void;
  onDelete: (id: string) => void;
}

export default function CharacterCard({ character, onEdit, onDelete }: Props) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (!confirm(`「${character.name}」を削除しますか？`)) return;
    setDeleting(true);
    onDelete(character.id);
  };

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary-100 rounded-full overflow-hidden flex items-center justify-center flex-shrink-0">
            {character.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-xl">🎭</span>
            )}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">{character.name}</h3>
            {character.tone && (
              <span className="text-xs text-gray-500">口調：{character.tone}</span>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(character)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-500 hover:text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {character.persona && (
        <p className="text-sm text-gray-600 mb-2">
          <span className="font-medium">人格：</span>{character.persona}
        </p>
      )}
      {character.catchphrase && (
        <p className="text-sm text-gray-500 italic">「{character.catchphrase}」</p>
      )}
    </div>
  );
}
