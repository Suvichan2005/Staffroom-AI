import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Mic, BookOpen, Sparkles, ArrowRight } from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    { icon: Mic, label: "Voice-first" },
    { icon: BookOpen, label: "Smart tracking" },
    { icon: Sparkles, label: "AI assistant" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50 flex flex-col">
      {/* Main Content - Single Viewport */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 mb-12"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
            <span className="text-white font-bold text-xl">S</span>
          </div>
          <span className="text-2xl font-bold text-neutral-800">Staffroom</span>
        </motion.div>

        {/* Hero Text */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="text-center max-w-lg mb-10"
        >
          <h1 className="text-4xl sm:text-5xl font-bold text-neutral-900 mb-4 leading-tight">
            The Staffroom
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              Teachers Deserve
            </span>
          </h1>
          <p className="text-lg text-neutral-600">
            Voice-powered attendance and syllabus tracking that saves you 30 minutes every day.
          </p>
        </motion.div>

        {/* CTA Button */}
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          onClick={() => navigate("/login")}
          className="flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-lg shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300 transition-all hover:scale-105 mb-12"
        >
          Continue with Google
          <ArrowRight className="w-5 h-5" />
        </motion.button>

        {/* Feature Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="flex flex-wrap justify-center gap-3"
        >
          {features.map((feature, i) => {
            const Icon = feature.icon;
            return (
              <div
                key={i}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-neutral-200 shadow-sm"
              >
                <Icon className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-neutral-700">{feature.label}</span>
              </div>
            );
          })}
        </motion.div>
      </div>

      {/* Minimal Footer */}
      <footer className="py-6 text-center">
        <p className="text-sm text-neutral-400">
          Built for teachers, by teachers
        </p>
      </footer>
    </div>
  );
}
