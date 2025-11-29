// Design System Components
// Staffroom UI Component Library

// Core Components
export { Button, IconButton } from './Button';
export { Input, Textarea } from './Input';
export { Card, CardHeader, CardContent, CardFooter, StatCard, FeatureCard } from './Card';
export { Badge, StatusBadge, CountBadge, AvatarBadge } from './Badge';
export { Avatar, AvatarGroup } from './Avatar';
export { Modal, ConfirmModal } from './Modal';
export { Sheet, ActionSheet } from './Sheet';
export { Dropdown, Select } from './Dropdown';
export { Toast, ToastContainer, useToasts, toast } from './Toast';
export { Skeleton, SkeletonText, SkeletonCard, SkeletonListItem, SkeletonStatCard } from './Skeleton';
export { EmptyState, ErrorState, OfflineState, LoadingState } from './EmptyState';

// Re-export all as default
import { Button, IconButton } from './Button';
import { Input, Textarea } from './Input';
import { Card, CardHeader, CardContent, CardFooter, StatCard, FeatureCard } from './Card';
import { Badge, StatusBadge, CountBadge, AvatarBadge } from './Badge';
import { Avatar, AvatarGroup } from './Avatar';
import { Modal, ConfirmModal } from './Modal';
import { Sheet, ActionSheet } from './Sheet';
import { Dropdown, Select } from './Dropdown';
import { Toast, ToastContainer, useToasts, toast } from './Toast';

const DesignSystem = {
  Button,
  IconButton,
  Input,
  Textarea,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  StatCard,
  FeatureCard,
  Badge,
  StatusBadge,
  CountBadge,
  AvatarBadge,
  Avatar,
  AvatarGroup,
  Modal,
  ConfirmModal,
  Sheet,
  ActionSheet,
  Dropdown,
  Select,
  Toast,
  ToastContainer,
  useToasts,
  toast,
};

export default DesignSystem;
