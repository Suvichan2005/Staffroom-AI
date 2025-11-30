import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useTeacher } from "../context/TeacherContext";
import { useAuth } from "../context/AuthContext";
import { PageShell } from "../components/layout";

export default function Register() {
  const teacherCtx = useTeacher();
  const { registerWithEmail, loginWithGoogle } = useAuth();
  const navigate = useNavigate();

  if (!teacherCtx) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Register (Context not initialized)</h1>
        <p className="text-sm text-red-600 mt-2">Teacher context missing.</p>
      </div>
    );
  }

  const { setTeacher, mapAuthUserToTeacher } = teacherCtx;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);

  async function handleRegister(e) {
    e.preventDefault();
    setError("");
    setValidationErrors([]);
    // Basic validation
    const errors = [];
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRe.test(email)) errors.push("Enter a valid email address.");
    if (password.length < 8) errors.push("Password must be at least 8 characters.");
    if (password !== confirm) errors.push("Passwords do not match.");
    if (errors.length) {
      setValidationErrors(errors);
      return;
    }
    setLoading(true);
    try {
      const cred = await registerWithEmail(email, password);
      const user = cred?.user;
      if (user && mapAuthUserToTeacher) mapAuthUserToTeacher(user.uid, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError("");
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      const user = result?.user;
      if (user && mapAuthUserToTeacher) mapAuthUserToTeacher(user.uid, user);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message || "Google sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageShell width="sm" className="min-h-screen flex flex-col justify-center">
      <div className="sc-card">
        <h1 className="text-2xl font-semibold mb-4">Create an account</h1>
        <p className="text-sm text-black-600 mb-6">Register with email/password or Google.</p>

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

        {validationErrors.length > 0 && (
          <div className="mt-3 text-sm text-red-600">
            {validationErrors.map((v, i) => (
              <div key={i}>{v}</div>
            ))}
          </div>
        )}

        <button
          onClick={handleGoogleRegister}
          disabled={loading}
          className="w-full mb-4 px-4 py-2 rounded-lg bg-white border border-black-200 text-sm font-medium flex items-center justify-center gap-3 hover:shadow"
        >
          <svg width="18" height="18" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg" className="inline-block">
            <path fill="#4285f4" d="M533.5 278.4c0-17.4-1.4-34.1-4-50.4H272v95.4h147.4c-6.4 34.3-25.9 63.4-55.5 82.9v68h89.5c52.3-48.2 82.1-119.3 82.1-196z"/>
            <path fill="#34a853" d="M272 544.3c73.6 0 135.6-24.3 180.8-66l-89.5-68c-24.9 16.7-56.7 26.6-91.3 26.6-70 0-129.4-47.3-150.6-110.9H31.1v69.6C76.8 487.5 168 544.3 272 544.3z"/>
            <path fill="#fbbc04" d="M121.4 325.9c-11.3-33.5-11.3-69.6 0-103.1V153.2H31.1c-39.2 76.3-39.2 166.6 0 242.9l90.3-70.2z"/>
            <path fill="#ea4335" d="M272 107.7c39.9 0 75.8 13.7 104 40.5l78-78C404.9 24 342.9 0 272 0 168 0 76.8 56.8 31.1 153.2l90.3 69.4C142.6 155 202 107.7 272 107.7z"/>
          </svg>
          <span className="text-black-700">Sign up with Google</span>
        </button>

        <form onSubmit={handleRegister} className="flex flex-col gap-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="px-3 py-2 border rounded"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="px-3 py-2 border rounded"
          />
          <input
            type="password"
            placeholder="Confirm password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            className="px-3 py-2 border rounded"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium"
          >
            Create account
          </button>
        </form>

        <div className="mt-4 text-sm">
          <Link to="/login" className="text-indigo-600 hover:underline">Already have an account? Sign in</Link>
        </div>
      </div>
    </PageShell>
  );
}
