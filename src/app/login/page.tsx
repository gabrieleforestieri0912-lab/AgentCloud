"use client";

import { SignIn } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-black">
      <Navbar />
      <section className="flex min-h-[calc(100vh-5rem)] items-center justify-center px-4 pt-24">
        <div className="w-full max-w-md">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              Welcome back
            </h1>
            <p className="mt-2 text-neutral-400">
              Enter your email to receive a magic link
            </p>
          </div>
          <SignIn forceRedirectUrl="/dashboard" signUpUrl="/signup" />
        </div>
      </section>
    </main>
  );
}
