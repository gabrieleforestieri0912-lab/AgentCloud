import { redirect } from "next/navigation";

// Trial rimosso: chi si iscrive alla waitlist è già autenticato al lancio.
// Questa pagina reindirizza a /dashboard (o /agents se non loggato via proxy).
export default function SelectAgentPage() {
  redirect("/dashboard");
}
