import WaitlistForm from "@/components/WaitlistForm";
import { getTotalCount } from "@/lib/waitlist";

async function getInitialTotal(): Promise<number> {
  try {
    return await getTotalCount();
  } catch {
    return 0;
  }
}

export default async function WaitlistPage() {
  const initialTotal = await getInitialTotal();
  return <WaitlistForm initialTotal={initialTotal} />;
}
