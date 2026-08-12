import React from 'react';
import { StyleSheet, View, type ViewProps } from 'react-native';
import { AlertCircle } from 'lucide-react-native';
import { EmptyState, LoadingState } from '@/components/ui';
import { BorderRadius, Colors, Spacing } from '@/constants/theme';
import { IconSize } from '@/constants/designSystem';

interface FounderStateFrameProps extends ViewProps {
  compact?: boolean;
}

export function FounderStateFrame({
  compact = false,
  style,
  children,
  ...props
}: FounderStateFrameProps) {
  return (
    <View
      {...props}
      style={[styles.frame, compact ? styles.compactFrame : styles.defaultFrame, style]}
    >
      {children}
    </View>
  );
}

export function FounderLoadingState({
  message,
  compact = false,
}: {
  message: string;
  compact?: boolean;
}) {
  return (
    <FounderStateFrame compact={compact}>
      <LoadingState message={message} compact={compact} />
    </FounderStateFrame>
  );
}

export function FounderErrorState({
  title,
  description = 'We could not load this founder data right now. Please try again.',
  onRetry,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <FounderStateFrame>
      <EmptyState
        icon={<AlertCircle size={IconSize.xl} color={Colors.error} />}
        title={title}
        description={description}
        actionLabel={onRetry ? 'Retry' : undefined}
        onAction={onRetry}
      />
    </FounderStateFrame>
  );
}

export function FounderEmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <FounderStateFrame>
      <EmptyState icon={icon} title={title} description={description} />
    </FounderStateFrame>
  );
}

export function FounderInlineSkeleton({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.skeletonGroup, compact && styles.compactSkeletonGroup]}>
      <View style={[styles.skeletonLine, styles.skeletonShort]} />
      <View style={[styles.skeletonLine, styles.skeletonLong]} />
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.cardBorder,
    borderRadius: BorderRadius.md,
    backgroundColor: Colors.cardBg,
  },
  defaultFrame: {
    minHeight: 260,
  },
  compactFrame: {
    minHeight: 112,
  },
  skeletonGroup: {
    width: '100%',
    gap: Spacing.sm,
  },
  compactSkeletonGroup: {
    gap: Spacing.xs,
  },
  skeletonLine: {
    overflow: 'hidden',
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(148,163,184,0.18)',
  },
  skeletonShort: {
    width: '42%',
    height: 26,
  },
  skeletonLong: {
    width: '72%',
    height: 14,
  },
});
