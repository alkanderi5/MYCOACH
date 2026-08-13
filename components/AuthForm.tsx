"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, Eye, EyeSlash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { Wordmark } from "./Wordmark";
import { cx } from "./ui";

type Mode = "login" | "signup";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

/**
 * Login and sign-up, direction 3A.
 *
 * Crimson doubles as the error colour: the palette is mono, so an invalid field
 * takes a crimson border and a crimson message rather than introducing a red.
 * Errors always carry text — colour alone would say nothing to a player who
 * cannot see it.
 */
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
  const isSignup = mode === "signup";

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);
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
    if (isSignup && value.length < MIN_PASSWORD) {
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

    const { data, error } = isSignup
      ? await supabase.auth.signUp({
          ...credentials,
          options: { data: { display_name: name.trim() || null } },
        })
      : await supabase.auth.signInWithPassword(credentials);

    setBusy(false);

    if (error) {
      setFormError(friendly(error.message));
      return;
    }

    if (isSignup && !data.session) {
      setFormError("Check your inbox to confirm your address, then log in.");
      return;
    }

    router.replace(isSignup ? "/onboarding" : next?.startsWith("/") ? next : "/home");
    router.refresh();
  }

  return (
    <main className="relative min-h-dvh overflow-hidden bg-canvas">
      {/* Atmosphere, not decoration: one blurred radial that never scrolls. */}
      <div
        aria-hidden
        className="crimson-bloom"
        style={
          isSignup
            ? {
                right: -110,
                background: "radial-gradient(circle, rgba(229,18,63,.28), transparent 66%)",
              }
            : {
                left: -90,
                background: "radial-gradient(circle, rgba(229,18,63,.32), transparent 66%)",
              }
        }
      />

      <div
        className="relative mx-auto flex min-h-dvh w-full max-w-[420px] flex-col px-[26px]"
        style={{
          paddingTop: "calc(92px + env(safe-area-inset-top))",
          paddingBottom: "calc(40px + env(safe-area-inset-bottom))",
        }}
      >
        <Wordmark />

        <h1
          className="text-[34px] font-semibold text-ink max-[379px]:text-[30px]"
          style={{ marginTop: 40, lineHeight: 1.08, letterSpacing: "-0.035em" }}
        >
          {isSignup ? (
            <>
              Create your
              <br />
              account.
            </>
          ) : (
            "Welcome back."
          )}
        </h1>

        <p
          className="text-[14px] text-muted"
          style={{ marginTop: 10, lineHeight: 1.6, maxWidth: isSignup ? 250 : 260 }}
        >
          {isSignup
            ? "Two minutes, then you're on the table."
            : "Pick your drills up where you left them."}
        </p>

        {notice && (
          <p role="status" className="mt-6 text-[13px] leading-relaxed text-accent-ink">
            {notice}
          </p>
        )}

        {/* method="post" so a failed bundle cannot fall back to a GET that puts
            the password in the URL and the server log. */}
        <form onSubmit={handleSubmit} method="post" noValidate>
          <div className="flex flex-col gap-3" style={{ marginTop: isSignup ? 34 : 38 }}>
            {isSignup && (
              <Field
                id="name"
                label="Name"
                type="text"
                autoComplete="name"
                value={name}
                onChange={setName}
              />
            )}

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
              autoComplete={isSignup ? "new-password" : "current-password"}
              value={password}
              error={passwordError}
              helper={isSignup ? "8 characters minimum." : undefined}
              tracked={!showPassword}
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
                  className="grid h-[54px] w-10 place-items-center text-faint transition-colors hover:text-accent"
                >
                  {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
                </button>
              }
            />
          </div>

          {!isSignup && (
            <div className="flex items-center justify-between" style={{ marginTop: 16 }}>
              <label className="inline-flex cursor-pointer items-center gap-[9px]">
                <input
                  type="checkbox"
                  checked={staySignedIn}
                  onChange={(e) => setStaySignedIn(e.target.checked)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  className={cx(
                    "grid h-[18px] w-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors",
                    "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent",
                    staySignedIn
                      ? "border-accent bg-accent text-on-accent"
                      : "border-line bg-surface",
                  )}
                >
                  {staySignedIn && <Check size={11} weight="bold" />}
                </span>
                <span className="text-[13px] text-ink-3">Stay signed in</span>
              </label>

              <Link
                href="/login"
                className="text-[13px] font-medium text-accent transition-colors hover:text-accent-ink"
              >
                Forgot?
              </Link>
            </div>
          )}

          {formError && (
            <p role="alert" className="mt-5 text-[13px] text-accent">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="shadow-crimson active:shadow-crimson-active flex h-14 w-full items-center justify-center gap-3 rounded-lg bg-accent text-[16px] font-semibold text-on-accent transition-colors hover:bg-accent-hover active:bg-[#c8103a] disabled:pointer-events-none disabled:opacity-45"
            style={{ marginTop: isSignup ? 24 : 28, letterSpacing: "-0.01em" }}
          >
            {busy && (
              <span
                aria-hidden
                className="h-[17px] w-[17px] animate-spin rounded-full border-2 border-white/35 border-t-white"
                style={{ animationDuration: "800ms", animationTimingFunction: "linear" }}
              />
            )}
            {isSignup ? "Create account" : "Log in"}
          </button>

          {isSignup && (
            <p
              className="text-center text-[12px] leading-relaxed text-faint"
              style={{ marginTop: 16 }}
            >
              By creating an account you agree to our{" "}
              <Link href="/signup" className="text-ink-3 transition-colors hover:text-accent">
                Terms
              </Link>{" "}
              and{" "}
              <Link href="/signup" className="text-ink-3 transition-colors hover:text-accent">
                Privacy Policy
              </Link>
              .
            </p>
          )}
        </form>

        <p
          className="mt-auto text-center text-[13px] text-muted"
          style={{ paddingTop: isSignup ? 24 : 26 }}
        >
          {isSignup ? "Already have an account? " : "New to Cuemaster? "}
          <Link
            href={isSignup ? "/login" : "/signup"}
            className="font-medium text-accent transition-colors hover:text-accent-ink"
          >
            {isSignup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  id,
  label,
  error,
  helper,
  value,
  tracked,
  onChange,
  onBlur,
  trailing,
  ...rest
}: {
  id: string;
  label: string;
  error?: string;
  helper?: string;
  value: string;
  /** Password characters get extra tracking while hidden. */
  tracked?: boolean;
  onChange: (value: string) => void;
  onBlur?: (value: string) => void;
  trailing?: ReactNode;
  type: string;
  autoComplete: string;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block text-[11px] font-medium uppercase text-muted"
        style={{ letterSpacing: "0.10em", marginBottom: 8 }}
      >
        {label}
      </label>

      <div className="relative">
        <input
          id={id}
          name={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => onBlur?.(e.target.value)}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : helper ? `${id}-helper` : undefined}
          className={cx(
            "h-[54px] w-full rounded-lg border bg-surface px-4 text-[16px] text-ink outline-none transition-colors",
            Boolean(trailing) && "pr-12",
            error ? "border-accent" : "border-line focus:border-accent",
          )}
          style={tracked && value ? { letterSpacing: "0.26em" } : undefined}
          {...rest}
        />
        {trailing && <span className="absolute right-[6px] top-0">{trailing}</span>}
      </div>

      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[12px] text-accent">
          {error}
        </p>
      ) : helper ? (
        <p id={`${id}-helper`} className="mt-2 text-[12px] text-faint">
          {helper}
        </p>
      ) : null}
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
    return "Confirm your email address before logging in.";
  }
  if (normalised.includes("fetch") || normalised.includes("network")) {
    return "We could not reach the server. Check your connection and try again.";
  }
  return message;
}
