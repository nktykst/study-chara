'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import Link from 'next/link';
import NavBar from '@/components/NavBar';
import ChatBubble from '@/components/ChatBubble';
import LoadingSpinner from '@/components/LoadingSpinner';
import {
  getStudyPlan,
  listConversations,
  createConversation,
  getConversation,
  sendMessage,
  listCharacters,
} from '@/lib/api';
import type { Message, Character } from '@/types';
import { ChevronLeft, Send, Sparkles } from 'lucide-react';

export default function ChatPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { getToken } = useAuth();
  const gt = () => getToken();
  const bottomRef = useRef<HTMLDivElement>(null);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [character, setCharacter] = useState<Character | null>(null);
  const [planTitle, setPlanTitle] = useState('');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const plan = await getStudyPlan(gt, id);
        setPlanTitle(plan.title);

        if (plan.character_id) {
          const chars = await listCharacters(gt);
          const found = chars.find((c) => c.id === plan.character_id);
          if (found) setCharacter(found);
        }

        const convs = await listConversations(gt, id);
        let conv = convs[0];
        if (!conv) {
          conv = await createConversation(gt, id);
        }
        setConversationId(conv.id);

        const detail = await getConversation(gt, conv.id);
        setMessages(detail.messages);
      } catch {
        router.push(`/plans/${id}`);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, [id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !conversationId || sending) return;

    const content = input.trim();
    setInput('');
    setSending(true);
    setError('');

    // Optimistic UI: add user message immediately
    const tempUserMsg: Message = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId,
      role: 'user',
      content,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempUserMsg]);

    try {
      const aiMsg = await sendMessage(gt, conversationId, content);
      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempUserMsg.id),
        tempUserMsg,
        aiMsg,
      ]);
    } catch (err) {
      setError(err instanceof Error ? err.message : '送信に失敗しました');
      setMessages((prev) => prev.filter((m) => m.id !== tempUserMsg.id));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <NavBar />
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />

      {/* Chat Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <Link
            href={`/plans/${id}`}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
          >
            <ChevronLeft className="w-5 h-5" />
          </Link>
          {character?.avatar_url && (
            <div className="w-9 h-9 rounded-full overflow-hidden flex-shrink-0">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
            </div>
          )}
          <div>
            <p className="text-xs text-gray-400">{planTitle}</p>
            <p className="font-semibold text-gray-900">
              {character ? character.name : 'AIアシスタント'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12">
              <Sparkles className="w-8 h-8 text-primary-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                {character ? `${character.name}に話しかけてみましょう！` : 'メッセージを送って学習の相談をしましょう！'}
              </p>
              {character?.catchphrase && (
                <p className="text-primary-500 text-sm mt-2 italic">
                  「{character.catchphrase}」
                </p>
              )}
            </div>
          ) : (
            messages.map((msg) => (
              <ChatBubble
                key={msg.id}
                message={msg}
                characterName={character?.name}
                characterAvatarUrl={character?.avatar_url}
              />
            ))
          )}

          {sending && (
            <div className="flex gap-2.5">
              <div className="w-9 h-9 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                {character?.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover opacity-70" />
                ) : (
                  <Sparkles className="w-4 h-4 text-primary-400 animate-pulse" />
                )}
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl rounded-tl-sm px-4 py-3">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-2 h-2 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-gray-200 px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {error && (
            <p className="text-sm text-red-500 mb-2">{error}</p>
          )}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              className="flex-1 input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={character ? `${character.name}にメッセージを送る...` : 'メッセージを入力...'}
              disabled={sending}
            />
            <button
              type="submit"
              disabled={!input.trim() || sending}
              className="btn-primary px-4"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
