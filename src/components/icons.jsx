// Small inline icons. Stroke based so they inherit the text colour and stay
// crisp at any size. No icon library: keeps the bundle tiny and the web and
// native builds identical.

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

const Cloud = ({ dy = 0 }) => (
  <path
    d={`M7.5 ${16.5 + dy}h9.2a3.3 3.3 0 0 0 .3-6.6 5 5 0 0 0-9.6-1.2 3.9 3.9 0 0 0 .1 7.8Z`}
  />
);

function Shape({ kind }) {
  switch (kind) {
    case "clear":
      return (
        <>
          <circle cx="12" cy="12" r="4.2" />
          {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
            const r = 7.4;
            const x = 12 + r * Math.cos((a * Math.PI) / 180);
            const y = 12 + r * Math.sin((a * Math.PI) / 180);
            const x2 = 12 + (r + 2.1) * Math.cos((a * Math.PI) / 180);
            const y2 = 12 + (r + 2.1) * Math.sin((a * Math.PI) / 180);
            return <line key={a} x1={x} y1={y} x2={x2} y2={y2} />;
          })}
        </>
      );
    case "partly":
      return (
        <>
          <circle cx="9" cy="9" r="3.2" />
          {[0, 60, 120, 180, 240, 300].map((a) => {
            const r = 5.6;
            return (
              <line
                key={a}
                x1={9 + r * Math.cos((a * Math.PI) / 180)}
                y1={9 + r * Math.sin((a * Math.PI) / 180)}
                x2={9 + (r + 1.6) * Math.cos((a * Math.PI) / 180)}
                y2={9 + (r + 1.6) * Math.sin((a * Math.PI) / 180)}
              />
            );
          })}
          <path d="M10.5 19.5h8a2.9 2.9 0 0 0 .3-5.8 4.4 4.4 0 0 0-8.5-1 3.4 3.4 0 0 0 .2 6.8Z" />
        </>
      );
    case "cloud":
      return (
        <>
          <Cloud />
          <Cloud dy={-3.4} />
        </>
      );
    case "fog":
      return (
        <>
          <Cloud dy={-1.5} />
          <line x1="5" y1="19.5" x2="19" y2="19.5" />
          <line x1="7" y1="22" x2="17" y2="22" />
        </>
      );
    case "drizzle":
      return (
        <>
          <Cloud dy={-2} />
          <line x1="9" y1="18.5" x2="8.2" y2="21" />
          <line x1="13" y1="18.5" x2="12.2" y2="21" />
          <line x1="17" y1="18.5" x2="16.2" y2="21" />
        </>
      );
    case "rain":
      return (
        <>
          <Cloud dy={-2} />
          <line x1="8.5" y1="18.2" x2="7.2" y2="22" />
          <line x1="12.5" y1="18.2" x2="11.2" y2="22" />
          <line x1="16.5" y1="18.2" x2="15.2" y2="22" />
        </>
      );
    case "snow":
      return (
        <>
          <Cloud dy={-2.5} />
          {[
            [9, 19.5],
            [13, 21],
            [17, 19.5],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <line x1={x - 1.3} y1={y} x2={x + 1.3} y2={y} />
              <line x1={x} y1={y - 1.3} x2={x} y2={y + 1.3} />
            </g>
          ))}
        </>
      );
    case "storm":
      return (
        <>
          <Cloud dy={-2.5} />
          <path d="M12.4 17.5 10 21h2.6l-1 3 3.6-4.4h-2.6l1-2.1Z" />
        </>
      );
    default:
      return <Cloud />;
  }
}

export function WeatherIcon({ kind = "cloud", size = 58, title }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" role="img" aria-label={title || kind}>
      <g {...base}>
        <Shape kind={kind} />
      </g>
    </svg>
  );
}

export function TabIcon({ name, size = 20 }) {
  const s = { width: size, height: size, viewBox: "0 0 24 24", ...base };
  switch (name) {
    case "today":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
        </svg>
      );
    case "history":
      return (
        <svg {...s}>
          <path d="M4 19V9M9 19V5M14 19v-7M19 19V8" />
          <path d="M2.5 19h19" strokeWidth="1.2" />
        </svg>
      );
    case "planet":
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M4 10.5c3 1.6 5.2 1.2 7.4-.6 2.1-1.7 4-1.9 6.6-.2M6.3 17.6c2-1.8 3.6-2 5.6-.6 1.8 1.3 3.6 1.1 5.6-.4" />
        </svg>
      );
    default:
      return (
        <svg {...s}>
          <circle cx="12" cy="12" r="8.6" />
          <path d="M12 10.6v6M12 7.6v.1" />
        </svg>
      );
  }
}
