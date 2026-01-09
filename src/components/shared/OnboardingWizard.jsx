import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, BookOpen, Sparkles, ChevronRight, 
  X, Mic, Calendar, CheckCircle2, ArrowRight,
  FolderPlus, Upload, GraduationCap
} from 'lucide-react';
import { loadUserState, saveUserState } from '../../utils/userScopedStorage';

const ONBOARDING_STORAGE_KEY = 'onboarding:completed';

/**
 * OnboardingWizard - Enhanced onboarding flow with class setup
 * 
 * Shows for new users to:
 * 1. Welcome & context
 * 2. Set up classes (links to Manage Classes)
 * 3. Core actions overview
 * 4. Get started
 */
export default function OnboardingWizard({ onComplete, forceShow = false }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [isVisible, setIsVisible] = useState(false);

  // Check if user has completed onboarding
  useEffect(() => {
    if (forceShow) {
      setIsVisible(true);
      setStep(0);
      return;
    }
    const completed = loadUserState(ONBOARDING_STORAGE_KEY, false);
    if (!completed) {
      const timer = setTimeout(() => setIsVisible(true), 800);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleComplete = () => {
    saveUserState(ONBOARDING_STORAGE_KEY, true);
    setIsVisible(false);
    onComplete?.();
  };

  const handleSkip = () => {
    handleComplete();
  };

  const handleSetupClasses = () => {
    handleComplete();
    navigate('/manage-classes');
  };

  const steps = [
    {
      id: 'welcome',
      title: "Welcome to Staffroom AI",
      description: "Your intelligent teaching companion. Let us help you get set up in under a minute.",
      icon: Sparkles,
      color: "indigo",
      illustration: (
        <div className="flex items-center justify-center gap-3 py-4">
          <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-purple-100 flex items-center justify-center">
            <Mic className="w-7 h-7 text-purple-600" />
          </div>
          <div className="w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
        </div>
      ),
    },
    {
      id: 'setup',
      title: "Set Up Your Classes",
      description: "Create courses and add your class sections. You can also upload your timetable.",
      icon: FolderPlus,
      color: "purple",
      features: [
        { 
          icon: FolderPlus, 
          title: "Create Courses", 
          desc: "Add subjects you teach (e.g., Geography 8th)" 
        },
        { 
          icon: Users, 
          title: "Add Sections", 
          desc: "Set up class sections (e.g., 8A, 8B)" 
        },
        { 
          icon: Upload, 
          title: "Upload Timetable", 
          desc: "Import your schedule from Excel/CSV" 
        },
      ],
      cta: {
        label: "Set Up Classes",
        action: handleSetupClasses,
      },
    },
    {
      id: 'features',
      title: "Your Superpowers",
      description: "Everything you need, accessible in 2 taps or less.",
      icon: CheckCircle2,
      color: "green",
      features: [
        { 
          icon: Mic, 
          title: "Voice Attendance", 
          desc: "Say names aloud, we mark them present" 
        },
        { 
          icon: BookOpen, 
          title: "Syllabus Tracking", 
          desc: "Update progress with one click" 
        },
        { 
          icon: Sparkles, 
          title: "AI Assistant", 
          desc: "Ask anything, get instant answers" 
        },
      ],
    },
    {
      id: 'done',
      title: "You're All Set!",
      description: "Your dashboard shows today's classes and pending actions.",
      icon: Calendar,
      color: "emerald",
    },
  ];

  const currentStep = steps[step];
  const Icon = currentStep.icon;
  const isLastStep = step === steps.length - 1;

  if (!isVisible) return null;

  const colorClasses = {
    indigo: 'bg-gradient-to-br from-indigo-600 to-purple-700',
    purple: 'bg-gradient-to-br from-purple-600 to-pink-700',
    green: 'bg-gradient-to-br from-green-600 to-emerald-700',
    emerald: 'bg-gradient-to-br from-emerald-600 to-teal-700',
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className={`p-6 text-white ${colorClasses[currentStep.color]}`}>
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
                {/* Illustration for welcome */}
                {currentStep.illustration && currentStep.illustration}

                {/* Features list */}
                {currentStep.features && (
                  <div className="space-y-3 mb-6">
                    {currentStep.features.map((feature, idx) => {
                      const FeatureIcon = feature.icon;
                      return (
                        <div 
                          key={idx}
                          className="flex items-center gap-4 p-3 rounded-xl bg-neutral-50"
                        >
                          <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <FeatureIcon className="w-5 h-5 text-indigo-600" />
                          </div>
                          <div>
                            <p className="font-medium text-neutral-800">{feature.title}</p>
                            <p className="text-sm text-neutral-500">{feature.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Final step celebration */}
                {isLastStep && (
                  <div className="text-center py-4">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <p className="text-neutral-600">
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
                <button
                  key={idx}
                  onClick={() => setStep(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === step 
                      ? 'w-8 bg-indigo-600' 
                      : idx < step 
                        ? 'w-4 bg-indigo-300 hover:bg-indigo-400' 
                        : 'w-4 bg-neutral-200 hover:bg-neutral-300'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              {step > 0 && (
                <button
                  onClick={() => setStep(step - 1)}
                  className="flex-1 px-4 py-3 rounded-xl text-sm font-medium bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition-colors"
                >
                  Back
                </button>
              )}
              
              {/* Custom CTA for setup step */}
              {currentStep.cta ? (
                <button
                  onClick={currentStep.cta.action}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  {currentStep.cta.label}
                </button>
              ) : (
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
              )}
            </div>

            {/* Skip/Later link */}
            {!isLastStep && (
              <button
                onClick={currentStep.cta ? () => setStep(step + 1) : handleSkip}
                className="w-full mt-3 text-center text-sm text-neutral-400 hover:text-neutral-600 transition-colors"
              >
                {currentStep.cta ? "Skip for now" : "Skip tour"}
              </button>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Hook to check and control onboarding state
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
