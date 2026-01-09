import React from "react";

export default function PageShell({ children, width = "6xl", className = "" }) {
  const maxw = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "3xl": "max-w-3xl",
    "4xl": "max-w-4xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  }[width] || "max-w-6xl";
  return (
    <div className={`${maxw} mx-auto px-4 sm:px-6 py-4 sm:py-6 ${className}`}>
      {children}
    </div>
  );
}
