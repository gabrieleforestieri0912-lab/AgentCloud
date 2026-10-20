import React, { useEffect, useState } from "react";
import { Box, Text } from "ink";
import { theme } from "./theme.js";

const FRAMES = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

/** Spinner a caratteri con testo di stato ("sto cercando prodotti…"). */
export function Spinner({ label }: { label: string }) {
  const [frame, setFrame] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setFrame((f) => (f + 1) % FRAMES.length), 80);
    return () => clearInterval(t);
  }, []);
  return (
    <Box>
      <Text color={theme.primary}>{FRAMES[frame]}</Text>
      <Text> </Text>
      <Text color={theme.muted}>{label}</Text>
    </Box>
  );
}
