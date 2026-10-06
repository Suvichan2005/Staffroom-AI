// Shared/Common Components
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as AdminRoute, HODRoute } from './AdminRoute';
export { default as ResourceGallery, defaultResources } from './ResourceGallery';
export { default as AssessmentManager } from './AssessmentManager';
export { default as OnboardingWizard, useOnboardingComplete } from './OnboardingWizard';
export { default as SplashOnboarding, useSplashOnboarding } from './SplashOnboarding';
export { 
  default as VoiceHints, 
  CLASS_PAGE_HINTS, 
  ATTENDANCE_HINTS, 
  SYLLABUS_HINTS, 
  DASHBOARD_HINTS 
} from './VoiceHints';

// Feature Tooltips & Help
export { 
  TooltipProvider, 
  useTooltips, 
  FeatureTooltip, 
  FloatingHelpButton,
  GuidedTour,
  FEATURE_TIPS,
  DEFAULT_TOUR_STEPS 
} from './FeatureTooltips';

// Loading & Skeleton Components
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonStatCard,
  SkeletonTable,
  SkeletonList,
  SkeletonChart,
  DashboardSkeleton,
  ClassPageSkeleton,
  SyllabusSkeleton,
  AttendanceSkeleton,
  LoadingOverlay,
  Spinner,
  EmptyState
} from './Skeletons';
