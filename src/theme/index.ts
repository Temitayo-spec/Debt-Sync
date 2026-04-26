import { Platform } from "react-native";

export const palette = {
  background: "#F6F1E8",
  backgroundStrong: "#EFE6D8",
  surface: "#FFFDFC",
  surfaceMuted: "#F3ECE1",
  ink: "#1C1917",
  inkSoft: "#6B6257",
  inkFaint: "#9B8F82",
  line: "#E4D8C8",
  accent: "#B88639",
  accentSoft: "#EAD7B1",
  positive: "#1F7A55",
  positiveSoft: "#DDEEE5",
  negative: "#A44A3F",
  negativeSoft: "#F6E1DC",
  neutralSoft: "#ECE7DE",
  shadow: "#2A2116",
};

export const typography = {
  display: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "serif",
  }),
  body: Platform.select({
    ios: "Avenir Next",
    android: "sans-serif",
    default: "sans-serif",
  }),
  bodyMedium: Platform.select({
    ios: "Avenir Next",
    android: "sans-serif-medium",
    default: "sans-serif",
  }),
};

export const radii = {
  sm: 14,
  md: 20,
  lg: 28,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: palette.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
};
