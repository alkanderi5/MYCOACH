"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check } from "@phosphor-icons/react";
import { Button, ErrorNote } from "./ui";
import { createClient } from "@/lib/supabase/client";
import { activateProgram } from "@/lib/programs";

/** Saving a program makes it the active one. Switching never deletes the
 *  history of the program you were following before. */
export function ActivateButton({
  trainingProgramId,
  isActive,
  label = "Use this program",
}: {
  trainingProgramId: string;
  isActive: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function activate() {
    if (busy || isActive) return;
    setBusy(true);
    setError("");

    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setBusy(false);
      setError("Your session expired. Sign in again.");
      return;
    }

    const writeError = await activateProgram(supabase, user.id, trainingProgramId);
    setBusy(false);

    if (writeError) {
      setError(`That did not save: ${writeError.message}`);
      return;
    }

    router.refresh();
    router.push("/home");
  }

  if (isActive) {
    return (
      <p className="flex items-center gap-2 text-[13px] text-made">
        <Check size={15} weight="bold" />
        This is your active program
      </p>
    );
  }

  return (
    <>
      <Button onClick={activate} disabled={busy} className="w-full">
        {busy ? "Saving…" : label}
      </Button>
      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </>
  );
}
