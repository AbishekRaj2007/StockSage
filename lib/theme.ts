// Central design tokens. Keeping colors/spacing here keeps every screen
// visually consistent (a decision noted per the plan's "make a reasonable
// choice and move on" rule for the color palette).

export const colors = {
  // Brand
  primary: "#4F46E5", // indigo-600
  primaryDark: "#4338CA",
  primarySoft: "#EEF0FE",

  // Surfaces
  bg: "#F5F6FA",
  card: "#FFFFFF",
  navy: "#0F172A", // deep slate for headers/hero

  // Text
  text: "#0F172A",
  textMuted: "#64748B",
  textFaint: "#94A3B8",

  // Lines
  border: "#E7E9F0",

  // Semantic
  success: "#059669",
  successSoft: "#DCFCE7",
  warning: "#D97706",
  warningSoft: "#FEF3C7",
  danger: "#DC2626",
  dangerSoft: "#FEE2E2",
  info: "#0284C7",
  infoSoft: "#E0F2FE",

  white: "#FFFFFF",
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 22,
  pill: 999,
} as const;

export const shadow = {
  card: {
    shadowColor: "#0F172A",
    shadowOpacity: 0.06,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
} as const;

export const font = {
  h1: 26,
  h2: 20,
  h3: 17,
  body: 15,
  small: 13,
  tiny: 11,
} as const;
