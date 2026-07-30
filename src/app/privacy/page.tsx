import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy | AgentCloud",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-neutral-950">
      <Navbar />
      <section className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <Link
            href="/"
            className="mb-8 inline-flex text-sm font-semibold text-neutral-400 hover:text-white"
          >
            &larr; Back to home
          </Link>
          <h1 className="mb-8 text-4xl font-bold tracking-tight text-white">
            Privacy Policy
          </h1>
          <div className="prose prose-invert max-w-none space-y-6 text-neutral-400">
            <p>Last updated: July 2026</p>

            <h2 className="text-xl font-bold text-white">
              1. Information We Collect
            </h2>
            <p>
              When you sign up for AgentCloud, we collect your name and email
              address. We use Clerk for authentication, which processes your
              email for magic link login. We do not store passwords.
            </p>
            <p>
              When you submit a demo request, we collect your name, surname, and
              email to contact you about our services.
            </p>

            <h2 className="text-xl font-bold text-white">
              2. How We Use Your Data
            </h2>
            <p>
              We use your data to provide and improve AgentCloud services,
              process transactions via Stripe, send you transactional emails
              (welcome, billing, support), and communicate about your account.
            </p>
            <p>We never sell your personal data to third parties.</p>

            <h2 className="text-xl font-bold text-white">3. Data Sharing</h2>
            <p>We share data only with essential service providers:</p>
            <ul className="list-disc pl-6">
              <li>
                <strong>Clerk</strong> — authentication and user management
              </li>
              <li>
                <strong>Stripe</strong> — payment processing
              </li>
              <li>
                <strong>Supabase</strong> — database hosting
              </li>
              <li>
                <strong>Resend</strong> — transactional email delivery
              </li>
            </ul>

            <h2 className="text-xl font-bold text-white">4. Data Retention</h2>
            <p>
              We retain your data for as long as your account is active. You may
              request deletion of your account and associated data at any time
              by contacting us.
            </p>

            <h2 className="text-xl font-bold text-white">5. Your Rights</h2>
            <p>
              Under GDPR, you have the right to access, rectify, or erase your
              personal data. You may also restrict or object to processing, and
              request data portability. To exercise these rights, contact us at
              privacy@agentcloud.io.
            </p>

            <h2 className="text-xl font-bold text-white">6. Contact</h2>
            <p>
              For privacy-related inquiries:{" "}
              <strong>privacy@agentcloud.io</strong>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
