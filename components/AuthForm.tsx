"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Eye, EyeSlash } from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import styles from "./auth.module.css";

type Mode = "login" | "signup";
type Status = "idle" | "submitting" | "error";

/** Deliberately loose — the server is the authority on what a real address is. */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 6;

const COPY = {
  login: {
    headline: "Rack up.",
    subhead: "Sign in and pick your drills up where you left them.",
    cta: "Break",
    switchText: "New to Mycoach?",
    switchCta: "Create an account",
    switchHref: "/signup",
  },
  signup: {
    headline: "Break in.",
    subhead: "Create your account and start recording your practice.",
    cta: "Start",
    switchText: "Already have an account?",
    switchCta: "Sign in",
    switchHref: "/login",
  },
} as const;

export function AuthForm({
  mode,
  next,
  notice,
}: {
  mode: Mode;
  next?: string;
  /** Set when the player was sent here by something other than signing out. */
  notice?: string;
}) {
  const router = useRouter();
  const copy = COPY[mode];

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [staySignedIn, setStaySignedIn] = useState(true);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Enter your email address.";
    if (!EMAIL_PATTERN.test(value.trim())) return "That doesn't look like an email address.";
    return "";
  };

  const validatePassword = (value: string) => {
    if (!value) return "Enter your password.";
    if (mode === "signup" && value.length < MIN_PASSWORD_LENGTH) {
      return `Use at least ${MIN_PASSWORD_LENGTH} characters.`;
    }
    return "";
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextEmailError = validateEmail(email);
    const nextPasswordError = validatePassword(password);
    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) {
      // Don't leave a previous attempt's auth error sitting above the CTA.
      setStatus("idle");
      setErrorMessage("");
      return;
    }

    setStatus("submitting");
    setErrorMessage("");

    const result = await signIn({ mode, email: email.trim(), password });

    if (!result.ok) {
      setStatus("error");
      setErrorMessage(result.message);
      return;
    }

    if (result.needsConfirmation) {
      setStatus("error");
      setErrorMessage("Check your inbox to confirm your address, then sign in.");
      return;
    }

    router.replace(next && next.startsWith("/") ? next : "/practice");
    router.refresh();
  }

  const submitting = status === "submitting";

  return (
    <main className={styles.screen}>
      <div className={styles.container}>
        <span className={styles.brand}>Mycoach</span>

        <h1 className={styles.headline}>{copy.headline}</h1>
        <p className={styles.subhead}>{copy.subhead}</p>

        {notice && (
          <p className={styles.authError} role="status">
            <span className={styles.authErrorRule} aria-hidden="true" />
            {notice}
          </p>
        )}

        {/* method="post" matters even though submission is handled in JS: if the
            bundle fails to load, a native submit would otherwise be a GET, which
            puts the password in the URL, the browser history and the server log. */}
        <form onSubmit={handleSubmit} method="post" noValidate>
          <div className={styles.fields}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="email">
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                spellCheck={false}
                className={`${styles.input} ${emailError ? styles.inputInvalid : ""}`}
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError) setEmailError("");
                }}
                onBlur={(e) => setEmailError(validateEmail(e.target.value))}
                aria-invalid={Boolean(emailError)}
                aria-describedby={emailError ? "email-error" : undefined}
              />
              {emailError && (
                <p className={styles.fieldMessage} id="email-error">
                  {emailError}
                </p>
              )}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="password">
                Password
              </label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                className={`${styles.input} ${styles.password} ${
                  passwordError ? styles.inputInvalid : ""
                }`}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError) setPasswordError("");
                }}
                aria-invalid={Boolean(passwordError)}
                aria-describedby={passwordError ? "password-error" : undefined}
              />
              <button
                type="button"
                className={styles.eye}
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeSlash size={20} /> : <Eye size={20} />}
              </button>
              {passwordError && (
                <p className={styles.fieldMessage} id="password-error">
                  {passwordError}
                </p>
              )}
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                className={styles.checkboxInput}
                checked={staySignedIn}
                onChange={(e) => setStaySignedIn(e.target.checked)}
              />
              <span className={styles.checkbox} aria-hidden="true">
                {staySignedIn && <Check size={10} weight="bold" />}
              </span>
              Stay signed in
            </label>

            {mode === "login" && (
              <Link className={styles.forgot} href="/login">
                Forgot?
              </Link>
            )}
          </div>

          {status === "error" && errorMessage && (
            <p className={styles.authError} role="alert">
              <span className={styles.authErrorRule} aria-hidden="true" />
              {errorMessage}
            </p>
          )}

          <button type="submit" className={styles.cta} disabled={submitting}>
            {copy.cta}
            {submitting ? (
              <span className={styles.spinner} aria-hidden="true" />
            ) : (
              <ArrowRight size={17} />
            )}
          </button>
        </form>

        <p className={styles.switchLine}>
          {copy.switchText}{" "}
          <Link className={styles.switchLink} href={copy.switchHref}>
            {copy.switchCta}
          </Link>
        </p>
      </div>
    </main>
  );
}

type SignInResult =
  | { ok: true; needsConfirmation: boolean }
  | { ok: false; message: string };

/** The single auth entry point — swap the body to change provider. */
async function signIn({
  mode,
  email,
  password,
}: {
  mode: Mode;
  email: string;
  password: string;
}): Promise<SignInResult> {
  const supabase = createClient();

  if (mode === "signup") {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) return { ok: false, message: friendlyError(error.message) };
    // With email confirmation on, Supabase returns a user but no session.
    return { ok: true, needsConfirmation: !data.session };
  }

  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { ok: false, message: friendlyError(error.message) };
  return { ok: true, needsConfirmation: false };
}

function friendlyError(message: string): string {
  const normalised = message.toLowerCase();
  if (normalised.includes("invalid login credentials")) {
    return "That email and password don't match an account.";
  }
  if (normalised.includes("already registered") || normalised.includes("already been registered")) {
    return "An account with that email already exists.";
  }
  if (normalised.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  return message;
}
