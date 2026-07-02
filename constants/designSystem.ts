import type { TextStyle, ViewStyle } from 'react-native';
import { BorderRadius, Colors, FontSizes, Spacing } from '@/constants/theme';

export const Layout = {
  screenPadding: Spacing.lg,
  screenBottomPadding: Spacing.xxl,
  sectionGap: Spacing.lg,
  contentGap: Spacing.md,
  compactGap: Spacing.sm,
  touchTarget: 48,
} as const;

export const Typography = {
  display: { fontSize: FontSizes.hero, lineHeight: 48, fontWeight: '900' },
  pageTitle: { fontSize: FontSizes.xxl, lineHeight: 30, fontWeight: '800' },
  sectionTitle: { fontSize: FontSizes.lg, lineHeight: 22, fontWeight: '700' },
  cardTitle: { fontSize: FontSizes.lg, lineHeight: 22, fontWeight: '700' },
  body: { fontSize: FontSizes.md, lineHeight: 20, fontWeight: '400' },
  bodyStrong: { fontSize: FontSizes.md, lineHeight: 20, fontWeight: '700' },
  label: { fontSize: FontSizes.sm, lineHeight: 16, fontWeight: '700' },
  caption: { fontSize: FontSizes.xs, lineHeight: 14, fontWeight: '500' },
  button: { fontSize: FontSizes.md, lineHeight: 20, fontWeight: '800' },
  buttonLarge: { fontSize: FontSizes.lg, lineHeight: 22, fontWeight: '900' },
} satisfies Record<string, TextStyle>;

export type TypographyVariant = keyof typeof Typography;

export const ComponentSize = {
  button: {
    medium: 52,
    large: 64,
  },
  chip: 36,
  badge: 28,
  input: 52,
  iconButton: Layout.touchTarget,
} as const;

export const IconSize = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
  hero: 48,
} as const;

export const Motion = {
  duration: {
    fast: 120,
    normal: 220,
    slow: 360,
  },
  pressOpacity: 0.78,
  entranceOffset: 8,
} as const;

export const Elevation = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 3,
  },
  floating: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 16,
    elevation: 8,
  },
} satisfies Record<string, ViewStyle>;

export const Surface = {
  screen: Colors.background,
  card: Colors.cardBg,
  cardBorder: Colors.cardBorder,
  overlay: Colors.overlay,
} as const;

export const StatusTone = {
  neutral: {
    foreground: Colors.gray,
    background: Colors.background,
    border: Colors.cardBorder,
  },
  brand: {
    foreground: Colors.gold[400],
    background: Colors.overlay,
    border: Colors.gold[700],
  },
  success: {
    foreground: Colors.success,
    background: Colors.successBg,
    border: Colors.successBorder,
  },
  warning: {
    foreground: Colors.warning,
    background: Colors.warningBg,
    border: Colors.warningBorder,
  },
  error: {
    foreground: Colors.error,
    background: Colors.errorBg,
    border: Colors.errorBorder,
  },
} as const;

export type Tone = keyof typeof StatusTone;

export const Radius = BorderRadius;
export const Space = Spacing;
