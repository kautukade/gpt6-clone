import { useState } from "react";
import CodePanel from "./components/CodePanel";
import DeploySection from "./components/DeploySection";
import { ApiSection, LifecycleSection } from "./components/InfoSections";
import Topology from "./components/Topology";
import { Led, LogoMark, Reveal, SectionHead } from "./components/ui";

const NAV = [
  ["TOPOLOGY", "#topology"],
  ["LIFECYCLE", "#lifecycle"],
  ["SOURCE", "#source"],
  ["API", "#api"],
  ["DEPLOY", "#deploy"],
] as const;

const MARQUEE = [
  "FASTAPI",
  "CHROMADB",
  "LANGCHAIN",
  "LANGCHAIN-OLLAMA",
  "UVICORN",
  "GLM4:LATEST",
  "QWEN2.5-CODER:7B",
  "NOMIC-EMBED-TEXT-V2-MOE",
  "HNSW · COSINE",
  "SUBPROCESS SANDBOX",
  "REQUESTS",
  "POSIX RLIMITS",
];

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-3 md:px-8">
        <a href="#topology" className="group flex items-center gap-2.5">
          <span className="text-fog transition-colors group-hover:text-brain">
            <LogoMark className="h-7 w-7" />
          </span>
          <span className="font-display text-[17px] font-bold tracking-[0.06em] text-fog">
            TRIAD<span className="text-brain">//</span>LAN
          </span>
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="font-mono text-[10.5px] font-medium tracking-[0.22em] text-dim transition-colors hover:text-brain"
            >
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-3 border border-line bg-pane px-3 py-1.5 sm:flex">
            <span className="flex items-center gap-1.5">
              <Led hue="mem" /> <span className="font-mono text-[9px] tracking-wider text-faint">MEM</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Led hue="exec" /> <span className="font-mono text-[9px] tracking-wider text-faint">EXE</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Led hue="brain" /> <span className="font-mono text-[9px] tracking-wider text-faint">BRN</span>
            </span>
          </div>
          <span className="hidden border border-line2 bg-pane2 px-2.5 py-1.5 font-mono text-[10px] tracking-[0.14em] text-dim lg:inline">
            10.0.0.0/24
          </span>
        </div>
      </div>
    </header>
  );
}

function Marquee() {
  const items = [...MARQUEE, ...MARQUEE];
  return (
    <div className="marquee overflow-hidden border-y border-line bg-pane/70 py-3">
      <div className="marquee-track items-center">
        {items.map((t, i) => (
          <span key={i} className="flex items-center">
            <span className="whitespace-nowrap font-mono text-[11px] font-medium tracking-[0.3em] text-faint transition-colors hover:text-dim">
              {t}
            </span>
            <span className="mx-6 text-[8px] text-brain/60">◆</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-6 border-t border-line">
      <div className="mx-auto max-w-7xl px-5 py-10 md:px-8">
        <div className="flex flex-col justify-between gap-8 md:flex-row md:items-start">
          <div className="max-w-sm">
            <div className="flex items-center gap-2.5">
              <LogoMark className="h-6 w-6 text-fog" />
              <span className="font-display text-[16px] font-bold tracking-[0.06em] text-fog">
                TRIAD<span className="text-brain">//</span>LAN
              </span>
            </div>
            <p className="mt-3 text-[13px] leading-relaxed text-dim">
              A distributed multi-agent system for three laptops and one subnet. Reasoning, execution and memory —
              split across the LAN, glued together with HTTP.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            {[
              ["THE BRAIN", "10.0.0.10", "brain"],
              ["THE MEMORY", "10.0.0.11:8000", "mem"],
              ["THE EXECUTOR", "10.0.0.12:8001", "exec"],
            ].map(([role, ip, hue]) => (
              <div key={role} className="border border-line bg-pane px-4 py-3">
                <div className="flex items-center gap-2">
                  <Led hue={hue as "brain" | "mem" | "exec"} pulse={false} />
                  <span className="font-display text-[11px] font-bold tracking-[0.12em] text-dim">{role}</span>
                </div>
                <p className="mt-1.5 font-mono text-[12px] text-fog">{ip}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-8 flex flex-col gap-2 border-t border-line/70 pt-5 font-mono text-[10px] tracking-[0.14em] text-faint sm:flex-row sm:items-center sm:justify-between">
          <span>TRIAD//LAN · BUILT FOR THE LAN, NOT THE CLOUD</span>
          <span>
            GLM4 · QWEN2.5-CODER · NOMIC-EMBED-TEXT-V2-MOE · <span className="text-brain/70">FASTAPI · CHROMADB · LANGCHAIN</span>
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function App() {
  const [activeFile, setActiveFile] = useState("brain");

  const openFile = (id: string) => {
    setActiveFile(id);
    document.getElementById("source")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Topology onOpenFile={openFile} />
        <Marquee />
        <LifecycleSection />

        <section id="source" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
          <SectionHead
            index="03"
            title="SOURCE CODE · FOUR FILES, THREE NODES"
            blurb="Production-ready and commented end to end. Copy them straight off this page — every file runs as-is with python <file>, and the workers answer on /docs with interactive Swagger UIs."
          />
          <Reveal>
            <CodePanel activeId={activeFile} onSelect={setActiveFile} />
          </Reveal>
        </section>

        <ApiSection />
        <DeploySection />
      </main>
      <Footer />
    </div>
  );
}
