import WaitlistForm from "@/components/WaitlistForm";
import { MAX_SPOTS, getRemainingSpots } from "@/lib/waitlist";

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
