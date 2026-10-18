/** Decorative field drawing, never a map or measurement. */
export function FarmIllustration() {
  return (
    <svg
      className="fp-field-art"
      viewBox="0 0 600 200"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
    >
      <rect width="600" height="200" fill="#dcebe9" />
      <circle cx="500" cy="35" r="23" fill="#efd18b" />
      <path d="M0 85Q150 48 300 83T600 70V200H0" fill="#b7cebb" />
      <path d="m0 133 215-48 385 49v66H0" fill="#7da286" />
      <path d="m0 200 220-102 150 29L235 200" fill="#4c7a5e" />
      <path d="m285 200 113-68 202 31v37" fill="#a7b989" />
      <g stroke="#dce8cc" strokeWidth="3" fill="none">
        <path d="m24 181 190-83M63 192l177-89M115 200l151-92M172 200l118-87M315 199l93-58M371 200l70-53M427 200l47-47M482 200l26-42M537 200l3-38" />
      </g>
      <path
        d="M-8 146q226-82 610 5"
        fill="none"
        stroke="#eaf0dc"
        strokeWidth="8"
      />
      <path
        d="M210 95q36 27 36 46t-38 66"
        fill="none"
        stroke="#79a9b5"
        strokeWidth="10"
      />
      <g transform="translate(325 57)">
        <path d="m0 15 25-18 26 18" fill="#87643d" />
        <path d="M7 14h37v26H7z" fill="#f2e4c8" />
        <path d="M21 23h12v17H21" fill="#55745d" />
      </g>
      <g fill="#52795f">
        <path d="M80 79V52h8v28z" />
        <ellipse cx="84" cy="48" rx="17" ry="23" />
        <path d="M116 78V55h7v24z" />
        <ellipse cx="120" cy="51" rx="13" ry="18" />
      </g>
    </svg>
  );
}
