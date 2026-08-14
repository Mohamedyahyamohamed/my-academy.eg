"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Inbox, MailOpen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials, formatRelative } from "@/lib/utils";
import { sendMessageAction } from "@/app/actions/messaging";
import { useClientLang } from "@/lib/i18n-client";
import type { Message } from "@/services/messaging";

export function MessagesPageContent({
  inbox,
  sent,
  contacts,
}: {
  inbox: Message[];
  sent: Message[];
  contacts: { id: string; full_name: string; role: string }[];
}) {
  const router = useRouter();
  const en = useClientLang() === "en";
  const [recipient, setRecipient] = React.useState("");
  const [body, setBody] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const send = async () => {
    if (!recipient || !body.trim()) { toast.error(en ? "Choose a contact and write a message." : "اختر جهة اتصال واكتب رسالة."); return; }
    setSending(true);
    try {
      const res = await sendMessageAction(recipient, body.trim());
      if (!res.ok) { toast.error(res.error ?? (en ? "Unable to send the message." : "تعذّر إرسال الرسالة.")); return; }
      toast.success(en ? "Message sent." : "تم إرسال الرسالة.");
      setBody(""); setRecipient("");
      router.refresh();
    } finally { setSending(false); }
  };

  const roleLabel = (role: string) => role === "PARENT" ? (en ? "Parent" : "ولي أمر") : role === "TEACHER" ? (en ? "Teacher" : "مدرس") : role === "ADMIN" ? (en ? "Admin" : "مدير") : role;

  return (
    <div className="grid gap-4 lg:grid-cols-2" dir={en ? "ltr" : "rtl"}>
      {/* Compose */}
      <div className="card-surface p-5 space-y-3">
        <h3 className="font-semibold text-sm">{en ? "New message" : "رسالة جديدة"}</h3>
        <select value={recipient} onChange={(e) => setRecipient(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="">{en ? "Choose a contact…" : "اختر جهة اتصال…"}</option>
          {contacts.map((c) => <option key={c.id} value={c.id}>{c.full_name} ({roleLabel(c.role)})</option>)}
        </select>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder={en ? "Write your message…" : "اكتب رسالتك…"} />
        <Button onClick={send} disabled={sending} className="w-full">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />} {en ? "Send message" : "إرسال الرسالة"}
        </Button>
      </div>
      {/* Inbox + Sent */}
      <Tabs defaultValue="inbox">
        <TabsList className="w-full">
          <TabsTrigger value="inbox" className="flex-1"><Inbox className="h-4 w-4" /> {en ? "Inbox" : "الوارد"} ({inbox.filter(m => !m.read).length})</TabsTrigger>
          <TabsTrigger value="sent" className="flex-1"><MailOpen className="h-4 w-4" /> {en ? "Sent" : "المرسلة"}</TabsTrigger>
        </TabsList>
        <TabsContent value="inbox" className="space-y-1">
          {inbox.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{en ? "No messages." : "لا توجد رسائل."}</p> : inbox.slice(0, 20).map((m) => (
            <div key={m.id} className={cn("flex items-start gap-3 rounded-lg p-3", !m.read && "bg-primary/5")}>
              <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(m.sender_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className={cn("text-sm truncate", !m.read && "font-semibold")}>{m.sender_name}</p>
                  <span className="text-[11px] text-muted-foreground shrink-0">{formatRelative(m.created_at)}</span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{m.body}</p>
              </div>
              {!m.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />}
            </div>
          ))}
        </TabsContent>
        <TabsContent value="sent" className="space-y-1">
          {sent.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{en ? "No sent messages." : "لا توجد رسائل مرسلة."}</p> : sent.slice(0, 20).map((m) => (
            <div key={m.id} className="flex items-start gap-3 rounded-lg p-3">
              <Avatar className="h-8 w-8"><AvatarFallback className="text-[10px]">{initials(m.recipient_name)}</AvatarFallback></Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{en ? "To:" : "إلى:"} {m.recipient_name}</p>
                <p className="text-sm text-muted-foreground truncate">{m.body}</p>
              </div>
              <span className="text-[11px] text-muted-foreground shrink-0">{formatRelative(m.created_at)}</span>
            </div>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function cn(...args: any[]) { return args.filter(Boolean).join(" "); }
