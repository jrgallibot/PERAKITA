import { typography as baseTypography } from '@perakita/shared';
import type { TextStyle } from 'react-native';

export const fonts = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  mono: 'DMMono_500Medium',
  monoRegular: 'DMMono_400Regular',
} as const;

export const mobileTypography = {
  display: {
    ...baseTypography.display,
    fontFamily: fonts.bold,
    letterSpacing: -0.6,
  },
  title: {
    ...baseTypography.title,
    fontFamily: fonts.semibold,
    letterSpacing: -0.25,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.medium,
    lineHeight: 21,
    letterSpacing: -0.1,
  },
  body: {
    ...baseTypography.body,
    fontFamily: fonts.regular,
    letterSpacing: 0,
  },
  caption: {
    ...baseTypography.caption,
    fontFamily: fonts.medium,
    letterSpacing: 0.2,
  },
  label: {
    fontSize: 12,
    fontFamily: fonts.semibold,
    lineHeight: 16,
    letterSpacing: 0.6,
    textTransform: 'uppercase' as const,
  },
  amount: {
    ...baseTypography.amount,
    fontFamily: fonts.mono,
    letterSpacing: -0.5,
  },
  amountSmall: {
    ...baseTypography.amountSmall,
    fontFamily: fonts.mono,
    letterSpacing: -0.25,
  },
  link: {
    fontSize: 14,
    fontFamily: fonts.semibold,
    lineHeight: 20,
  },
} satisfies Record<string, TextStyle>;

export type MobileTextVariant = keyof typeof mobileTypography;
