"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Wallet, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { recordPaymentSchema, type RecordPaymentValues, paymentSchema, type PaymentValues } from "@/schemas";
import { recordPaymentAction, createPaymentAction } from "@/app/actions/payments";
import { PAYMENT_METHODS, paymentMethodLabel } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import type { Group, Payment, Student } from "@/types";
import { useClientLang } from "@/lib/i18n-client";

export function RecordPaymentDialog({
  payment,
  students,
}: {
  payment: Payment;
  students: Student[];
}) {
  const [open, setOpen] = React.useState(false);
  const en = useClientLang() === "en";
  const router = useRouter();
  const student = students.find((s) => s.id === payment.student_id);
  const { register, handleSubmit, watch, formState: { errors } } = useForm<RecordPaymentValues>({
    resolver: zodResolver(recordPaymentSchema),
    defaultValues: { amount: payment.remaining, method: "Cash" },
  });
  const [saving, setSaving] = React.useState(false);
  const amount = watch("amount");

  const onSubmit = async (values: RecordPaymentValues) => {
    if (values.amount > payment.remaining) {
      toast.error(en ? `Amount exceeds the outstanding balance (${formatCurrency(payment.remaining, "EGP", "en-EG")}).` : `المبلغ أكبر من الرصيد المتبقي (${formatCurrency(payment.remaining, "EGP", "ar-EG")}).`);
      return;
    }
    setSaving(true);
    try {
      const res = await recordPaymentAction(payment.id, values.amount, values.method, values.note);
      if (!res.ok) {
        toast.error(res.error ?? (en ? "Unable to complete the operation." : "تعذّر إتمام العملية."));
        return;
      }
      toast.success(en ? `Recorded ${formatCurrency(values.amount, "EGP", "en-EG")}` : `تم تسجيل ${formatCurrency(values.amount, "EGP", "ar-EG")}`);
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("async action failed:", error);
      toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="soft" disabled={payment.remaining <= 0}>
          <Wallet className="h-3.5 w-3.5" /> {en ? "Record" : "تسجيل"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{en ? "Record payment" : "تسجيل دفعة"}</DialogTitle>
          <DialogDescription>
            {student ? `${student.first_name} ${student.last_name} · ${payment.month}` : payment.month}
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg bg-muted p-3 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">{en ? "Outstanding" : "المتبقي"}</span><span className="font-semibold text-rose-600">{formatCurrency(payment.remaining, "EGP", en ? "en-EG" : "ar-EG")}</span></div>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <div className="space-y-1.5">
            <Label>{en ? "Amount received" : "المبلغ المستلم"}</Label>
            <Input type="number" min={1} max={payment.remaining} step="any" {...register("amount")} />
            {errors.amount && <p className="text-xs text-destructive">{errors.amount.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Payment method" : "طريقة الدفع"}</Label>
            <Input defaultValue="Cash" {...register("method")} list="methods" />
            <datalist id="methods">{PAYMENT_METHODS.map((m) => <option key={m} value={m} label={paymentMethodLabel(m, en)} />)}</datalist>
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Note (optional)" : "ملاحظة (اختياري)"}</Label>
            <Input {...register("note")} />
          </div>
          {amount > 0 && (
            <p className="text-sm text-muted-foreground">{en ? "New outstanding: " : "المتبقي الجديد: "}<span className="font-medium text-foreground">{formatCurrency(Math.max(0, payment.remaining - amount), "EGP", en ? "en-EG" : "ar-EG")}</span></p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Confirm" : "تأكيد"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CreatePaymentDialog({
  students,
  groups,
}: {
  students: Student[];
  groups: Group[];
}) {
  const [open, setOpen] = React.useState(false);
  const en = useClientLang() === "en";
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [studentId, setStudentId] = React.useState("");
  const [groupId, setGroupId] = React.useState("");
  const [month, setMonth] = React.useState(new Date().toISOString().slice(0, 7));
  const [amountDue, setAmountDue] = React.useState(0);
  const [amountPaid, setAmountPaid] = React.useState(0);
  const [method, setMethod] = React.useState("Cash");

  const submit = async () => {
    if (!studentId) { toast.error(en ? "Select a student first." : "اختر طالبًا أولًا."); return; }
    if (amountDue <= 0) { toast.error(en ? "The due amount must be greater than zero." : "يجب أن يكون المبلغ المستحق أكبر من صفر."); return; }
    setSaving(true);
    try {
      const res = await createPaymentAction({
        student_id: studentId,
        group_id: groupId || null,
        month,
        amount_due: amountDue,
        amount_paid: amountPaid,
        method,
      });
      if (!res.ok) { toast.error(res.error ?? (en ? "Unable to complete the operation." : "تعذّر إتمام العملية.")); return; }
      toast.success(en ? "Payment record created." : "تم إنشاء سجل الدفعة.");
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("async action failed:", error);
      toast.error(en ? "Something went wrong. Please try again." : "حدث خطأ، حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button><Plus className="h-4 w-4" /> {en ? "Add payment" : "إضافة دفعة"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{en ? "Add payment record" : "إضافة سجل دفعة"}</DialogTitle>
          <DialogDescription>{en ? "Create a payment record for a student." : "أنشئ سجل دفعة لطالب."}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>{en ? "Student *" : "الطالب *"}</Label>
              <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{en ? "Select…" : "اختر…"}</option>
                {students.map((s) => <option key={s.id} value={s.id}>{s.first_name} {s.last_name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Group" : "المجموعة"}</Label>
              <select value={groupId} onChange={(e) => { setGroupId(e.target.value); const g = groups.find((x) => x.id === e.target.value); if (g) setAmountDue(g.monthly_fee); }} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">{en ? "None" : "لا يوجد"}</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Month" : "الشهر"}</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Payment method" : "طريقة الدفع"}</Label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} className="h-9 w-full rounded-lg border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring">
                {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{paymentMethodLabel(m, en)}</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Due amount *" : "المبلغ المستحق *"}</Label>
              <Input type="number" min={0} step="any" value={amountDue || ""} onChange={(e) => setAmountDue(Number(e.target.value))} />
            </div>
            <div className="space-y-1.5">
              <Label>{en ? "Amount paid" : "المبلغ المدفوع"}</Label>
              <Input type="number" min={0} max={amountDue} step="any" value={amountPaid || ""} onChange={(e) => setAmountPaid(Number(e.target.value))} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted p-3 text-sm">
            <span className="text-muted-foreground">{en ? "Outstanding will be" : "المتبقي سيكون"}</span>
            <span className="font-semibold">{formatCurrency(Math.max(0, amountDue - amountPaid), "EGP", en ? "en-EG" : "ar-EG")}</span>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Create" : "إنشاء"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
