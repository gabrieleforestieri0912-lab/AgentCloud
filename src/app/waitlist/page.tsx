import WaitlistForm from "@/components/WaitlistForm";
import { MAX_SPOTS, getRemainingSpots } from "@/lib/waitlist";

// Server component: reads the authoritative remaining-spots count from the
// database (or falls back to MAX_SPOTS if the check fails in dev) and passes
// it to the client form, so the number is correct on the very first render —
// no misleading 10/10 flash on refresh.
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