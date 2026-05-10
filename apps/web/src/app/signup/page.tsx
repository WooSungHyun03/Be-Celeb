"use client";

// Renders the signup page and connects it to the auth API.
import { FormEvent, useState } from "react";
import Link from "next/link";
<<<<<<< HEAD
import { useRouter } from "next/navigation";
=======
import { BrandLogo } from "@/components/common/BrandLogo";
>>>>>>> d16f7371cbc515473b9a4164bc9decd97a69134b
import { Button } from "@/components/common/Button";
import { Input } from "@/components/common/Input";
import { ROUTES } from "@/constants/routes";

type ApiErrorResponse = {
  success: false;
  message?: string;
  code?: string;
};

export default function SignupPage() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("loading");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, nickname }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const error = payload as ApiErrorResponse;
        setStatus("error");
        setMessage(error.message ?? "Signup failed.");
        return;
      }

      router.push(ROUTES.dashboard);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Signup failed. Please try again.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[720px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <Link className="mx-auto inline-flex" href={ROUTES.home}>
            <BrandLogo />
          </Link>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">Create account</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Create an account and start your content strategy.</p>
        </div>

        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <Input
              autoComplete="nickname"
              label="Nickname"
              minLength={2}
              onChange={(event) => setNickname(event.target.value)}
              placeholder="tester"
              required
              value={nickname}
            />
            <Input
              autoComplete="email"
              label="Email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
              type="email"
              value={email}
            />
            <Input
              autoComplete="new-password"
              label="Password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8+ characters"
              required
              type="password"
              value={password}
            />
            <Input
              autoComplete="new-password"
              label="Confirm Password"
              minLength={8}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirm password"
              required
              type="password"
              value={confirmPassword}
            />
            {message ? <p className="text-sm font-medium text-rose-600">{message}</p> : null}
            <Button className="min-h-11 w-full" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Creating..." : "Create account"}
            </Button>
          </div>

          <p className="mt-5 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link href={ROUTES.login} className="font-semibold text-ink hover:underline">
              Login
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
}
