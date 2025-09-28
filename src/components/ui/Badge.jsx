import React from "react";

export default function Badge({ children }) {
  return (
    <span className="ml-2 rounded-full px-2 py-0.5 text-xs border border-neutral-300 dark:border-neutral-700">
      {children}
    </span>
  );
}
