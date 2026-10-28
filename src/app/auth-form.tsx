"use client";

import { useActionState, useState } from "react";
import { authenticate, type AuthState } from "./auth-actions";

const initial: AuthState = { error: null };

export function AuthForm() {
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [state, action, pending] = useActionState(authenticate, initial);
  const signup = mode === "signup";

  return (
    <div className="w-full max-w-sm rounded-2xl border border-line bg-surface/95 p-7 shadow-xl backdrop-blur">
      <p className="flex items-center gap-2 text-lg font-semibold tracking-tight">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-xs font-bold text-white">PM</span>
        Procure Mind <span className="text-accent">V2.0</span>
      </p>
      <h1 className="mt-5 text-xl font-semibold">{signup ? "Create your account" : "Log in"}</h1>
      <form action={action} className="mt-5 space-y-3">
        <input type="hidden" name="mode" value={mode} />
        <label className="block text-sm">
          <span className="text-muted">Email</span>
          <input
            name="email"
            type="email"
            required
            defaultValue={state.email}
            autoComplete="email"
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        <label className="block text-sm">
          <span className="text-muted">Password {signup && "(at least 8 characters)"}</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete={signup ? "new-password" : "current-password"}
            className="mt-1 h-10 w-full rounded-lg border border-line px-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent-soft"
          />
        </label>
        {state.error && (
          <p role="alert" className="rounded-lg bg-bad px-3 py-2 text-sm">
            {state.error}
          </p>
        )}
        <button
          disabled={pending}
          className="h-11 w-full rounded-lg bg-accent text-[15px] font-medium text-white shadow-sm hover:bg-accent-hover disabled:opacity-70"
        >
          {pending ? (signup ? "Setting up your workspace…" : "Logging in…") : signup ? "Create account" : "Log in"}
        </button>
      </form>
      <p className="mt-4 text-sm text-muted">
        {signup ? "Already have an account? " : "New here? "}
        <button onClick={() => setMode(signup ? "login" : "signup")} className="font-medium text-accent hover:underline">
          {signup ? "Log in" : "Create an account"}
        </button>
      </p>
    </div>
  );
}
