"use client";

import * as React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useClientLang } from "@/lib/i18n-client";

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
  const en = useClientLang() === "en";
  return (
    <Tabs defaultValue="overview" dir={en ? "ltr" : "rtl"}>
      <TabsList className="w-full justify-start overflow-x-auto sm:w-auto">
        <TabsTrigger value="overview">{en ? "Overview" : "نظرة عامة"}</TabsTrigger>
        <TabsTrigger value="attendance">{en ? "Attendance" : "الحضور"}</TabsTrigger>
        <TabsTrigger value="payments">{en ? "Payments" : "المصروفات"}</TabsTrigger>
        <TabsTrigger value="grades">{en ? "Grades" : "الدرجات"}</TabsTrigger>
        <TabsTrigger value="homework">{en ? "Homework" : "الواجبات"}</TabsTrigger>
        <TabsTrigger value="lessons">{en ? "Lessons" : "الحصص"}</TabsTrigger>
        <TabsTrigger value="notes">{en ? "Notes" : "الملاحظات"}</TabsTrigger>
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
