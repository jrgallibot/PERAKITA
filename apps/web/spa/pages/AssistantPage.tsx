'use client';

import { useState } from 'react';
import { PESO_AI_DISCLAIMER } from '@perakita/shared';
import { AppHeader } from '@/components/AppHeader';
import { useAuth } from '@/spa/AuthProvider';
import { loadWebPesoDashboard, sendWebAiChat } from '@/lib/peso';

const SUGGESTIONS = [
  'Where did most of my money go?',
  'Can I afford to spend ₱500 today?',
  'How can I reach my savings goal?',
];

export function AssistantPage() {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Array<{ role: 'user' | 'assistant'; text: string }>>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const send = async (text: string) => {
    if (!user?.id || !text.trim()) return;
    setMessages((prev) => [...prev, { role: 'user', text: text.trim() }]);
    setInput('');
    setLoading(true);
    try {
      const snapshot = await loadWebPesoDashboard(user.id);
      const reply = await sendWebAiChat(text.trim(), snapshot);
      setMessages((prev) => [...prev, { role: 'assistant', text: reply }]);
    } catch {
      setMessages((prev) => [...prev, { role: 'assistant', text: 'Something went wrong.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col bg-[var(--background)]">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
        <h1 className="text-2xl font-extrabold">AI financial assistant</h1>
        <div className="mt-4 flex-1 space-y-3 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className="rounded-xl border border-[var(--border)] px-3 py-2 text-sm"
                  onClick={() => void send(s)}
                  type="button"
                >
                  {s}
                </button>
              ))}
            </div>
          ) : null}
          {messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                m.role === 'user'
                  ? 'ml-auto bg-primary/15'
                  : 'mr-auto border border-[var(--border)] bg-[var(--surface)]'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
        <p className="text-xs text-[var(--muted)]">{PESO_AI_DISCLAIMER}</p>
        <form
          className="mt-3 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
        >
          <input
            className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2"
            placeholder="Ask a question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            className="rounded-xl bg-primary px-4 py-2 font-semibold text-white dark:text-slate-950"
            disabled={loading}
            type="submit"
          >
            Send
          </button>
        </form>
      </main>
    </div>
  );
}
