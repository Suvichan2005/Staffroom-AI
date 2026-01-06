// Shared/Common Components
export { default as ProtectedRoute } from './ProtectedRoute';
export { default as AdminRoute } from './AdminRoute';
export { default as ResourceGallery, defaultResources } from './ResourceGallery';
export { default as AssessmentManager } from './AssessmentManager';
export { default as OnboardingWizard, useOnboardingComplete } from './OnboardingWizard';

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
