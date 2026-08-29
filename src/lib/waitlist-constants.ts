// Client-safe waitlist constants. Kept separate from waitlist.ts (which pulls
// in server-only Supabase code) so the waitlist page — a client component —
// can import the cap without dragging server code into the client bundle.
// Total available waitlist spots (mirrors the DB-driven cap everywhere).
export const MAX_SPOTS = 10;