import { SessionWizardProvider } from "@/components/sessions/session-wizard-context";

export default function NewSessionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SessionWizardProvider>{children}</SessionWizardProvider>;
}
