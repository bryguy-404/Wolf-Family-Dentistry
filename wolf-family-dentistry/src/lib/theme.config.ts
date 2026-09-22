export const theme = {
  colors: {
    primary: "#17285E",
    secondary: "#502A64",
    accent: "#5F9552",
    background: "#FFFFFF",
    foreground: "#17285E",
    muted: "#637083",
    navy: "#17285E",
    green: "#5F9552",
    "green-hover": "#426F39",
    "green-action": "#4E8244",
    "green-ink": "#47743D",
    "green-light": "#88B97B",
    plum: "#502A64",
    ivory: "#F7F9F6",
    sage: "#EAF1E7",
    white: "#FFFFFF",
    "deep-navy": "#0F1B43",
    "plum-tint": "#F0E9F3",
    "navy-tint": "#E9EDF5",
  },
  fonts: {
    heading: "'Plus Jakarta Sans', sans-serif",
    body: "'Source Sans 3', sans-serif",
  },
  radius: {
    sm: "0.75rem",
    md: "1.75rem",
    lg: "2rem",
  },
} as const;

export type Theme = typeof theme;
