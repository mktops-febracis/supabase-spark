import { createFileRoute } from "@tanstack/react-router";
import { EditorShell } from "@/components/editor/EditorShell";
import { AuthGate } from "@/components/auth/AuthGate";

export const Route = createFileRoute("/editor")({
  head: () => ({
    meta: [{ title: "Febracis · Editor composável" }],
  }),
  component: EditorPage,
});

function EditorPage() {
  return (
    <AuthGate>
      <EditorShell />
    </AuthGate>
  );
}
