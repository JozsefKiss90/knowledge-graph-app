// src/components/GraphPage/ui/railIcons.jsx
//
// Inline SVG icon set for the landing chrome (command bar, left rail, docked
// right toolbar). All icons follow the reference design language: 24px viewBox,
// stroke = currentColor, 1.6px width, round caps/joins — so they read as one
// family regardless of which surface they sit on.

import React from "react";

const base = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Icon = ({ size = 16, children, ...rest }) => (
  <svg width={size} height={size} {...base} {...rest} aria-hidden="true">
    {children}
  </svg>
);

/* Brand mark — miniature of the graph itself (fixed palette, not themed). */
export const LogoMark = ({ size = 22 }) => (
  <svg viewBox="0 0 32 32" width={size} height={size} fill="none" aria-hidden="true">
    <circle cx="16" cy="16" r="14" stroke="#47a9ff" strokeWidth="1.6" fill="rgba(59,130,246,0.08)" />
    <circle cx="16" cy="6" r="2.6" fill="#6cb8ff" />
    <circle cx="6.5" cy="13.5" r="2.2" fill="#22C55E" />
    <circle cx="25.5" cy="13.5" r="2.2" fill="#22C55E" />
    <circle cx="10" cy="24" r="2.2" fill="#22C55E" />
    <circle cx="22" cy="24" r="2.2" fill="#22C55E" />
    <circle cx="16" cy="16" r="3" fill="#3B82F6" stroke="#7CB6FF" strokeWidth="0.8" />
    <g stroke="rgba(124,182,255,0.5)" strokeWidth="0.9">
      <line x1="16" y1="16" x2="16" y2="8" />
      <line x1="16" y1="16" x2="8.5" y2="14" />
      <line x1="16" y1="16" x2="23.5" y2="14" />
      <line x1="16" y1="16" x2="11" y2="22.5" />
      <line x1="16" y1="16" x2="21" y2="22.5" />
    </g>
  </svg>
);

/* Navigation */
export const HomeIcon = (p) => (
  <Icon {...p}><path d="M3 11.5L12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" /></Icon>
);
export const ChevronRightIcon = (p) => <Icon {...p}><path d="M9 6l6 6-6 6" /></Icon>;
export const ChevronDownIcon = (p) => <Icon {...p}><path d="M6 9l6 6 6-6" /></Icon>;
export const ChevronsLeftIcon = (p) => (
  <Icon {...p}><path d="M11 17l-5-5 5-5" /><path d="M18 17l-5-5 5-5" /></Icon>
);
export const ChevronsRightIcon = (p) => (
  <Icon {...p}><path d="M13 17l5-5-5-5" /><path d="M6 17l5-5-5-5" /></Icon>
);
export const CloseIcon = (p) => <Icon {...p}><path d="M6 6l12 12" /><path d="M18 6L6 18" /></Icon>;

/* Search & palette */
export const SearchIcon = (p) => (
  <Icon {...p}><circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" /></Icon>
);
export const FindCallsIcon = (p) => (
  <Icon {...p}>
    <path d="M4 5.5h9" /><path d="M4 9.5h5" /><path d="M4 13.5h4" />
    <circle cx="14.5" cy="13" r="4.6" /><path d="M21 20.5l-3.2-3.2" />
  </Icon>
);
export const CommandIcon = (p) => (
  <Icon {...p}>
    <path d="M15 9h-6v6h6z" />
    <path d="M9 9H7.5A2.5 2.5 0 1 1 10 6.5V9" />
    <path d="M15 9h1.5A2.5 2.5 0 1 0 14 6.5V9" />
    <path d="M9 15H7.5A2.5 2.5 0 1 0 10 17.5V15" />
    <path d="M15 15h1.5a2.5 2.5 0 1 1-2.5 2.5V15" />
  </Icon>
);

/* Command-bar actions */
export const DashboardIcon = (p) => (
  <Icon {...p}>
    <path d="M14 4h6v6" /><path d="M20 4l-9 9" />
    <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </Icon>
);
export const GridIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
    <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
  </Icon>
);
export const FlowIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="6" r="2" /><circle cx="6" cy="18" r="2" /><circle cx="18" cy="12" r="2" />
    <path d="M8 6h4a4 4 0 0 1 4 4v0M8 18h4a4 4 0 0 0 4-4v0" />
  </Icon>
);
export const UndoIcon = (p) => (
  <Icon {...p}><path d="M9 14l-4-4 4-4" /><path d="M5 10h9a5 5 0 0 1 5 5v0a5 5 0 0 1-5 5h-3" /></Icon>
);
export const FitIcon = (p) => (
  <Icon {...p}><path d="M4 10V4h6" /><path d="M20 14v6h-6" /><path d="M14 4h6v6" /><path d="M10 20H4v-6" /></Icon>
);
export const ShareIcon = (p) => (
  <Icon {...p}>
    <circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" />
    <path d="M8 11l8-4M8 13l8 4" />
  </Icon>
);
export const BookmarkIcon = (p) => <Icon {...p}><path d="M6 4h12v17l-6-4-6 4z" /></Icon>;
export const BookmarkPlusIcon = (p) => (
  <Icon {...p}><path d="M6 4h12v17l-6-4-6 4z" /><path d="M12 8v5M9.5 10.5h5" /></Icon>
);

/* Left rail */
export const FilterIcon = (p) => <Icon {...p}><path d="M4 5h16l-6 8v6l-4-2v-4z" /></Icon>;
export const SparklesIcon = (p) => (
  <Icon {...p}>
    <path d="M12 3l1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5z" />
    <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
  </Icon>
);
export const ResetIcon = (p) => (
  <Icon {...p}><path d="M3 12a9 9 0 1 0 3-6.7" /><path d="M3 4v5h5" /></Icon>
);

/* Docked right toolbar */
export const InfoIcon = (p) => (
  <Icon {...p}><circle cx="12" cy="12" r="9" /><path d="M12 8v.01M12 11v5" /></Icon>
);
export const PathIcon = (p) => (
  <Icon {...p}>
    <circle cx="5" cy="6" r="2.5" /><circle cx="19" cy="18" r="2.5" />
    <path d="M7 7c2 1 3 4 3 6s2 4 4 4" strokeDasharray="2 2" />
  </Icon>
);
export const ColumnsIcon = (p) => (
  <Icon {...p}>
    <rect x="3" y="4" width="8" height="16" rx="1" />
    <rect x="13" y="4" width="8" height="16" rx="1" strokeDasharray="2 2" />
  </Icon>
);
export const TimelineIcon = (p) => (
  <Icon {...p}>
    <path d="M3 12h18" />
    <circle cx="7" cy="12" r="2" /><circle cx="14" cy="12" r="2" fill="currentColor" /><circle cx="20" cy="12" r="2" />
  </Icon>
);
export const TreeIcon = (p) => (
  <Icon {...p}>
    <rect x="9" y="3" width="6" height="5" rx="1" />
    <rect x="3" y="16" width="6" height="5" rx="1" /><rect x="15" y="16" width="6" height="5" rx="1" />
    <path d="M12 8v4M12 12H6v4M12 12h6v4" />
  </Icon>
);
export const GlobeIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="9" /><path d="M3 12h18" />
    <path d="M12 3c2.5 2.4 4 5.6 4 9s-1.5 6.6-4 9c-2.5-2.4-4-5.6-4-9s1.5-6.6 4-9z" />
  </Icon>
);
export const MailIcon = (p) => (
  <Icon {...p}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></Icon>
);
export const MoonIcon = (p) => (
  <Icon {...p}><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" /></Icon>
);
export const GearIcon = (p) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);
