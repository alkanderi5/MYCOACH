"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Button, ErrorNote } from "./ui";

type Mode = "signin" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

const COPY = {
  signin: {
    heading: "Welcome back",
    sub: "Sign in to pick up your program where you left it.",
    action: "Sign in",
    switchText: "New to MYCOACH?",
    switchCta: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    heading: "Start at Level 1",
    sub: "Create an account and begin the program.",
    action: "Create account",
    switchText: "Already have an account?",
    switchCta: "Sign in",
    switchHref: "/signin",
  },
} as const;

export function AuthForm({
  mode,
  next,
  notice,
}: {
  mode: Mode;
  next?: string;
  notice?: string;
}) {
  const router = useRouter();
  const copy = COPY[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  function checkEmail(value: string) {
    if (!value.trim()) return "Enter your email address.";
    if (!EMAIL_PATTERN.test(value.trim())) return "That does not look like an email address.";
    return "";
  }

  function checkPassword(value: string) {
    if (!value) return "Enter your password.";
    if (mode === "signup" && value.length < MIN_PASSWORD) {
      return `Use at least ${MIN_PASSWORD} characters.`;
    }
    return "";
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = checkEmail(email);
    const nextPasswordError = checkPassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      setFormError("");
      return;
    }

    setBusy(true);
    setFormError("");

    const supabase = createClient();
    const credentials = { email: email.trim(), password };

    const { data, error } =
      mode === "signup"
        ? await supabase.auth.signUp(credentials)
        : await supabase.auth.signInWithPassword(credentials);

    setBusy(false);

    if (error) {
      setFormError(friendly(error.message));
      return;
    }

    if (mode === "signup" && !data.session) {
      setFormError("Check your inbox to confirm your address, then sign in.");
      return;
    }

    // A new account picks its ability before landing on Home.
    router.replace(
      mode === "signup" ? "/onboarding" : next?.startsWith("/") ? next : "/home",
    );
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-6 py-16">
      <span className="text-[14px] font-medium uppercase tracking-[0.2em] text-ink">
        MYCOACH
      </span>

      <h1 className="mt-10 text-[34px] font-medium leading-tight tracking-tight text-ink">
        {copy.heading}
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted">{copy.sub}</p>

      {notice && (
        <div className="mt-6">
          <ErrorNote>{notice}</ErrorNote>
        </div>
      )}

      {/* method="post" so a failed bundle cannot fall back to a GET that puts
          the password in the URL and the server log. */}
      <form onSubmit={handleSubmit} method="post" noValidate className="mt-9">
        <div className="space-y-6">
          <Field
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            value={email}
            error={emailError}
            onChange={(v) => {
              setEmail(v);
              if (emailError) setEmailError("");
            }}
            onBlur={(v) => setEmailError(checkEmail(v))}
          />

          <Field
            id="password"
            label="Password"
            type={showPassword ? "text" : "password"}
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            error={passwordError}
            onChange={(v) => {
              setPassword(v);
              if (passwordError) setPasswordError("");
            }}
            trailing={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="text-faint transition-colors hover:text-accent"
              >
                {showPassword ? <EyeSlash size={19} /> : <Eye size={19} />}
              </button>
            }
          />
        </div>

        {formError && (
          <div className="mt-6">
            <ErrorNote>{formError}</ErrorNote>
          </div>
        )}

        <Button type="submit" size="lg" disabled={busy} className="mt-9 w-full">
          {busy ? "Working…" : copy.action}
        </Button>
      </form>

      <p className="mt-10 text-center text-[13px] text-muted">
        {copy.switchText}{" "}
        <Link href={copy.switchHref} className="text-accent-ink hover:text-accent">
          {copy.switchCta}
        </Link>
      </p>
    </main>
  );
}

function Field({
  id,
  label,
  error,
  value,
  onChange,
  onBlur,
  trailing,
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  trailing?: React.ReactNode;
  type: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] uppercase tracking-[0.22em] text-muted"
      >
        {label}
      </label>
      <div className="relative mt-2.5">
        <input
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`h-11 w-full rounded-none border-0 border-b bg-transparent pr-9 text-[17px] text-ink outline-none transition-colors ${
            error ? "border-miss" : "border-line-strong focus:border-accent"
          }`}
          {...rest}
        />
        {trailing && <span className="absolute bottom-2.5 right-0">{trailing}</span>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-2 text-[12px] text-muted">
          {error}
        </p>
      )}
    </div>
  );
}

function friendly(message: string) {
  const normalised = message.toLowerCase();
  if (normalised.includes("invalid login credentials")) {
    return "That email and password do not match an account.";
  }
  if (normalised.includes("already registered")) {
    return "An account with that email already exists.";
  }
  if (normalised.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  if (normalised.includes("fetch") || normalised.includes("network")) {
    return "We could not reach the server. Check your connection and try again.";
  }
  return message;
}
