import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useTeacher } from "../context/TeacherContext";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const teacherCtx = useTeacher();
  const { loginWithGoogle, loginWithEmail, registerWithEmail } = useAuth();
  const navigate = useNavigate();

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!teacherCtx) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <p className="text-red-600">Loading...</p>
        </div>
      </div>
    );
  }

  const { mapAuthUserToTeacher } = teacherCtx;

  async function handleGoogleLogin() {
    setError("");
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      const user = result?.user;
      if (user && mapAuthUserToTeacher) {
        mapAuthUserToTeacher(user.uid, user);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let cred;
      if (isRegistering) {
        cred = await registerWithEmail(email, password);
      } else {
        cred = await loginWithEmail(email, password);
      }
      const user = cred?.user;
      if (user && mapAuthUserToTeacher) {
        mapAuthUserToTeacher(user.uid, user);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-indigo-50 flex flex-col items-center justify-center p-6">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-8"
      >
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
          <span className="text-white font-bold text-xl">S</span>
        </div>
        <span className="text-2xl font-bold text-neutral-800">Staffroom</span>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-neutral-200/50 p-8"
      >
        <h1 className="text-xl font-bold text-neutral-800 text-center mb-2">
          Welcome back
        </h1>
        <p className="text-sm text-neutral-500 text-center mb-6">
          Sign in to access your dashboard
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Google Button - Primary */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white border-2 border-neutral-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all font-medium text-neutral-700 mb-4"
        >
          <svg width="20" height="20" viewBox="0 0 533.5 544.3">
            <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.4-34.1-4-50.4H272v95.4h147.4c-6.4 34.3-25.9 63.4-55.5 82.9v68h89.5c52.3-48.2 82.1-119.3 82.1-196z"/>
            <path fill="#34a853" d="M272 544.3c73.6 0 135.6-24.3 180.8-66l-89.5-68c-24.9 16.7-56.7 26.6-91.3 26.6-70 0-129.4-47.3-150.6-110.9H31.1v69.6C76.8 487.5 168 544.3 272 544.3z"/>
            <path fill="#fbbc04" d="M121.4 325.9c-11.3-33.5-11.3-69.6 0-103.1V153.2H31.1c-39.2 76.3-39.2 166.6 0 242.9l90.3-70.2z"/>
            <path fill="#ea4335" d="M272 107.7c39.9 0 75.8 13.7 104 40.5l78-78C404.9 24 342.9 0 272 0 168 0 76.8 56.8 31.1 153.2l90.3 69.4C142.6 155 202 107.7 272 107.7z"/>
          </svg>
          Continue with Google
        </button>

        {/* Email Toggle */}
        <button
          onClick={() => setShowEmailForm(!showEmailForm)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
        >
          {showEmailForm ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          {showEmailForm ? "Hide email login" : "Use email instead"}
        </button>

        {/* Email Form - Collapsed by Default */}
        <AnimatePresence>
          {showEmailForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              onSubmit={handleEmailSubmit}
              className="overflow-hidden"
            >
              <div className="pt-4 space-y-3">
                <input
                  type="email"
                  placeholder="Email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-3 border border-neutral-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition-all"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-neutral-800 hover:bg-neutral-900 text-white font-medium text-sm transition-colors"
                >
                  {isRegistering ? "Create Account" : "Sign In"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsRegistering(!isRegistering)}
                  className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700"
                >
                  {isRegistering ? "Already have an account? Sign in" : "Need an account? Register"}
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Back Link */}
      <button
        onClick={() => navigate("/")}
        className="mt-6 text-sm text-neutral-500 hover:text-neutral-700 transition-colors"
      >
         Back to home
      </button>
    </div>
  );
}
