import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, Sparkles, ChevronRight, 
  X, Mic, Calendar, CheckCircle2, ArrowRight
} from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';

const ONBOARDING_STORAGE_KEY = 'onboarding:completed';

/**
 * OnboardingWizard - A lightweight 3-step onboarding flow
 * 
 * Shows once for new users to explain core features:
 * 1. Welcome & context
 * 2. Core actions (Attendance, Syllabus, AI Assistant)
 * 3. Get started CTA
 */
export default function OnboardingWizard({ onComplete }) {
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    const completed = loadUserState(ONBOARDING_STORAGE_KEY, false);
    if (!completed) {
      // Small delay to not overwhelm immediately after login
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleComplete = () => {
    saveUserState(ONBOARDING_STORAGE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const steps = [
    {
      title: "Welcome to Staffroom AI",
      description: "Your intelligent teaching companion. Let's take 30 seconds to show you around.",
      icon: Sparkles,
      color: "indigo",
    },
    {
      title: "Your Core Actions",
      description: "Everything you need, accessible in 2 taps or less.",
      icon: CheckCircle2,
      color: "green",
      features: [
        { 
          icon: Users, 
          title: "Voice Attendance", 
          desc: "Call out names, we mark them present" 
        },
        { 
          icon: BookOpen, 
          title: "Syllabus Tracking", 
          desc: "Update progress with one click" 
        },
        { 
          icon: Mic, 
          title: "AI Assistant", 
          desc: "Ask anything, get instant answers" 
        },
      ],
    },
    {
      title: "You're All Set!",
      description: "Your dashboard shows today's classes and pending actions. Dive in whenever you're ready.",
      icon: Calendar,
      color: "purple",
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLastStep = step === steps.length - 1;

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-black-900/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className={`p-6 text-white ${
            currentStep.color === 'indigo' ? 'bg-gradient-to-br from-indigo-600 to-purple-700' :
            currentStep.color === 'green' ? 'bg-gradient-to-br from-green-600 to-emerald-700' :
            'bg-gradient-to-br from-purple-600 to-pink-700'
          }`}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{currentStep.title}</h2>
                  <p className="text-sm text-white/80 mt-1">{currentStep.description}</p>
                </div>
              </div>
              <button
                onClick={handleSkip}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                aria-label="Skip onboarding"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {currentStep.features && (
                  <div className="space-y-3 mb-6">
                    {currentStep.features.map((feature, idx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <div 
                          key={idx}
                          className="flex items-center gap-4 p-3 rounded-xl bg-black-50"
                        >
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FeatureIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-black-800">{feature.title}</p>
                            <p className="text-sm text-black-500">{feature.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {isLastStep && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-black-600">
                      Pro tip: Use the <span className="font-medium text-indigo-600">AI chat bar</span> at the bottom 
                      to ask questions like "What's my next class?"
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Step indicators */}
            <div className="flex items-center justify-center gap-2 mb-6">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === step 
                      ? 'w-8 bg-indigo-600' 
                      : idx < step 
                        ? 'w-4 bg-indigo-300' 
                        : 'w-4 bg-black-200'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-black-100 text-black-700 hover:bg-black-200 transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={() => {
                  if (isLastStep) {
                    handleComplete();
                  } else {
                    setStep(step + 1);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
              >
                {isLastStep ? (
                  <>
                    Get Started
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

            {/* Skip link */}
            {!isLastStep && (
              <button
                onClick={handleSkip}
                className="w-full mt-3 text-center text-sm text-black-400 hover:text-black-600 transition-colors"
              >
                Skip tour
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to check if onboarding was completed
 */
export function useOnboardingComplete() {
  const [completed, setCompleted] = useState(() => 
    loadUserState(ONBOARDING_STORAGE_KEY, false)
  );

  const markComplete = () => {
    saveUserState(ONBOARDING_STORAGE_KEY, true);
    setCompleted(true);
  };

  const reset = () => {
    saveUserState(ONBOARDING_STORAGE_KEY, false);
    setCompleted(false);
  };

  return { completed, markComplete, reset };
}
