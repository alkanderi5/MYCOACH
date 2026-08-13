import { AuthForm } from "@/components/AuthForm";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reason?: string }>;
}) {
  const { next, reason } = await searchParams;

  const notice =
    reason === "unreachable"
      ? "We could not reach the server to check your session, so you were signed out here. Check your connection and try again."
      : undefined;

  return <AuthForm mode="login" next={next} notice={notice} />;
}
