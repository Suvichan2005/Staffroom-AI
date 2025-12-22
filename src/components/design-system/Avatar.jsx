import React from 'react';
import { User } from 'lucide-react';

/**
 * Avatar Component - User profile images with fallback
 * 
 * @param {'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'} size
 * @param {string} src - Image URL
 * @param {string} alt - Alt text
 * @param {string} name - User name for initials fallback
 * @param {'circle' | 'square'} shape
 * @param {boolean} ring - Show ring border
 * @param {'online' | 'offline' | 'busy' | 'away'} status - Online status indicator
 */
export function Avatar({
  size = 'md',
  src,
  alt,
  name,
  shape = 'circle',
  ring = false,
  status,
  className = '',
  ...props
}) {
  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl',
  };

  const statusSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-4 h-4',
    '2xl': 'w-5 h-5',
  };

  const statusColors = {
    online: 'bg-green-500',
    offline: 'bg-black-400',
    busy: 'bg-red-500',
    away: 'bg-yellow-500',
  };

  const shapes = {
    circle: 'rounded-full',
    square: 'rounded-xl',
  };

  const getInitials = (name) => {
    if (!name) return '';
    const words = name.split(' ').filter(Boolean);
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const initials = getInitials(name);

  // Generate consistent color from name
  const getColorFromName = (name) => {
    if (!name) return 'bg-black-200';
    const colors = [
      'bg-red-200 text-red-700',
      'bg-orange-200 text-orange-700',
      'bg-yellow-200 text-yellow-700',
      'bg-green-200 text-green-700',
      'bg-teal-200 text-teal-700',
      'bg-blue-200 text-blue-700',
      'bg-indigo-200 text-indigo-700',
      'bg-purple-200 text-purple-700',
      'bg-pink-200 text-pink-700',
    ];
    const index = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return colors[index % colors.length];
  };

  return (
    <div className={`relative inline-flex flex-shrink-0 ${className}`}>
      <div
        className={`
          ${sizes[size]}
          ${shapes[shape]}
          ${ring ? 'ring-2 ring-white ring-offset-2' : ''}
          overflow-hidden flex items-center justify-center font-semibold
          ${src ? 'bg-black-100' : getColorFromName(name)}
        `}
        {...props}
      >
        {src ? (
          <img
            src={src}
            alt={alt || name || 'Avatar'}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            crossOrigin="anonymous"
            onError={(e) => {
              e.target.style.display = 'none';
              e.target.nextSibling?.classList.remove('hidden');
            }}
          />
        ) : null}
        
        {/* Fallback */}
        <span className={src ? 'hidden' : ''}>
          {initials || <User className="w-1/2 h-1/2 text-black-400" />}
        </span>
      </div>

      {/* Status Indicator */}
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${statusSizes[size]}
            ${statusColors[status]}
            ${shape === 'circle' ? 'rounded-full' : 'rounded-full'}
            ring-2 ring-white
          `}
        />
      )}
    </div>
  );
}

/**
 * Avatar Group - Stack multiple avatars
 */
export function AvatarGroup({
  avatars,
  max = 4,
  size = 'md',
  className = '',
}) {
  const visibleAvatars = avatars.slice(0, max);
  const remaining = avatars.length - max;

  const overlapSizes = {
    xs: '-ml-1.5',
    sm: '-ml-2',
    md: '-ml-2.5',
    lg: '-ml-3',
    xl: '-ml-4',
    '2xl': '-ml-5',
  };

  const countSizes = {
    xs: 'w-6 h-6 text-[10px]',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl',
  };

  return (
    <div className={`flex items-center ${className}`}>
      {visibleAvatars.map((avatar, index) => (
        <div
          key={avatar.id || index}
          className={index > 0 ? overlapSizes[size] : ''}
          style={{ zIndex: visibleAvatars.length - index }}
        >
          <Avatar
            size={size}
            src={avatar.src}
            name={avatar.name}
            alt={avatar.alt || avatar.name}
            ring
          />
        </div>
      ))}
      
      {remaining > 0 && (
        <div
          className={`
            ${overlapSizes[size]}
            ${countSizes[size]}
            flex items-center justify-center
            rounded-full bg-black-100 text-black-600 font-medium
            ring-2 ring-white
          `}
          style={{ zIndex: 0 }}
        >
          +{remaining}
        </div>
      )}
    </div>
  );
}

export default Avatar;
