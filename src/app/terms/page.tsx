import type { Metadata } from "next";
import Link from "next/link";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "Terms of Service | AgentCloud",
};

export default function TermsPage() {
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
            Terms of Service
          </h1>
          <div className="prose prose-invert max-w-none space-y-6 text-neutral-400">
            <p>Last updated: July 2026</p>

            <h2 className="text-xl font-bold text-white">
              1. Acceptance of Terms
            </h2>
            <p>
              By accessing or using AgentCloud (&ldquo;the Service&rdquo;), you
              agree to be bound by these Terms of Service. If you do not agree,
              do not use the Service.
            </p>

            <h2 className="text-xl font-bold text-white">
              2. Description of Service
            </h2>
            <p>
              AgentCloud provides AI agent deployment and management services.
              We offer subscription-based access to pre-built AI agents that
              automate business workflows.
            </p>

            <h2 className="text-xl font-bold text-white">
              3. Account Registration
            </h2>
            <p>
              You must provide a valid email address to create an account. You
              are responsible for maintaining the confidentiality of your
              account access. Authentication is handled via Clerk using magic
              link email verification.
            </p>

            <h2 className="text-xl font-bold text-white">
              4. Subscriptions and Billing
            </h2>
            <p>
              Subscription fees are billed monthly via Stripe. All prices are in
              EUR and exclusive of applicable taxes. You may cancel your
              subscription at any time. Cancellation takes effect at the end of
              the current billing period.
            </p>

            <h2 className="text-xl font-bold text-white">5. Acceptable Use</h2>
            <p>You agree not to:</p>
            <ul className="list-disc pl-6">
              <li>Use the Service for any illegal purpose</li>
              <li>Attempt to bypass authentication or access controls</li>
              <li>
                Reverse-engineer, decompile, or extract the source code of our
                agents
              </li>
              <li>
                Use the Service to generate spam, harassment, or harmful content
              </li>
            </ul>

            <h2 className="text-xl font-bold text-white">
              6. Limitation of Liability
            </h2>
            <p>
              AgentCloud is provided &ldquo;as is&rdquo; without warranty of any
              kind. We are not liable for any damages arising from the use of AI
              agents, including but not limited to data loss, business
              interruption, or incorrect automated decisions.
            </p>

            <h2 className="text-xl font-bold text-white">
              7. Changes to Terms
            </h2>
            <p>
              We may update these terms at any time. Continued use of the
              Service after changes constitutes acceptance of the new terms.
            </p>

            <h2 className="text-xl font-bold text-white">8. Contact</h2>
            <p>
              For questions about these terms:{" "}
              <strong>legal@agentcloud.io</strong>
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
