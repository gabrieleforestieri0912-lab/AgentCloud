import WaitlistForm from "@/components/WaitlistForm";
import { MAX_SPOTS, getRemainingSpots } from "@/lib/waitlist";

// Pagina waitlist: server component che legge il conteggio autoritativo dei
// posti rimasti dal DB (con fallback a MAX_SPOTS in caso di errore) e lo passa
// al form client, così il numero è corretto già al primo render — niente
// fuorviante flash "10/10" al refresh.
async function getInitialRemaining(): Promise<number> {
  try {
    return await getRemainingSpots();
  } catch {
    return MAX_SPOTS;
  }
}

export default async function WaitlistPage() {
  const initialRemaining = await getInitialRemaining();
  return <WaitlistForm initialRemaining={initialRemaining} />;
}