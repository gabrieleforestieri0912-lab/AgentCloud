"use client";

import { motion } from "framer-motion";

type LoadingSpinnerProps = {
  size?: "sm" | "md" | "lg";
  text?: string;
};

export default function LoadingSpinner({
  size = "md",
  text,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center gap-3">
      <motion.div
        className={`${sizeClasses[size]} rounded-full border-2 border-neutral-700 border-t-brand-500`}
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      {text && (
        <p className="text-sm font-semibold text-neutral-400">{text}</p>
      )}
    </div>
  );
}
