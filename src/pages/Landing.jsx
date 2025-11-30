import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  ArrowRight, 
  Mic, 
  Brain, 
  BarChart3, 
  Users,
  Sparkles,
  CheckCircle2
} from "lucide-react";

export default function Landing() {
  const navigate = useNavigate();

  const features = [
    {
      icon: Mic,
      title: "Voice-First Workflow",
      description: "Say 'I finished Chapter 4 in 6A Geography' and watch your progress update instantly.",
      color: "indigo"
    },
    {
      icon: Brain,
      title: "AI Teaching Assistant",
      description: "Get smart suggestions for quizzes, identify at-risk students, and plan lessons effortlessly.",
      color: "purple"
    },
    {
      icon: BarChart3,
      title: "Real-Time Analytics",
      description: "Track syllabus coverage, attendance patterns, and student performance at a glance.",
      color: "indigo"
    },
    {
      icon: Users,
      title: "Team Collaboration",
      description: "Share resources, coordinate with colleagues, and align curriculum across sections.",
      color: "purple"
    }
  ];

  const benefits = [
    "Save hours of manual work weekly",
    "Voice-powered tracking",
    "AI-generated quizzes",
    "At-risk student alerts"
  ];

  const getColorClasses = (color) => {
    switch (color) {
      case 'green': return 'bg-green-100 text-green-600';
      case 'purple': return 'bg-purple-100 text-purple-600';
      case 'blue': return 'bg-blue-100 text-blue-600';
      case 'yellow': return 'bg-yellow-100 text-yellow-600';
      default: return 'bg-indigo-100 text-indigo-600';
    }
  };

  return (
    <div className="min-h-screen bg-black-50">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-28 z-50 bg-white/80 backdrop-blur-md border-b border-black-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center j ustify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                <span className="text-white font-bold text-lg">S</span>
              </div>
              <span className="text-xl font-bold text-black-800">Staffroom</span>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-8"
            >
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-indigo-100 text-indigo-700 text-sm font-medium">
                  <Sparkles className="w-4 h-4" />
                  AI-Powered Teacher Assistant
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-black-900 leading-tight">
                  The Staffroom
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600"> Teachers </span>
                  Deserve
                </h1>
                <p className="text-lg text-black-600 leading-relaxed max-w-xl">
                  Streamline attendance, track curriculum, and get AI-powered insights — all through voice commands. 
                  Spend less time on paperwork, more time teaching.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 text-white font-semibold text-base hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-200 hover:shadow-2xl hover:shadow-indigo-300"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Benefits */}
              <div className="grid grid-cols-2 gap-3 pt-4">
                {benefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-black-600">
                    <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Right - Preview Card */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="relative rounded-3xl bg-white border border-black-200 shadow-2xl shadow-black-200/50 p-6 space-y-5">
                {/* Mini Dashboard Preview */}
                <div className="flex items-center gap-3 pb-4 border-b border-black-100">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center">
                    <span className="text-white font-bold text-xl">MA</span>
                  </div>
                  <div>
                    <p className="font-semibold text-black-800">Mr. Agarwal</p>
                    <p className="text-sm text-black-500">Geography Teacher</p>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-black-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-indigo-600">6</p>
                    <p className="text-xs text-black-500">Classes</p>
                  </div>
                  <div className="bg-black-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-green-600">78%</p>
                    <p className="text-xs text-black-500">Syllabus</p>
                  </div>
                  <div className="bg-black-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-yellow-600">94%</p>
                    <p className="text-xs text-black-500">Attendance</p>
                  </div>
                </div>

                {/* Voice Input Preview */}
                <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 border border-indigo-100">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                      <Mic className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-black-700">Voice Command</p>
                      <p className="text-xs text-black-500">Tap to speak</p>
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-3 border border-black-200">
                    <p className="text-sm text-black-600 italic">
                      "I finished Chapter 4, Landforms in 6A Geography"
                    </p>
                  </div>
                </div>

                {/* AI Suggestion */}
                <div className="flex items-start gap-3 p-3 bg-green-50 rounded-xl border border-green-100">
                  <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
                    <Brain className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-green-800">AI Suggestion</p>
                    <p className="text-xs text-green-600">Next: Chapter 5 - Climate. Estimated 3 classes.</p>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -z-10 top-8 -right-4 w-72 h-72 bg-indigo-200 rounded-full blur-3xl opacity-30" />
              <div className="absolute -z-10 -bottom-8 -left-4 w-72 h-72 bg-purple-200 rounded-full blur-3xl opacity-30" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 sm:px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">Features</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-black-900 mb-4">
              Everything you need to teach smarter
            </h2>
            <p className="text-lg text-black-600 max-w-2xl mx-auto">
              Staffroom brings together attendance, curriculum tracking, and AI assistance 
              into one seamless experience designed for educators.
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-black-50 rounded-2xl p-6 hover:bg-white hover:shadow-xl hover:shadow-black-200/50 transition-all border border-transparent hover:border-black-200"
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${getColorClasses(feature.color)}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold text-black-800 mb-2">{feature.title}</h3>
                  <p className="text-sm text-black-600 leading-relaxed">{feature.description}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <p className="text-sm font-semibold text-indigo-600 uppercase tracking-wider mb-2">How It Works</p>
            <h2 className="text-3xl sm:text-4xl font-bold text-black-900 mb-4">
              Simplify your teaching workflow
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "1", icon: Mic, title: "Speak", desc: "Use voice commands to log attendance, update progress, or ask questions." },
              { step: "2", icon: Brain, title: "AI Processes", desc: "Our AI understands context and updates your data automatically." },
              { step: "3", icon: BarChart3, title: "Insights Ready", desc: "Get real-time analytics, suggestions, and reports instantly." }
            ].map((item, i) => (
              <motion.div
                key={item.step}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative pt-4"
              >
                {/* Step Number */}
                <div className="absolute top-0 -translate-x-1/2 w-8 h-8 rounded-full bg-indigo-600 text-white text-sm font-bold flex items-center justify-center z-10 shadow-lg">
                  {item.step}
                </div>
                <div className="bg-white rounded-2xl border border-black-200 p-6 pt-8 text-center hover:shadow-lg transition-shadow">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4">
                    <item.icon className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold text-black-800 mb-2">{item.title}</h3>
                  <p className="text-sm text-black-600">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-3xl p-8 sm:p-12 text-center relative overflow-hidden"
          >
            {/* Decorative circles */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-purple-400/20 rounded-full blur-3xl" />
            
            <div className="relative z-10">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ready to transform your teaching?
              </h2>
              <p className="text-lg text-indigo-100 mb-8 max-w-xl mx-auto">
                Join educators who are saving hours every week with Staffroom's 
                AI-powered workflow automation.
              </p>
              <button
                onClick={() => navigate("/login")}
                className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-white text-indigo-600 font-semibold text-base hover:bg-indigo-50 transition-colors shadow-xl"
              >
                Login to Staffroom
                <ArrowRight className="w-5 h-5" />
              </button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 sm:px-6 border-t border-black-200">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <span className="text-sm font-semibold text-black-700">Staffroom</span>
          </div>
          <p className="text-sm text-black-500">
            © 2025 Staffroom. Built for educators, powered by AI.
          </p>
        </div>
      </footer>
    </div>
  );
}
