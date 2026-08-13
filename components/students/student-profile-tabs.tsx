"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentProfileTabsProps {
  overview: React.ReactNode;
  attendance: React.ReactNode;
  payments: React.ReactNode;
  grades: React.ReactNode;
  homework: React.ReactNode;
  lessons: React.ReactNode;
  notes: React.ReactNode;
}

export function StudentProfileTabs(props: StudentProfileTabsProps) {
  return (
    <Tabs defaultValue="overview">
      <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
        <TabsTrigger value="overview">نظرة عامة</TabsTrigger>
        <TabsTrigger value="attendance">الحضور</TabsTrigger>
        <TabsTrigger value="payments">المصروفات</TabsTrigger>
        <TabsTrigger value="grades">الدرجات</TabsTrigger>
        <TabsTrigger value="homework">الواجبات</TabsTrigger>
        <TabsTrigger value="lessons">الحصص</TabsTrigger>
        <TabsTrigger value="notes">الملاحظات</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">{props.overview}</TabsContent>
      <TabsContent value="attendance">{props.attendance}</TabsContent>
      <TabsContent value="payments">{props.payments}</TabsContent>
      <TabsContent value="grades">{props.grades}</TabsContent>
      <TabsContent value="homework">{props.homework}</TabsContent>
      <TabsContent value="lessons">{props.lessons}</TabsContent>
      <TabsContent value="notes">{props.notes}</TabsContent>
    </Tabs>
  );
}
