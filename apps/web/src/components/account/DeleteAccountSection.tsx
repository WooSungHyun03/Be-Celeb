"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { ConfirmModal } from "@/components/common/ConfirmModal";
import { ROUTES } from "@/constants/routes";
import { getSupabaseBrowserClient } from "@/lib/auth/supabase";
import { deleteAccount } from "@/lib/api/users";

type DeleteAccountSectionProps = {
  onError: (message: string) => void;
};

export function DeleteAccountSection({ onError }: DeleteAccountSectionProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleDelete() {
    if (confirmText !== "DELETE") {
      onError('회원 탈퇴를 진행하려면 "DELETE"를 입력하세요.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount();
      await getSupabaseBrowserClient().auth.signOut();
      router.replace(ROUTES.home);
      router.refresh();
    } catch (error) {
      onError(error instanceof Error ? error.message : "회원 탈퇴에 실패했습니다.");
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <Card title="회원 탈퇴">
      <p className="text-sm leading-6 text-slate-600">
        계정 삭제 후 로그인 세션이 종료됩니다. 분석/추천 이력은 운영 통계를 위해 사용자 식별값을 제거한 상태로 보관될 수 있습니다.
      </p>
      <Button className="mt-4" onClick={() => setOpen(true)} variant="danger">
        회원 탈퇴
      </Button>
      <ConfirmModal
        confirmLabel={isDeleting ? "탈퇴 처리 중" : "회원 탈퇴"}
        description='정말 탈퇴하려면 "DELETE"를 입력하세요.'
        onClose={() => {
          setOpen(false);
          setConfirmText("");
        }}
        onConfirm={handleDelete}
        open={open}
        title="회원 탈퇴 확인"
        tone="danger"
      >
        <input
          className="min-h-10 w-full rounded-md border border-rose-300 px-3 py-2 text-sm"
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder="DELETE"
          value={confirmText}
        />
      </ConfirmModal>
    </Card>
  );
}
