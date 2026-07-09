import { createTheme } from '@mui/material/styles';

// Breakpoint values mirror src/styles/_breakpoints.scss so JS
// `useMediaQuery(theme.breakpoints.*)` and SCSS media queries agree.
const theme = createTheme({
  breakpoints: {
    values: {
      xs: 0,
      sm: 600,
      md: 900,
      lg: 1100,
      xl: 1280,
    },
  },
  typography: {
    fontFamily: 'Segoe UI Emoji, Arial, sans-serif',
  },
});

export default theme;
