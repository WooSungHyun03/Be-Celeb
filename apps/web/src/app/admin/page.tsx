import { AdminClient } from "@/components/admin/AdminClient";
import { Badge } from "@/components/common/Badge";
import { PageHeader } from "@/components/common/PageHeader";

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={<Badge tone="warning">운영자 전용</Badge>}
        title="Admin"
        description="카테고리, 인플루언서 YouTube 채널, 수집 영상, 추천 결과와 시스템 상태를 관리합니다."
      />
      <AdminClient />
    </div>
  );
}
