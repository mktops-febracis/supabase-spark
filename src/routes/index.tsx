import { createFileRoute } from "@tanstack/react-router";
import { EmailEditor } from "@/components/email-editor/EmailEditor";
import { AuthGate } from "@/components/auth/AuthGate";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Febracis · Email Builder" },
      {
        name: "description",
        content:
          "Editor MC-safe para montar e-mails HTML prontos para o Salesforce Marketing Cloud a partir de blocos reutilizáveis.",
      },
      { property: "og:title", content: "Febracis · Email Builder" },
      {
        property: "og:description",
        content:
          "Editor MC-safe para montar e-mails HTML prontos para o Salesforce Marketing Cloud a partir de blocos reutilizáveis.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <AuthGate>
      <EmailEditor />
    </AuthGate>
  );
}
