"use client";

import { useEffect, useState, type ReactNode, type FormEvent } from "react";
import { Badge } from "@/components/common/Badge";
import { Button } from "@/components/common/Button";
import { Card } from "@/components/common/Card";
import { Input } from "@/components/common/Input";
import { clearAdminSecret, hasStoredAdminSecret, storeAdminSecret } from "@/lib/api/admin";

type AdminAuthGateProps = {
  children: ReactNode;
  onUnlock?: () => void;
};

export function AdminAuthGate({ children, onUnlock }: AdminAuthGateProps) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [secret, setSecret] = useState("");

  useEffect(() => {
    const unlocked = hasStoredAdminSecret();
    setIsUnlocked(unlocked);
    if (unlocked) {
      onUnlock?.();
    }
  }, [onUnlock]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!secret.trim()) {
      return;
    }
    storeAdminSecret(secret.trim());
    setSecret("");
    setIsUnlocked(true);
    onUnlock?.();
  }

  function handleLogout() {
    clearAdminSecret();
    setIsUnlocked(false);
  }

  if (!isUnlocked) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <Card title="Admin 접근">
          <div className="mb-5 flex flex-wrap gap-2">
            <Badge tone="warning">MVP 보호</Badge>
            <Badge>Authorization Bearer</Badge>
          </div>
          <p className="mb-5 text-sm leading-6 text-slate-600">
            운영자 기능은 Render Backend의 `ADMIN_SECRET`과 일치하는 passcode가 있어야 접근할 수 있습니다.
            입력한 값은 현재 브라우저 sessionStorage에만 저장됩니다.
          </p>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Admin passcode"
              onChange={(event) => setSecret(event.target.value)}
              placeholder="ADMIN_SECRET"
              type="password"
              value={secret}
            />
            <Button type="submit">Admin 열기</Button>
          </form>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleLogout} variant="secondary">
          Admin 로그아웃
        </Button>
      </div>
      {children}
    </div>
  );
}
