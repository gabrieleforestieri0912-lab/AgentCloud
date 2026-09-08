import { redirect } from "next/navigation";

// Unificata con /account — redirect permanente per retrocompatibilità
export default function SettingsPage() {
  redirect("/account");
}
