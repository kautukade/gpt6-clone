import React, { useEffect, useRef, useState } from "react";

/* ── palette map (hue token → tailwind classes) ───────────────── */
export const HUES = {
  brain: {
    text: "text-brain",
    bg: "bg-brain",
    border: "border-brain/40",
    soft: "bg-brain/10",
    glow: "shadow-[0_0_44px_-10px_rgba(255,180,84,0.35)]",
    hex: "#ffb454",
  },
  exec: {
    text: "text-exec",
    bg: "bg-exec",
    border: "border-exec/40",
    soft: "bg-exec/10",
    glow: "shadow-[0_0_44px_-10px_rgba(110,231,160,0.3)]",
    hex: "#6ee7a0",
  },
  mem: {
    text: "text-mem",
    bg: "bg-mem",
    border: "border-mem/40",
    soft: "bg-mem/10",
    glow: "shadow-[0_0_44px_-10px_rgba(100,181,255,0.32)]",
    hex: "#64b5ff",
  },
  slate: {
    text: "text-dim",
    bg: "bg-dim",
    border: "border-line2",
    soft: "bg-pane2",
    glow: "shadow-[0_0_44px_-14px_rgba(138,160,188,0.25)]",
    hex: "#8aa0bc",
  },
} as const;

export type Hue = keyof typeof HUES;

/* ── status LED ───────────────────────────────────────────────── */
export function Led({ hue, pulse = true, className = "" }: { hue: Hue; pulse?: boolean; className?: string }) {
  return (
    <span
      className={`inline-block h-2 w-2 rounded-full ${HUES[hue].bg} ${HUES[hue].text} ${pulse ? "led-pulse" : ""} ${className}`}
    />
  );
}

/* ── copy-to-clipboard with feedback ──────────────────────────── */
export function CopyBtn({ text, label = "COPY", className = "" }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  };
  return (
    <button
      onClick={copy}
      className={`group inline-flex items-center gap-1.5 border border-line2 bg-pane2 px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.14em] text-dim transition-all duration-200 hover:border-brain/60 hover:text-fog active:scale-95 ${className}`}
    >
      {copied ? (
        <>
          <CheckIcon className="h-3 w-3 text-exec" />
          <span className="text-exec">COPIED</span>
        </>
      ) : (
        <>
          <CopyIcon className="h-3 w-3 transition-colors group-hover:text-brain" />
          {label}
        </>
      )}
    </button>
  );
}

/* ── scroll reveal wrapper ────────────────────────────────────── */
export function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          el.classList.add("in");
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ── section heading ──────────────────────────────────────────── */
export function SectionHead({
  index,
  title,
  blurb,
}: {
  index: string;
  title: string;
  blurb?: string;
}) {
  return (
    <Reveal className="mb-10 md:mb-14">
      <p className="mb-3 font-mono text-[11px] font-medium tracking-[0.3em] text-brain">
        {index} <span className="text-faint">//</span>{" "}
        <span className="text-dim">{title.split("·")[1]?.trim() ?? "SECTION"}</span>
      </p>
      <h2 className="font-display text-3xl font-bold leading-tight tracking-tight text-fog md:text-5xl">
        {title.split("·")[0].trim()}
      </h2>
      {blurb && <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-dim">{blurb}</p>}
      <div className="mt-6 h-px w-24 bg-gradient-to-r from-brain/70 to-transparent" />
    </Reveal>
  );
}

/* ── terminal block ───────────────────────────────────────────── */
export interface TermLine {
  cmd?: string;
  out?: string;
  comment?: string;
  tag?: { text: string; hue: Hue };
}

export function TermBlock({
  title,
  hue,
  lines,
  className = "",
}: {
  title: string;
  hue: Hue;
  lines: TermLine[];
  className?: string;
}) {
  const cmds = lines.filter((l) => l.cmd).map((l) => l.cmd).join("\n");
  return (
    <div className={`overflow-hidden border border-line bg-pane ${className}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line bg-pane2/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Led hue={hue} />
          <span className="truncate font-mono text-[11px] font-medium tracking-[0.12em] text-dim">{title}</span>
        </div>
        <CopyBtn text={cmds} />
      </div>
      <div className="code-scroll overflow-x-auto px-4 py-3.5 font-mono text-[12.5px] leading-[1.9]">
        {lines.map((l, i) =>
          l.cmd ? (
            <div key={i} className="whitespace-pre">
              <span className={`${HUES[hue].text} select-none`}>❯ </span>
              <span className="text-fog">{l.cmd}</span>
            </div>
          ) : l.comment ? (
            <div key={i} className="whitespace-pre text-faint">
              {l.comment}
            </div>
          ) : l.tag ? (
            <div key={i} className="whitespace-pre">
              <span className={`${HUES[l.tag.hue].text} font-medium`}>[{l.tag.text}] </span>
              <span className="text-dim">{l.out}</span>
            </div>
          ) : (
            <div key={i} className="whitespace-pre text-dim">
              {l.out}
            </div>
          )
        )}
      </div>
    </div>
  );
}

/* ── custom inline SVG icons ──────────────────────────────────── */
type IconProps = { className?: string };

export function LogoMark({ className = "h-6 w-6" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 4.5 4.8 18h14.4L12 4.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" opacity="0.55" />
      <circle cx="12" cy="5" r="2.1" fill="#ffb454" />
      <circle cx="5" cy="18" r="2.1" fill="#64b5ff" />
      <circle cx="19" cy="18" r="2.1" fill="#6ee7a0" />
    </svg>
  );
}

export function BrainChipIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
      <rect x="10" y="10" width="4" height="4" />
      <path d="M9 6V3M15 6V3M9 21v-3M15 21v-3M6 9H3M6 15H3M21 9h-3M21 15h-3" strokeLinecap="round" />
    </svg>
  );
}

export function BoltIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <path d="M13 2.5 4.5 13.5H11l-1 8L18.5 10H12l1-7.5Z" strokeLinejoin="round" />
    </svg>
  );
}

export function DbIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <ellipse cx="12" cy="5.5" rx="7" ry="2.8" />
      <path d="M5 5.5v6c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-6" />
      <path d="M5 11.5v6c0 1.55 3.13 2.8 7 2.8s7-1.25 7-2.8v-6" />
    </svg>
  );
}

export function TermIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={className}>
      <rect x="3" y="4.5" width="18" height="15" rx="1.5" />
      <path d="m7 9.5 3 2.75L7 15M12.5 15H17" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function CopyIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <rect x="8.5" y="8.5" width="11" height="11" rx="1.5" />
      <path d="M15.5 5.5v-.7A1.8 1.8 0 0 0 13.7 3H6.3a1.8 1.8 0 0 0-1.8 1.8v7.4a1.8 1.8 0 0 0 1.8 1.8h.7" />
    </svg>
  );
}

export function CheckIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path d="m5 12.5 4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DownloadIcon({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={className}>
      <path d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5M4.5 16.5v2A1.5 1.5 0 0 0 6 20h12a1.5 1.5 0 0 0 1.5-1.5v-2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function ArrowUpRight({ className = "h-4 w-4" }: IconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className={className}>
      <path d="M7 17 17 7M9.5 7H17v7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function MethodChip({ method }: { method: string }) {
  const map: Record<string, string> = {
    GET: "text-mem border-mem/40 bg-mem/10",
    POST: "text-brain border-brain/40 bg-brain/10",
    DELETE: "text-ember border-ember/40 bg-ember/10",
    CLI: "text-exec border-exec/40 bg-exec/10",
    LLM: "text-brain border-brain/40 bg-brain/10",
    PKG: "text-dim border-line2 bg-pane2",
  };
  return (
    <span
      className={`inline-block w-16 shrink-0 border px-1.5 py-0.5 text-center font-mono text-[10px] font-bold tracking-wider ${map[method] ?? "text-dim border-line2 bg-pane2"}`}
    >
      {method}
    </span>
  );
}
