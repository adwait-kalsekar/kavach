import type { ReactNode } from "react";
export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  const shapes: Record<string, ReactNode> = {
    leaf: (
      <>
        <path d="M20 3C7 1 2 9 6 15c5 6 14 0 14-12Z" />
        <path d="m4 21 11-12" />
      </>
    ),
    mic: (
      <>
        <rect x="9" y="2" width="6" height="13" rx="3" />
        <path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3M8 22h8" />
      </>
    ),
    talk: (
      <>
        <path d="M20 11a8 8 0 0 1-8 8H5l-4 3V11a10 10 0 0 1 19 0Z" />
        <path d="M6 10h8M6 14h5" />
      </>
    ),
    sample: (
      <>
        <path d="m3 8 9-5 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" />
      </>
    ),
    season: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 1v2M12 21v2M1 12h2M21 12h2M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2" />
      </>
    ),
    water: (
      <path d="M12 2C9 7 5 11 5 15a7 7 0 0 0 14 0c0-4-4-8-7-13ZM8 15a4 4 0 0 0 4 4" />
    ),
    sound: (
      <>
        <path d="m11 4-6 5H2v6h3l6 5V4ZM15 8a6 6 0 0 1 0 8M18 4a11 11 0 0 1 0 16" />
      </>
    ),
    send: (
      <>
        <path d="m12 3 8 8M12 3l-8 8M12 3v18" />
      </>
    ),
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    back: <path d="M20 12H4m6-6-6 6 6 6" />,
    check: <path d="m5 12 4 4L19 6" />,
    plus: <path d="M12 4v16M4 12h16" />,
    close: <path d="m6 6 12 12M6 18 18 6" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shapes[name] || shapes.leaf}
    </svg>
  );
}
export function Landscape() {
  return (
    <svg className="field-art" viewBox="0 0 640 200" aria-hidden="true">
      <rect width="640" height="200" fill="#e9f0df" />
      <circle cx="510" cy="52" r="29" fill="#e5ca80" />
      <path d="M0 98Q130 10 300 110T640 90v110H0" fill="#c3d5b4" />
      <path d="M0 145q180-100 400 0t240 0v55H0" fill="#8fae7b" />
      <path d="M0 190q280-120 640-12v22H0" fill="#4e7959" />
      <path
        d="M395 128q-50 36-24 72"
        stroke="#e9ddb4"
        strokeWidth="13"
        fill="none"
      />
      <path
        d="M55 154q140-60 255-22M48 167q145-62 267-22M430 153q95-7 210 35"
        stroke="#d6e4c4"
        strokeWidth="2"
        fill="none"
      />
    </svg>
  );
}
