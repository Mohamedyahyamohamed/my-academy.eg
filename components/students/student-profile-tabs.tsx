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
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="attendance">Attendance</TabsTrigger>
        <TabsTrigger value="payments">Payments</TabsTrigger>
        <TabsTrigger value="grades">Grades</TabsTrigger>
        <TabsTrigger value="homework">Homework</TabsTrigger>
        <TabsTrigger value="lessons">Lessons</TabsTrigger>
        <TabsTrigger value="notes">Notes</TabsTrigger>
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
