export const theme = {
  colors: {
    primary: "#17285E",
    secondary: "#502A64",
    accent: "#5F9552",
    background: "#FFFFFF",
    foreground: "#17285E",
    muted: "#637083",
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
