"use client";

// Renders the login page and connects it to the auth API.
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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const error = payload as ApiErrorResponse;
        setStatus("error");
        setMessage(error.message ?? "Login failed.");
        return;
      }

      router.push(ROUTES.dashboard);
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Login failed. Please try again.");
    }
  }

  return (
    <div className="mx-auto flex min-h-[680px] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link className="mx-auto inline-flex" href={ROUTES.home}>
            <BrandLogo />
          </Link>
          <h1 className="mt-8 text-3xl font-bold tracking-tight text-ink">Login</h1>
          <p className="mt-3 text-sm leading-6 text-slate-500">Sign in to open your content dashboard.</p>
        </div>

        <form className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8" onSubmit={handleSubmit}>
          <div className="space-y-4">
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
              autoComplete="current-password"
              label="Password"
              minLength={8}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="8+ characters"
              required
              type="password"
              value={password}
            />
            {message ? <p className="text-sm font-medium text-rose-600">{message}</p> : null}
            <Button className="min-h-11 w-full" disabled={status === "loading"} type="submit">
              {status === "loading" ? "Logging in..." : "Login"}
            </Button>
          </div>
          <div className="mt-5 flex items-center justify-between gap-4 text-sm text-slate-500">
            <Link href={ROUTES.signup} className="font-semibold text-ink hover:underline">
              Create account
            </Link>
            <button className="font-medium hover:text-ink" type="button">
              Forgot password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
