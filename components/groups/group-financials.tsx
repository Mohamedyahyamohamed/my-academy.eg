"use client";

import * as React from "react";
import { Loader2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PaymentStatusBadge } from "@/components/shared/badges";
import { RecordPaymentDialog } from "@/components/payments/payment-dialogs";
import { createPaymentAction } from "@/app/actions/payments";
import { formatCurrency } from "@/lib/utils";
import { useClientLang } from "@/lib/i18n-client";
import type { PaymentStatus, Student } from "@/types";

type SafeStudent = {
  id: string;
  first_name: string;
  last_name: string;
  grade: string | null;
};

type GroupPayment = {
  id: string;
  student_id: string;
  group_id: string | null;
  month: string;
  amount_due: number;
  amount_paid: number;
  remaining: number;
  status: PaymentStatus;
  notes: string | null;
};

export function GroupFinancials({
  groupId,
  month,
  monthlyFee,
  students,
  payments,
}: {
  groupId: string;
  month: string;
  monthlyFee: number;
  students: SafeStudent[];
  payments: GroupPayment[];
}) {
  const en = useClientLang() === "en";
  const paymentByStudent = new Map(payments.map((payment) => [payment.student_id, payment]));
  const expectedFee = Number.isFinite(monthlyFee) && monthlyFee > 0 ? monthlyFee : 0;

  return (
    <Card id="financials">
      <CardHeader className="flex flex-row items-center justify-between gap-3">
        <div>
          <CardTitle className="flex items-center gap-2 text-base">
            <Wallet className="h-4 w-4 text-primary" />
            {en ? "Financials" : "الماليات"}
          </CardTitle>
          <CardDescription>
            {en ? `Current month: ${month} · Expected fee: ${formatCurrency(expectedFee, "EGP", "en-EG")}` : `الشهر الحالي: ${month} · الرسوم المتوقعة: ${formatCurrency(expectedFee, "EGP", "ar-EG")}`}
          </CardDescription>
        </div>
        <Badge variant="outline">{students.length} {en ? "active students" : "طالب نشط"}</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {students.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">{en ? "No active students in this group yet." : "لا يوجد طلاب نشطون في هذه المجموعة حتى الآن."}</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{en ? "Student" : "الطالب"}</TableHead>
                <TableHead>{en ? "Expected" : "المستحق"}</TableHead>
                <TableHead>{en ? "Paid" : "المدفوع"}</TableHead>
                <TableHead>{en ? "Status" : "الحالة"}</TableHead>
                <TableHead className="text-left">{en ? "Action" : "إجراء"}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {students.map((student) => {
                const payment = paymentByStudent.get(student.id);
                return (
                  <TableRow key={student.id}>
                    <TableCell>
                      <p className="font-medium">{student.first_name} {student.last_name}</p>
                      {student.grade && <p className="text-xs text-muted-foreground">{student.grade}</p>}
                    </TableCell>
                    <TableCell>{formatCurrency(payment?.amount_due ?? expectedFee, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell>{formatCurrency(payment?.amount_paid ?? 0, "EGP", en ? "en-EG" : "ar-EG")}</TableCell>
                    <TableCell>{payment ? <PaymentStatusBadge status={payment.status} /> : <Badge variant="warning">{en ? "Unpaid" : "غير مدفوع"}</Badge>}</TableCell>
                    <TableCell className="text-left">
                      {payment ? (
                        <RecordPaymentDialog payment={payment as any} students={students as unknown as Student[]} cashOnly />
                      ) : (
                        <CollectPaymentDialog groupId={groupId} student={student} month={month} amountDue={expectedFee} />
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function CollectPaymentDialog({
  groupId,
  student,
  month,
  amountDue,
}: {
  groupId: string;
  student: SafeStudent;
  month: string;
  amountDue: number;
}) {
  const en = useClientLang() === "en";
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [amount, setAmount] = React.useState("");
  const [note, setNote] = React.useState("");
  const [saving, setSaving] = React.useState(false);

  const submit = async () => {
    const paid = Number(amount);
    if (!Number.isFinite(paid) || paid <= 0) {
      toast.error(en ? "Enter a positive amount." : "أدخل مبلغًا أكبر من صفر.");
      return;
    }
    if (paid > amountDue) {
      toast.error(en ? "Paid amount cannot exceed the expected fee." : "لا يمكن أن يتجاوز المدفوع الرسوم المستحقة.");
      return;
    }
    setSaving(true);
    try {
      const result = await createPaymentAction({
        student_id: student.id,
        group_id: groupId,
        month,
        amount_due: amountDue,
        amount_paid: paid,
        notes: note.trim() || null,
      });
      if (!result.ok) {
        toast.error(result.error ?? (en ? "Unable to record payment." : "تعذّر تسجيل الدفعة."));
        return;
      }
      toast.success(en ? "Payment recorded." : "تم تسجيل الدفعة.");
      setOpen(false);
      setAmount("");
      setNote("");
      router.refresh();
    } catch (error) {
      console.error("group payment action failed", error);
      toast.error(en ? "Unable to record payment. Please try again." : "تعذّر تسجيل الدفعة. حاول مرة أخرى.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="soft"><Wallet className="h-3.5 w-3.5" /> {en ? "Collect payment" : "تحصيل رسوم"}</Button>
      </DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{en ? "Collect payment" : "تحصيل رسوم"}</DialogTitle>
          <DialogDescription>{student.first_name} {student.last_name} · {month}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="rounded-lg bg-muted p-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">{en ? "Expected fee" : "الرسوم المستحقة"}</span><span className="font-semibold">{formatCurrency(amountDue, "EGP", en ? "en-EG" : "ar-EG")}</span></div>
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Amount paid" : "المبلغ المدفوع"}</Label>
            <Input type="number" min={0.01} max={amountDue} step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} autoFocus />
          </div>
          <div className="space-y-1.5">
            <Label>{en ? "Note (optional)" : "ملاحظة (اختياري)"}</Label>
            <Input value={note} onChange={(event) => setNote(event.target.value)} />
          </div>
          <p className="text-xs text-muted-foreground">{en ? "Status is calculated automatically from the paid amount." : "يتم تحديد الحالة تلقائيًا من خلال المبلغ المدفوع."}</p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>{en ? "Cancel" : "إلغاء"}</Button>
          <Button onClick={submit} disabled={saving || amountDue <= 0}>{saving && <Loader2 className="h-4 w-4 animate-spin" />} {en ? "Save" : "حفظ"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
