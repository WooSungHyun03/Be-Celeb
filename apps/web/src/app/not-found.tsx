// Renders a custom 404 page.
import Link from "next/link";
import { Button } from "@/components/common/Button";
import { EmptyState } from "@/components/common/EmptyState";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <EmptyState
      title="페이지를 찾을 수 없습니다"
      description="주소가 변경되었거나 아직 준비되지 않은 화면입니다."
      action={<Link href={ROUTES.home}><Button>홈으로 이동</Button></Link>}
    />
  );
}
