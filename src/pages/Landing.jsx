import { ArrowRight, BarChart3, ShieldCheck, Sparkles, Users, Mic, Brain, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTeacher } from "../context/TeacherContext";
import { useAuth } from "../context/AuthContext";
import { PageShell } from "../components/layout";

const featureHighlights = [
  {
    title: "Voice-First Workflow",
    description:
      "Log class progress in seconds with voice commands. Just say what you covered, and we'll update your syllabus tracker.",
    icon: Mic,
  },
  {
    title: "Unified Dashboard",
    description:
      "All your classes, syllabi, and analytics in one place. Track attendance, assignments, and curriculum coverage effortlessly.",
    icon: BarChart3,
  },
  {
    title: "Smart AI Suggestions",
    description:
      "Get intelligent recommendations for assignments, identify at-risk students, and receive lesson planning support.",
    icon: Brain,
  },
  {
    title: "Seamless Collaboration",
    description:
      "Share resources, chat with colleagues teaching the same course, and align on curriculum progress across sections.",
    icon: Share2,
  },
  {
    title: "Role-Based Access",
    description:
      "Teachers, HODs, and admins each get tailored views with the right permissions for their responsibilities.",
    icon: ShieldCheck,
  },
  {
    title: "Real-Time Insights",
    description:
      "Track syllabus coverage, attendance patterns, and student performance with live analytics and visual reports.",
    icon: Sparkles,
  },
];

const personaCards = [
  {
    persona: "teacher",
    heading: "For Teachers",
    blurb: "Streamline your daily workflow with voice logging, smart attendance tracking, and AI-powered lesson planning.",
    actionLabel: "Explore Teacher View",
    path: "/dashboard",
  },
  {
    persona: "hod",
    heading: "For HODs",
    blurb: "Monitor curriculum progress across sections, identify coverage gaps, and make data-driven decisions for exams.",
    actionLabel: "See HOD Dashboard",
    path: "/hod-dashboard",
  },
  {
    persona: "admin",
    heading: "For Admins",
    blurb: "Manage school-wide operations with centralized timetables, teacher assignments, and comprehensive audit trails.",
    actionLabel: "View Admin Panel",
    path: "/admin-dashboard",
  },
];

export default function Landing() {
  const navigate = useNavigate();
  const teacherCtx = useTeacher();

  const authCtx = useAuth();
  const handleExplore = (persona, path) => {
    teacherCtx?.setPersona?.(persona);
    if (authCtx?.user) {
      navigate(path);
    } else {
      navigate("/login");
    }
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <section className="py-20">
        <PageShell width="5xl">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-10">
            <div className="lg:max-w-xl space-y-6">
              <span className="inline-flex items-center gap-2 rounded-full bg-indigo-100 text-indigo-700 text-xs font-semibold px-4 py-1">
                <Sparkles className="h-3.5 w-3.5" />
                AI-Powered Teacher Assistant
              </span>
              <h1 className="text-4xl sm:text-5xl font-semibold text-slate-900 tracking-tight leading-tight">
                The AI-Powered Staffroom Teachers Deserve
              </h1>
              <p className="text-base text-slate-600 leading-relaxed">
                Streamline attendance, track curriculum, and collaborate — all in one intelligent workspace
                designed for educators. Spend less time on admin work and more time teaching.
              </p>
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleExplore("teacher", "/dashboard")}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 text-white text-sm font-medium shadow-md shadow-indigo-200 hover:bg-indigo-700 transition"
                >
                  Start Free Trial
                  <ArrowRight className="h-4 w-4" />
                </button>
                <button
                  onClick={() => {
                    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-indigo-200 text-indigo-700 text-sm font-medium hover:bg-indigo-50 transition"
                >
                  See How It Works
                </button>
              </div>
            </div>
            <div className="flex-1">
              <div className="relative rounded-3xl border border-indigo-100 bg-white shadow-xl shadow-indigo-100/40 p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-500 text-white grid place-items-center text-lg font-semibold">
                    S
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Staffroom</p>
                    <p className="text-xs text-slate-500">Built for educators, powered by AI</p>
                  </div>
                </div>
                <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-500">What You Get</p>
                  <ul className="text-sm text-slate-600 space-y-1">
                    <li>• Voice-powered syllabus tracking and attendance logging</li>
                    <li>• AI assistant for lesson planning and student insights</li>
                    <li>• Real-time collaboration with fellow teachers</li>
                    <li>• Comprehensive analytics and progress reports</li>
                  </ul>
                </div>
                <div className="flex items-center gap-3 text-xs text-slate-500">
                  <Users className="h-4 w-4" />
                  Join educators streamlining their workflow with Staffroom
                </div>
              </div>
            </div>
          </div>
        </PageShell>
      </section>

      <section id="features" className="py-16 bg-white">
        <PageShell width="6xl">
          <div className="text-center mb-10">
            <p className="text-xs uppercase tracking-widest text-indigo-600 mb-2">Features</p>
            <h2 className="text-3xl font-semibold text-slate-900">Everything you need to teach smarter</h2>
            <p className="text-sm text-slate-500 mt-2 max-w-2xl mx-auto">
              Staffroom brings together attendance, curriculum tracking, and collaboration into one seamless experience
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featureHighlights.map((feature) => {
              const Icon = feature.icon;
              return (
                <div key={feature.title} className="sc-card h-full space-y-3 hover:shadow-lg transition-shadow">
                  <div className="h-10 w-10 rounded-xl bg-indigo-100 grid place-items-center">
                    <Icon className="h-5 w-5 text-indigo-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-800">{feature.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </PageShell>
      </section>

      <section className="py-16">
        <PageShell width="6xl">
          <div className="mb-8 text-center space-y-2">
            <p className="text-xs uppercase tracking-widest text-indigo-600">Explore by Role</p>
            <h2 className="text-3xl font-semibold text-slate-900">Built for every stakeholder</h2>
            <p className="text-sm text-slate-500">See how Staffroom adapts to your role in the school</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {personaCards.map((card) => (
              <div key={card.persona} className="sc-card border border-indigo-100 bg-white flex flex-col gap-4 hover:shadow-lg transition-shadow">
                <div>
                  <h3 className="text-lg font-semibold text-slate-800">{card.heading}</h3>
                  <p className="text-sm text-slate-600 mt-2 leading-relaxed">{card.blurb}</p>
                </div>
                <button
                  onClick={() => handleExplore(card.persona, card.path)}
                  className="mt-auto inline-flex items-center gap-2 self-start px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition"
                >
                  {card.actionLabel}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </PageShell>
      </section>

      <section className="py-16 bg-gradient-to-br from-indigo-50 to-white">
        <PageShell width="4xl">
          <div className="text-center space-y-6">
            <h2 className="text-3xl font-semibold text-slate-900">Ready to transform your teaching workflow?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">
              Start your free trial today and experience how AI can help you focus on what matters most — your students.
            </p>
            <button
              onClick={() => handleExplore("teacher", "/dashboard")}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white text-base font-medium shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition"
            >
              Get Started Now
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </PageShell>
      </section>
    </div>
  );
}
