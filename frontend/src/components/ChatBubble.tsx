import type { Message } from '@/types';
import { formatDateTime } from '@/lib/utils';
import { User, Bot } from 'lucide-react';

interface Props {
  message: Message;
  characterName?: string;
}

export default function ChatBubble({ message, characterName }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-gray-200' : 'bg-primary-100'
        }`}
      >
        {isUser ? (
          <User className="w-4 h-4 text-gray-500" />
        ) : (
          <Bot className="w-4 h-4 text-primary-500" />
        )}
      </div>

      <div className={`max-w-[75%] ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isUser && characterName && (
          <span className="text-xs text-gray-500 mb-1">{characterName}</span>
        )}
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-primary-500 text-white rounded-tr-sm'
              : 'bg-white border border-gray-200 text-gray-800 rounded-tl-sm'
          }`}
        >
          {message.content}
        </div>
        <span className="text-xs text-gray-400 mt-1">
          {formatDateTime(message.created_at)}
        </span>
      </div>
    </div>
  );
}
