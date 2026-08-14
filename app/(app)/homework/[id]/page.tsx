import { notFound } from "next/navigation";
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
  await requireScopedRole("ADMIN", "TEACHER");
  const hw = await HomeworkService.getHomework(params.id);
  if (!hw) notFound();
  const submissions = await HomeworkService.listSubmissions(params.id);
  const submitted = submissions.filter((s) => s.status !== "PENDING").length;
  const reviewed = submissions.filter((s) => s.status === "REVIEWED").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={hw.title}
        breadcrumbs={[{ label: "الواجبات", href: "/homework" }, { label: hw.title }]}
      >
        <Button asChild variant="outline">
          <Link href="/homework"><ArrowLeft className="h-4 w-4" /> رجوع</Link>
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="p-5">
          <p className="text-sm text-muted-foreground">{hw.description}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Badge variant="secondary">{hw.group?.name}</Badge>
            <Badge variant="outline">موعد التسليم: {formatDate(hw.deadline)}</Badge>
            <Badge variant="info">{submitted}/{submissions.length} submitted</Badge>
            <Badge variant="success">{reviewed} reviewed</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">التسليمات</CardTitle></CardHeader>
        <CardContent>
          <SubmissionReview submissions={submissions} />
        </CardContent>
      </Card>
    </div>
  );
}
