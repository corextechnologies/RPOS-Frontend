/**
 * RPOS custom icon set — hand-drawn, single-weight line icons.
 * No external icon library: every glyph is a consistent 24px grid,
 * 1.6 stroke, round caps/joins. Import { Icon } and pass a `name`,
 * or import a specific glyph component.
 */
import * as React from "react";

export type IconName =
  | "dashboard"
  | "org"
  | "branch"
  | "users"
  | "shield"
  | "layers"
  | "settings"
  | "logout"
  | "search"
  | "sun"
  | "moon"
  | "plus"
  | "edit"
  | "trash"
  | "close"
  | "check"
  | "chevronDown"
  | "chevronRight"
  | "chevronLeft"
  | "menu"
  | "bell"
  | "dots"
  | "filter"
  | "arrowRight"
  | "arrowUpRight"
  | "lock"
  | "mail"
  | "eye"
  | "eyeOff"
  | "pulse"
  | "box"
  | "tag"
  | "thermometer"
  | "pin"
  | "scale"
  | "clock"
  | "sparkle"
  | "check-circle"
  | "alert"
  | "grid"
  | "key"
  | "receipt"
  | "sliders";

interface IconProps extends React.SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
}

const P: Record<IconName, React.ReactNode> = {
  dashboard: (
    <>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </>
  ),
  org: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-5h6v5" />
      <path d="M9 9h.01M15 9h.01M9 12.5h.01M15 12.5h.01" />
    </>
  ),
  branch: (
    <>
      <path d="M6 6h.01M6 12h.01" />
      <path d="M3 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16" />
      <path d="M13 9h6a2 2 0 0 1 2 2v10" />
      <path d="M2 21h20" />
      <path d="M16.5 13h.01M16.5 17h.01" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
      <path d="M16 6.2a3.2 3.2 0 0 1 0 5.6" />
      <path d="M17.5 14.3A5.5 5.5 0 0 1 20.5 19" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3l7 3v5c0 4.4-3 7.7-7 9-4-1.3-7-4.6-7-9V6l7-3z" />
      <path d="M9.2 12l2 2 3.6-3.8" />
    </>
  ),
  layers: (
    <>
      <path d="M12 3l9 5-9 5-9-5 9-5z" />
      <path d="M3 13l9 5 9-5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 12a7.6 7.6 0 0 0-.1-1.2l1.8-1.4-1.8-3.1-2.1.8a7.5 7.5 0 0 0-2-1.2L14.6 2h-3.6l-.4 2.3a7.5 7.5 0 0 0-2 1.2l-2.1-.8L2.7 7.8l1.8 1.4a7 7 0 0 0 0 2.4L2.7 13l1.8 3.1 2.1-.8a7.5 7.5 0 0 0 2 1.2l.4 2.3h3.6l.4-2.3a7.5 7.5 0 0 0 2-1.2l2.1.8 1.8-3.1-1.8-1.4c.06-.4.1-.8.1-1.2z" />
    </>
  ),
  logout: (
    <>
      <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
      <path d="M10 12H3" />
      <path d="M6 8l-3.5 4L6 16" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.3-4.3" />
    </>
  ),
  sun: (
    <>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </>
  ),
  moon: <path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.6 6.6 0 0 0 10.5 10.5z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  edit: (
    <>
      <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
      <path d="M13.5 6.5l3 3" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2" />
      <path d="M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.4h7a1.5 1.5 0 0 0 1.5-1.4L18 7" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  close: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  chevronDown: <path d="M6 9l6 6 6-6" />,
  chevronRight: <path d="M9 6l6 6-6 6" />,
  chevronLeft: <path d="M15 6l-6 6 6 6" />,
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 6 2 7 2 7H4s2-1 2-7z" />
      <path d="M10 20a2 2 0 0 0 4 0" />
    </>
  ),
  dots: (
    <>
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="12" cy="12" r="1.4" />
      <circle cx="12" cy="19" r="1.4" />
    </>
  ),
  filter: <path d="M3 5h18l-7 8v6l-4-2v-4L3 5z" />,
  arrowRight: <path d="M4 12h16M14 6l6 6-6 6" />,
  arrowUpRight: <path d="M7 17L17 7M8 7h9v9" />,
  lock: (
    <>
      <rect x="4.5" y="10" width="15" height="10" rx="2.2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
      <path d="M12 14v2.5" />
    </>
  ),
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <path d="M4 7l8 6 8-6" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  eyeOff: (
    <>
      <path d="M4 4l16 16" />
      <path d="M9.5 5.9A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.7 3.4" />
      <path d="M6.2 7.7A16.7 16.7 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 3.3-.6" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
    </>
  ),
  pulse: <path d="M2 12h4l3 8 4-16 3 8h6" />,
  box: (
    <>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </>
  ),
  tag: (
    <>
      <path d="M3 12.5V5a2 2 0 0 1 2-2h7.5L21 11.5a2 2 0 0 1 0 2.8l-6.7 6.7a2 2 0 0 1-2.8 0L3 12.5z" />
      <circle cx="8" cy="8" r="1.4" />
    </>
  ),
  thermometer: (
    <>
      <path d="M10 13.5V5a2 2 0 0 1 4 0v8.5a4 4 0 1 1-4 0z" />
      <path d="M12 9v6.5" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s7-6 7-11a7 7 0 0 0-14 0c0 5 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  scale: (
    <>
      <path d="M12 3v18M7 21h10" />
      <path d="M5 7h14M5 7l-3 6a3 3 0 0 0 6 0L5 7zM19 7l-3 6a3 3 0 0 0 6 0l-3-6z" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  sparkle: (
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" />
  ),
  "check-circle": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.5 2.5 4.5-5" />
    </>
  ),
  alert: (
    <>
      <path d="M12 3l9.5 16.5H2.5L12 3z" />
      <path d="M12 9.5v4M12 16.5h.01" />
    </>
  ),
  grid: (
    <>
      <rect x="3" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="3" width="7.5" height="7.5" rx="1.6" />
      <rect x="3" y="13.5" width="7.5" height="7.5" rx="1.6" />
      <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.6" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="4.2" />
      <path d="M11 11l8 8M16 16l2-2M14.5 14.5l2 2" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3.5h14v17l-2.5-1.5L14 20.5 12 19l-2 1.5L7.5 19 5 20.5V3.5z" />
      <path d="M8.5 8h7M8.5 12h7M8.5 15.5h4" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h10M18 8h2M4 16h2M10 16h10" />
      <circle cx="16" cy="8" r="2.2" />
      <circle cx="8" cy="16" r="2.2" />
    </>
  ),
};

export function Icon({ name, size = 20, ...props }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {P[name]}
    </svg>
  );
}

/** Animated brand spinner (custom, no library). */
export function Spinner({ size = 18, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={`animate-[spin-slow_0.8s_linear_infinite] ${className ?? ""}`}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.4" opacity="0.2" />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The ROS monogram mark — a stylized central-kitchen "hub & spokes". */
export function Logomark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <circle cx="16" cy="16" r="14.5" stroke="currentColor" strokeWidth="1.6" opacity="0.35" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M16 12V5.5" />
        <path d="M19.4 17.9l4.9 3.4" />
        <path d="M12.6 17.9l-4.9 3.4" />
      </g>
      <g fill="currentColor">
        <circle cx="16" cy="4.5" r="2" />
        <circle cx="25.2" cy="22.2" r="2" />
        <circle cx="6.8" cy="22.2" r="2" />
      </g>
    </svg>
  );
}
