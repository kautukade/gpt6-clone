import { useEffect, useState } from "react";
import { ArrowUpRight, HUES, Led, Reveal, type Hue } from "./ui";

/* ── node card data ───────────────────────────────────────────── */
const NODES: {
  id: string;
  hue: Hue;
  role: string;
  laptop: string;
  ip: string;
  port: string;
  stack: string[];
  pos: string;
  hover: string;
}[] = [
  {
    id: "brain",
    hue: "brain",
    role: "THE BRAIN",
    laptop: "LAPTOP 1",
    ip: "10.0.0.10",
    port: ":11434",
    stack: ["brain_node.py · LangChain CLI", "glm4:latest → routing + chat", "qwen2.5-coder:7b → code writer"],
    pos: "lg:absolute lg:left-[2%] lg:top-[24%] lg:w-[36%]",
    hover: "hover:border-brain/60",
  },
  {
    id: "memory",
    hue: "mem",
    role: "THE MEMORY",
    laptop: "LAPTOP 3",
    ip: "10.0.0.11",
    port: ":8000",
    stack: ["memory_node.py · FastAPI", "ChromaDB persistent · HNSW cosine", "nomic-embed-text-v2-moe via Ollama"],
    pos: "lg:absolute lg:left-[61.5%] lg:top-[3%] lg:w-[36.5%]",
    hover: "hover:border-mem/60",
  },
  {
    id: "executor",
    hue: "exec",
    role: "THE EXECUTOR",
    laptop: "LAPTOP 2",
    ip: "10.0.0.12",
    port: ":8001",
    stack: ["executor_node.py · FastAPI", "fresh interpreter · python -I", "timeout + POSIX rlimits"],
    pos: "lg:absolute lg:left-[61.5%] lg:top-[57%] lg:w-[36.5%]",
    hover: "hover:border-exec/60",
  },
];

/* ── scripted trace lines for the swarm bus ───────────────────── */
const SCRIPT: { tag: string; hue: Hue; text: string }[] = [
  { tag: "memory", hue: "mem", text: "POST /memory/query · 3 hits · 96 ms" },
  { tag: "brain", hue: "brain", text: 'glm4:latest route → {"action": "run_code"}' },
  { tag: "brain", hue: "brain", text: "qwen2.5-coder:7b wrote 14 lines · handing off" },
  { tag: "exec", hue: "exec", text: "POST /execute · exit 0 · 412 ms" },
  { tag: "memory", hue: "mem", text: "embed nomic-embed-text-v2-moe · 768-d · 41 ms" },
  { tag: "memory", hue: "mem", text: "upsert id=9f2c41aa · total 27 records" },
  { tag: "brain", hue: "brain", text: "summarising remote verdict → user" },
  { tag: "exec", hue: "exec", text: "sandbox recycled · /tmp/triad_job_8f3a" },
  { tag: "memory", hue: "mem", text: "GET /health · 200 · records=27" },
  { tag: "brain", hue: "brain", text: 'route → {"action": "recall_memory"}' },
  { tag: "exec", hue: "exec", text: "rlimits armed · 2 GB RAM · 30 s wall clock" },
];

function PacketLog() {
  const [lines, setLines] = useState(SCRIPT.slice(0, 6));
  useEffect(() => {
    let i = 6;
    const t = window.setInterval(() => {
      setLines((prev) => [...prev.slice(-6), SCRIPT[i % SCRIPT.length]]);
      i += 1;
    }, 1600);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="overflow-hidden border border-line bg-pane">
      <div className="flex items-center justify-between border-b border-line bg-pane2/70 px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <Led hue="exec" />
          <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-dim">SWARM BUS · LIVE TRACE</span>
        </div>
        <span className="font-mono text-[10px] tracking-wider text-faint">10.0.0.0/24 · TCP</span>
      </div>
      <div className="flex h-[172px] flex-col justify-end gap-1 overflow-hidden px-4 py-3 font-mono text-[11.5px] leading-relaxed">
        {lines.map((l, i) => (
          <div key={`${l.text}-${i}`} className={i === lines.length - 1 ? "log-in" : ""}>
            <span className={`font-medium ${HUES[l.hue].text}`}>[{l.tag}]</span>{" "}
            <span className={i === lines.length - 1 ? "text-fog" : "text-dim"}>{l.text}</span>
          </div>
        ))}
        <div className="text-faint">
          <span className="caret text-brain">▍</span>
        </div>
      </div>
    </div>
  );
}

/* ── the swarm map ────────────────────────────────────────────── */
export default function Topology({ onOpenFile }: { onOpenFile: (id: string) => void }) {
  return (
    <section id="topology" className="mx-auto max-w-7xl px-5 pb-20 pt-14 md:px-8 md:pt-20">
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        {/* left — identity + spec sheet */}
        <div className="lg:col-span-5">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] font-medium tracking-[0.3em] text-brain">
              01 <span className="text-faint">//</span> <span className="text-dim">SWARM TOPOLOGY</span>
            </p>
            <h1 className="font-display text-[42px] font-bold leading-[1.02] tracking-tight text-fog md:text-6xl">
              THREE LAPTOPS.
              <br />
              <span
                className="text-transparent"
                style={{ WebkitTextStroke: "1.2px rgba(217,229,243,0.75)" }}
              >
                ONE SHARED MIND.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-dim">
              A distributed multi-agent system on a plain home LAN. The{" "}
              <span className="text-brain">Brain</span> reasons and routes, the{" "}
              <span className="text-exec">Executor</span> runs code in a sandbox, the{" "}
              <span className="text-mem">Memory</span> never forgets — wired together with
              FastAPI, LangChain and ChromaDB. No cloud, no API keys, one subnet.
            </p>
          </Reveal>

          <Reveal delay={120} className="mt-9">
            <dl className="max-w-md">
              {[
                ["ORCHESTRATION", "LangChain · requests over LAN"],
                ["REASONING", "glm4:latest · router + summariser"],
                ["CODE GEN", "qwen2.5-coder:7b · stdlib-only scripts"],
                ["EMBEDDINGS", "nomic-embed-text-v2-moe · Ollama"],
                ["VECTOR STORE", "ChromaDB · HNSW · cosine · on-disk"],
                ["EXECUTION", "subprocess · python -I · rlimits"],
              ].map(([k, v]) => (
                <div
                  key={k}
                  className="group flex items-baseline justify-between gap-4 border-t border-line py-2.5 transition-colors hover:border-line2"
                >
                  <dt className="font-mono text-[10px] tracking-[0.22em] text-faint transition-colors group-hover:text-dim">
                    {k}
                  </dt>
                  <dd className="text-right font-mono text-[11.5px] text-fog/90">{v}</dd>
                </div>
              ))}
              <div className="border-t border-line" />
            </dl>
          </Reveal>
        </div>

        {/* right — the live map */}
        <Reveal delay={80} className="lg:col-span-7">
          <div className="relative grid gap-4 overflow-hidden border border-line bg-pane/70 p-4 lg:block lg:h-[560px] lg:p-0">
            {/* blueprint grid inside the panel */}
            <div
              className="pointer-events-none absolute inset-0 opacity-60"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(122,162,205,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(122,162,205,0.06) 1px, transparent 1px)",
                backgroundSize: "28px 28px",
              }}
            />

            {/* packet lanes */}
            <svg
              className="absolute inset-0 hidden h-full w-full lg:block"
              viewBox="0 0 100 75"
              preserveAspectRatio="none"
              fill="none"
            >
              <path d="M38 36 L61.5 17" stroke="#2a3c56" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeDasharray="5 7" className="flow-line" />
              <path d="M38 40 L61.5 58" stroke="#2a3c56" strokeWidth="1.2" vectorEffect="non-scaling-stroke" strokeDasharray="5 7" className="flow-line" style={{ animationDelay: "-0.7s" }} />
              <circle r="0.55" fill="#64b5ff">
                <animateMotion dur="2.8s" repeatCount="indefinite" path="M38 36 L61.5 17" />
              </circle>
              <circle r="0.45" fill="#64b5ff" opacity="0.5">
                <animateMotion dur="2.8s" begin="1.4s" repeatCount="indefinite" path="M38 36 L61.5 17" />
              </circle>
              <circle r="0.55" fill="#6ee7a0">
                <animateMotion dur="3.4s" begin="0.6s" repeatCount="indefinite" path="M38 40 L61.5 58" />
              </circle>
              <circle r="0.45" fill="#6ee7a0" opacity="0.5">
                <animateMotion dur="3.4s" begin="2.3s" repeatCount="indefinite" path="M38 40 L61.5 58" />
              </circle>
            </svg>

            {/* lane labels */}
            <div className="absolute left-[49.5%] top-[35%] z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 border border-line bg-ink px-2 py-1 font-mono text-[9.5px] tracking-wider text-mem lg:flex">
              LAN · TCP 8000
            </div>
            <div className="absolute left-[49.5%] top-[65%] z-10 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 border border-line bg-ink px-2 py-1 font-mono text-[9.5px] tracking-wider text-exec lg:flex">
              LAN · TCP 8001
            </div>
            <div className="absolute left-[3%] top-[3.5%] z-10 hidden items-center border border-line bg-ink px-2 py-1 font-mono text-[9.5px] tracking-wider text-brain lg:flex">
              OLLAMA · :11434 · local
            </div>

            {/* node cards */}
            {NODES.map((n, i) => (
              <Reveal key={n.id} delay={150 + i * 110} className={n.pos}>
                <div
                  className={`relative z-10 border border-line bg-pane/95 p-4 transition-all duration-300 hover:-translate-y-0.5 ${n.hover}`}
                  style={{ boxShadow: "0 10px 30px -18px rgba(0,0,0,0.8)" }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Led hue={n.hue} />
                      <span className={`font-display text-[13px] font-bold tracking-[0.08em] ${HUES[n.hue].text}`}>
                        {n.role}
                      </span>
                    </div>
                    <span className="font-mono text-[9.5px] tracking-[0.18em] text-faint">{n.laptop}</span>
                  </div>

                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="font-mono text-[22px] font-medium leading-none text-fog">{n.ip}</span>
                    <span className={`font-mono text-[13px] ${HUES[n.hue].text}`}>{n.port}</span>
                  </div>

                  <div className="mt-3 space-y-1 border-t border-line pt-2.5">
                    {n.stack.map((s) => (
                      <p key={s} className="font-mono text-[10.5px] leading-relaxed text-dim">
                        <span className="text-faint">·</span> {s}
                      </p>
                    ))}
                  </div>

                  <button
                    onClick={() => onOpenFile(n.id)}
                    className={`mt-3.5 inline-flex items-center gap-1.5 border border-line2 px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.16em] text-dim transition-all duration-200 hover:border-current ${HUES[n.hue].text} hover:gap-2.5`}
                  >
                    OPEN SOURCE <ArrowUpRight className="h-3 w-3" />
                  </button>
                </div>
              </Reveal>
            ))}
          </div>

          <div className="mt-4">
            <PacketLog />
          </div>
        </Reveal>
      </div>
    </section>
  );
}
