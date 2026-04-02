import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { SignInButton } from '@clerk/nextjs';
import { BookOpen, Star, MessageCircle } from 'lucide-react';

export default async function HomePage() {
  const { userId } = auth();
  if (userId) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-purple-50">
      <div className="max-w-4xl mx-auto px-4 py-16">
        {/* Hero */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-primary-500 rounded-2xl mb-6">
            <BookOpen className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            StudyChara
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            キャラクターと一緒に、学習計画を立てよう。
            <br />
            AIがあなただけのキャラクターとして、学習をサポートします。
          </p>
          <SignInButton mode="modal">
            <button className="btn-primary text-lg px-8 py-3">
              はじめる（ログイン）
            </button>
          </SignInButton>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6">
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-4">
              <Star className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              オリジナルキャラクター
            </h3>
            <p className="text-sm text-gray-600">
              名前・人格・口調を設定して、あなただけのAIキャラクターを作れます。
            </p>
          </div>
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-4">
              <BookOpen className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              AI学習計画生成
            </h3>
            <p className="text-sm text-gray-600">
              目標と期間を入力するだけで、キャラクターがAIとして学習計画とタスクを自動生成します。
            </p>
          </div>
          <div className="card p-6 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-primary-100 rounded-xl mb-4">
              <MessageCircle className="w-6 h-6 text-primary-500" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-2">
              キャラとの会話
            </h3>
            <p className="text-sm text-gray-600">
              学習の悩みや進捗をキャラクターに相談。キャラの口調で励ましてくれます。
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-12">
          BYOK方式：Claude / Gemini のAPIキーをご自身でご用意ください。
        </p>
      </div>
    </div>
  );
}
