"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Bot, Send, Sparkles, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { askAIMentor } from "@/app/actions/ai-mentor";
import type { AIChatLog } from "@/services/ai-mentor";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

function messagesFromLogs(logs: AIChatLog[]): ChatMessage[] {
  return logs.flatMap((log) => [
    { id: `${log.id}-prompt`, role: "user" as const, content: log.prompt },
    { id: `${log.id}-response`, role: "assistant" as const, content: log.response },
  ]);
}

export function AIMentorChat({ logs }: { logs: AIChatLog[] }) {
  const initialMessages = useMemo(() => messagesFromLogs(logs), [logs]);
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [prompt, setPrompt] = useState("");
  const [pending, setPending] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, pending]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = prompt.trim();
    if (!value || pending) return;

    const history = messages.slice(-8).map(({ role, content }) => ({ role, content }));
    setMessages((current) => [...current, { id: `local-${Date.now()}`, role: "user", content: value }]);
    setPrompt("");
    setPending(true);

    try {
      const log = await askAIMentor({ prompt: value, history });
      setMessages((current) => [
        ...current,
        { id: log.id, role: "assistant", content: log.response },
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "تعذر الاتصال بالموجّه الذكي.");
      setMessages((current) => current.filter((message) => !message.id.startsWith("local-")));
    } finally {
      setPending(false);
    }
  }

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-card shadow-sm dark:border-slate-800">
      <CardHeader className="border-b border-border bg-gradient-to-l from-primary/10 via-card to-card pb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </div>
          <div>
            <CardTitle className="text-xl">الموجّه الذكي</CardTitle>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">
              اسأل عن Python أو علوم الحاسب. سأساعدك بأسئلة إرشادية بدلًا من إعطائك الحل مباشرة.
            </p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="min-h-[420px] space-y-4 overflow-y-auto bg-muted/20 p-4 sm:p-6" aria-live="polite">
          {messages.length === 0 && (
            <div className="mx-auto flex max-w-lg flex-col items-center justify-center py-16 text-center">
              <Bot className="h-10 w-10 text-primary" aria-hidden="true" />
              <h2 className="mt-4 text-lg font-semibold">ابدأ بسؤال أو الصق كود Python</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                مثال: لماذا يظهر الخطأ في هذا الجزء؟ وما السؤال الذي يساعدني على اكتشافه؟
              </p>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card text-primary ring-1 ring-border"}`}>
                {message.role === "user" ? <UserRound className="h-4 w-4" aria-hidden="true" /> : <Bot className="h-4 w-4" aria-hidden="true" />}
              </div>
              <div className={`max-w-[min(90%,680px)] rounded-2xl px-4 py-3 text-sm leading-7 shadow-sm ${message.role === "user" ? "rounded-tr-sm bg-primary text-primary-foreground" : "rounded-tl-sm bg-card text-card-foreground ring-1 ring-border"}`}>
                {message.role === "user" ? (
                  <p className="whitespace-pre-wrap break-words">{message.content}</p>
                ) : (
                  <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:my-3 prose-pre:overflow-x-auto prose-pre:rounded-xl prose-pre:bg-slate-950 prose-pre:text-slate-100 prose-code:before:content-none prose-code:after:content-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        pre: ({ children }) => <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-6 text-slate-100">{children}</pre>,
                        code: ({ children, className }) => <code className={`${className ?? ""} rounded bg-muted px-1.5 py-0.5 text-[0.9em]`}>{children}</code>,
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          ))}

          {pending && (
            <div className="flex gap-3" role="status" aria-label="الموجّه يكتب">
              <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
                <Bot className="h-4 w-4" aria-hidden="true" />
              </div>
              <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-card px-4 py-4 ring-1 ring-border">
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.2s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.1s]" />
                <span className="h-2 w-2 animate-bounce rounded-full bg-primary" />
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <form onSubmit={handleSubmit} className="border-t border-border bg-card p-4 sm:p-5">
          <label htmlFor="ai-mentor-prompt" className="sr-only">اكتب سؤالك أو الصق الكود</label>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <Textarea
              id="ai-mentor-prompt"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="اكتب سؤالك أو الصق كود Python هنا..."
              className="min-h-[92px] resize-y bg-background text-sm leading-6"
              maxLength={8000}
              disabled={pending}
            />
            <Button type="submit" disabled={pending || !prompt.trim()} className="h-11 gap-2 sm:w-32">
              <Send className="h-4 w-4" aria-hidden="true" />
              {pending ? "جاري التفكير..." : "إرسال"}
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">اختصار الإرسال: Ctrl + Enter · لا تشارك كلمات المرور أو البيانات الشخصية.</p>
        </form>
      </CardContent>
    </Card>
  );
}
