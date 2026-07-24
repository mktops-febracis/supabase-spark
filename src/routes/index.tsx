// Rota raiz: Editor Composável (Elementor) — único editor do app.
import { createFileRoute } from "@tanstack/react-router";
import { EditorShell } from "@/components/editor/EditorShell";
import { AuthGate } from "@/components/auth/AuthGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Febracis · Email Builder" },
      {
        name: "description",
        content:
          "Editor composável MC-safe para montar e-mails HTML prontos para o Salesforce Marketing Cloud.",
      },
      { property: "og:title", content: "Febracis · Email Builder" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AuthGate>
      <EditorShell />
    </AuthGate>
  );
}
