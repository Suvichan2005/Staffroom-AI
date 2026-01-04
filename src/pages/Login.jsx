import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTeacher } from "../context/TeacherContext";
import { useAuth } from '../context/AuthContext';
import { PageShell } from "../components/layout";

export default function Login() {
  const teacherCtx = useTeacher();
  const { loginWithGoogle, loginWithEmail } = useAuth();
  const navigate = useNavigate();

  if (!teacherCtx) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Login (Context not initialized)</h1>
        <p className="text-sm text-red-600 mt-2">Teacher context missing.</p>
      </div>
    );
  }

  const { mapAuthUserToTeacher } = teacherCtx;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

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

  async function handleEmailLogin(e) {
    e.preventDefault();
    setError("");
    setValidationErrors([]);

    // Basic client-side validation
    const errors = [];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) errors.push("Enter a valid email address.");
    if (!password || password.length < 6) errors.push("Password must be at least 6 characters.");
    if (errors.length) {
      setValidationErrors(errors);
      return setLoading(false);
    }
    setLoading(true);
    try {
      const cred = await loginWithEmail(email, password);
      const user = cred?.user;
      if (user && mapAuthUserToTeacher) {
        mapAuthUserToTeacher(user.uid, user);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Email sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell width="sm" className="min-h-screen flex flex-col justify-center">
      <div className="sc-card">
        <h1 className="text-2xl font-semibold mb-4">Staffroom – Login</h1>
        <p className="text-sm text-slate-600 mb-6">Sign in to access your personalized demo workspace.</p>

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        {/* Recommended: Google Login */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-5">
          <p className="text-sm font-medium text-green-800 mb-2">✨ Recommended: Sign in with Google</p>
          <p className="text-xs text-green-700">Each Google account gets its own isolated demo workspace. Your chat history, syllabus progress, and attendance changes are private to you.</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full mb-4 px-4 py-3 rounded-lg bg-white border-2 border-indigo-500 text-sm font-semibold flex items-center justify-center gap-3 hover:shadow-md hover:bg-indigo-50 transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" className="inline-block">
            <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.4-34.1-4-50.4H272v95.4h147.4c-6.4 34.3-25.9 63.4-55.5 82.9v68h89.5c52.3-48.2 82.1-119.3 82.1-196z"/>
            <path fill="#34a853" d="M272 544.3c73.6 0 135.6-24.3 180.8-66l-89.5-68c-24.9 16.7-56.7 26.6-91.3 26.6-70 0-129.4-47.3-150.6-110.9H31.1v69.6C76.8 487.5 168 544.3 272 544.3z"/>
            <path fill="#fbbc04" d="M121.4 325.9c-11.3-33.5-11.3-69.6 0-103.1V153.2H31.1c-39.2 76.3-39.2 166.6 0 242.9l90.3-70.2z"/>
            <path fill="#ea4335" d="M272 107.7c39.9 0 75.8 13.7 104 40.5l78-78C404.9 24 342.9 0 272 0 168 0 76.8 56.8 31.1 153.2l90.3 69.4C142.6 155 202 107.7 272 107.7z"/>
          </svg>
          <span className="text-indigo-700">Sign in with Google</span>
        </button>

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-slate-500">Or sign in with email</span>
          </div>
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2 border rounded text-sm"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-3 py-2 border rounded text-sm"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-slate-600 hover:bg-slate-700 text-white text-sm font-medium"
          >
            Sign in with Email
          </button>
        </form>

        {validationErrors.length > 0 && (
          <div className="mt-3 text-sm text-red-600">
            {validationErrors.map((v, i) => (
              <div key={i}>{v}</div>
            ))}
          </div>
        )}

        <div className="mt-4 text-sm flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Link to="/register" className="text-indigo-600 hover:underline">Create account</Link>
          </div>
        </div>
      </div>
    </PageShell>
  );
}
