import React from "react";

export default function ChatBox({ messages = [] }) {
  return (
    <div className="bg-neutral-50 border rounded-lg p-3 h-60 overflow-y-auto mt-4">
      {messages.length === 0 && (
        <p className="text-neutral-400 italic">No messages yet</p>
      )}
      {messages.map((m, i) => (
        <div key={i} className={`my-2 ${m.sender === "AI" ? "text-indigo-700" : "text-neutral-800"}`}>
          <strong>{m.sender}:</strong> {m.text}
        </div>
      ))}
    </div>
  );
}
