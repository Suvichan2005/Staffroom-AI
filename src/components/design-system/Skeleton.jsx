import React from 'react';
import { motion } from 'framer-motion';

/**
 * Skeleton loading placeholder
 * Shows a pulsing animation to indicate loading state
 */
export function Skeleton({
  variant = 'rectangular',
  width,
  height,
  className = '',
  animate = true,
}) {
  const variants = {
    rectangular: 'rounded-lg',
    circular: 'rounded-full',
    text: 'rounded h-4',
    title: 'rounded h-6 w-3/4',
    avatar: 'rounded-full w-10 h-10',
    button: 'rounded-xl h-10 w-24',
    card: 'rounded-2xl h-32',
  };

  const shimmer = {
    initial: { backgroundPosition: '-200% 0' },
    animate: {
      backgroundPosition: '200% 0',
      transition: {
        repeat: Infinity,
        duration: 1.5,
        ease: 'linear',
      },
    },
  };

  return (
    <motion.div
      variants={animate ? shimmer : {}}
      initial="initial"
      animate="animate"
      className={`
        bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200
        bg-[length:200%_100%]
        ${variants[variant]}
        ${className}
      `}
      style={{
        width: width,
        height: height,
      }}
    />
  );
}

/**
 * Skeleton text lines
 */
export function SkeletonText({ lines = 3, className = '' }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  );
}

/**
 * Skeleton card for content loading
 */
export function SkeletonCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-slate-100 ${className}`}>
      <div className="flex items-start gap-3">
        <Skeleton variant="avatar" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="title" />
          <Skeleton variant="text" className="w-1/2" />
        </div>
      </div>
      <div className="mt-4 space-y-2">
        <Skeleton variant="text" />
        <Skeleton variant="text" className="w-3/4" />
      </div>
    </div>
  );
}

/**
 * Skeleton list item
 */
export function SkeletonListItem({ className = '' }) {
  return (
    <div className={`flex items-center gap-3 py-3 ${className}`}>
      <Skeleton variant="avatar" className="w-12 h-12" />
      <div className="flex-1 space-y-2">
        <Skeleton variant="text" className="w-1/2" />
        <Skeleton variant="text" className="w-1/3 h-3" />
      </div>
    </div>
  );
}

/**
 * Skeleton stat card
 */
export function SkeletonStatCard({ className = '' }) {
  return (
    <div className={`bg-white rounded-2xl p-4 border border-slate-100 ${className}`}>
      <Skeleton variant="text" className="w-1/3 h-3 mb-2" />
      <Skeleton variant="title" className="w-1/2 h-8 mb-3" />
      <Skeleton variant="button" className="w-16 h-5" />
    </div>
  );
}

export default Skeleton;
