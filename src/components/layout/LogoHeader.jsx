import React from "react";

export default function LogoHeader({ title }) {
  return (
    <div className="relative overflow-hidden rounded-b-3xl" aria-label="Header">
      <div className="bg-gradient-to-b from-blue-200 to-blue-50 h-28 sm:h-32 w-full" />
      <div className="absolute inset-0 flex items-center gap-3 px-6">
        <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg bg-gradient-to-br from-indigo-500 to-blue-500 text-white grid place-items-center text-xl font-bold">
          S
        </div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-neutral-800">
          {title}
        </h1>
      </div>
    </div>
  );
}
