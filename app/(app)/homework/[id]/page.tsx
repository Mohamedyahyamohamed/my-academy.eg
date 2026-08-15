import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { getLangFromCookie, LANG_COOKIE } from "@/lib/i18n";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SubmissionReview } from "@/components/homework/submission-review";
import { HomeworkService, requireScopedRole } from "@/services";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function HomeworkDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const en = getLangFromCookie((await cookies()).get(LANG_COOKIE)?.value) === "en";
  await requireScopedRole("TEACHER");
  const hw = await HomeworkService.getHomework(params.id);
  if (!hw) notFound();
  const submissions = await HomeworkService.listSubmissions(params.id);
  const submitted = submissions.filter((s) => s.status !== "PENDING").length;
  const reviewed = submissions.filter((s) => s.status === "REVIEWED").length;

  return (
    <div className="space-y-6" dir={en ? "ltr" : "rtl"}>
      <PageHeader
        title={hw.title}
        breadcrumbs={[{ label: en ? "Homework" : "الواجبات", href: "/homework" }, { label: hw.title }]}
      >
        <Button asChild variant="outline">
          <Link href="/homework"><ArrowLeft className="me-2 h-4 w-4" /> {en ? "Back" : "رجوع"}</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{hw.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{hw.group?.name}</Badge>
            <Badge variant="outline">{en ? "Due date:" : "موعد التسليم:"} {formatDate(hw.deadline, undefined, en ? "en-EG" : "ar-EG")}</Badge>
            <Badge variant="info">{submitted}/{submissions.length} {en ? "submitted" : "تم التسليم"}</Badge>
            <Badge variant="success">{reviewed} {en ? "reviewed" : "تمت المراجعة"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">{en ? "Submissions" : "التسليمات"}</CardTitle></CardHeader>
        <CardContent>
          <SubmissionReview submissions={submissions} />
        </CardContent>
      </Card>
    </div>
  );
}
