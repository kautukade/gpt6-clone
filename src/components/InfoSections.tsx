import { CopyBtn, HUES, Led, MethodChip, Reveal, SectionHead, type Hue } from "./ui";

/* ═══════════════ 02 · REQUEST LIFECYCLE ═══════════════ */

const STEPS: { n: string; title: string; hue: Hue; text: string }[] = [
  {
    n: "01",
    title: "GROUND",
    hue: "mem",
    text: "Every prompt first hits POST /memory/query on Laptop 3. The top-3 cosine-nearest facts become the router's working context — cheap, and it lets the Brain see what it already knows.",
  },
  {
    n: "02",
    title: "ROUTE",
    hue: "brain",
    text: "glm4:latest receives prompt + recalled context and must answer with one strict JSON object. The action field is the only switch that matters; malformed output safely falls back to a direct answer.",
  },
  {
    n: "03",
    title: "DISPATCH",
    hue: "exec",
    text: "answer, save and recall stay local or touch Memory only. run_code takes a detour: qwen2.5-coder:7b writes a stdlib-only script, and requests ships it to the Laptop 2 sandbox.",
  },
  {
    n: "04",
    title: "REPLY + REMEMBER",
    hue: "brain",
    text: "The Brain summarises the remote verdict in plain language for the user — then files successful computation results straight back into Memory, so the next prompt can build on them.",
  },
];

const ROUTER_JSON = `{
  "action": "answer | recall_memory | save_memory | run_code",
  "fact_to_save": "the fact to store (save_memory only, else '')",
  "code_task": "precise spec for the coder model (run_code only, else '')"
}`;

const MATRIX: { action: string; hue: Hue; nodes: { label: string; hue: Hue }[]; text: string }[] = [
  {
    action: "answer",
    hue: "brain",
    nodes: [{ label: "BRN", hue: "brain" }],
    text: "glm4 replies directly, optionally grounded in the facts Memory just recalled.",
  },
  {
    action: "save_memory",
    hue: "mem",
    nodes: [
      { label: "BRN", hue: "brain" },
      { label: "MEM", hue: "mem" },
    ],
    text: "fact_to_save is POSTed to /memory/add — the text is hashed into a stable id, so re-saves upsert.",
  },
  {
    action: "recall_memory",
    hue: "mem",
    nodes: [
      { label: "BRN", hue: "brain" },
      { label: "MEM", hue: "mem" },
    ],
    text: "A grounded answer assembled from the cosine-nearest memories, with scores from nomic-embed-text-v2-moe.",
  },
  {
    action: "run_code",
    hue: "exec",
    nodes: [
      { label: "BRN", hue: "brain" },
      { label: "EXE", hue: "exec" },
      { label: "MEM", hue: "mem" },
    ],
    text: "Coder writes → Executor runs in sandbox → Brain summarises → the result is filed back into Memory.",
  },
];

export function LifecycleSection() {
  return (
    <section id="lifecycle" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
      <SectionHead
        index="02"
        title="REQUEST LIFECYCLE · ANATOMY OF ONE PROMPT"
        blurb="Four phases, one JSON contract. The router never free-styles — it picks exactly one action, and that action decides which laptops wake up."
      />
      <div className="grid gap-10 lg:grid-cols-12 lg:gap-8">
        {/* phase rail */}
        <div className="lg:col-span-5">
          <ol className="relative space-y-8 before:absolute before:bottom-4 before:left-[13px] before:top-4 before:w-px before:bg-line">
            {STEPS.map((s, i) => (
              <Reveal key={s.n} delay={i * 90}>
                <li className="relative flex gap-5">
                  <span
                    className={`relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center border bg-ink font-mono text-[10px] font-bold ${HUES[s.hue].border} ${HUES[s.hue].text}`}
                  >
                    {s.n}
                  </span>
                  <div>
                    <h3 className={`font-display text-[15px] font-bold tracking-[0.1em] ${HUES[s.hue].text}`}>
                      {s.title}
                    </h3>
                    <p className="mt-1.5 text-[13.5px] leading-relaxed text-dim">{s.text}</p>
                  </div>
                </li>
              </Reveal>
            ))}
          </ol>
        </div>

        {/* router contract + dispatch matrix */}
        <div className="lg:col-span-7">
          <Reveal delay={120}>
            <div className="overflow-hidden border border-line bg-pane">
              <div className="flex items-center justify-between border-b border-line bg-pane2/70 px-4 py-2.5">
                <div className="flex items-center gap-2.5">
                  <Led hue="brain" />
                  <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-dim">
                    ROUTER CONTRACT · glm4:latest · temperature 0.2
                  </span>
                </div>
                <CopyBtn text={ROUTER_JSON} />
              </div>
              <pre className="code-scroll overflow-x-auto px-5 py-4 font-mono text-[12.5px] leading-[1.85]">
                <code>
                  <span className="text-faint">{"{"}</span>
                  {"\n  "}
                  <span className="tok-f">"action"</span>
                  <span className="text-faint">: </span>
                  <span className="tok-s">"answer | recall_memory | save_memory | run_code"</span>
                  <span className="text-faint">,</span>
                  {"\n  "}
                  <span className="tok-f">"fact_to_save"</span>
                  <span className="text-faint">: </span>
                  <span className="tok-s">"the fact to store (save_memory only, else '')"</span>
                  <span className="text-faint">,</span>
                  {"\n  "}
                  <span className="tok-f">"code_task"</span>
                  <span className="text-faint">: </span>
                  <span className="tok-s">"precise spec for the coder model (run_code only, else '')"</span>
                  {"\n"}
                  <span className="text-faint">{"}"}</span>
                </code>
              </pre>
            </div>
          </Reveal>

          <div className="mt-6 space-y-2.5">
            {MATRIX.map((m, i) => (
              <Reveal key={m.action} delay={i * 80}>
                <div
                  className="group flex flex-col gap-2.5 border border-line border-l-2 bg-pane px-4 py-3.5 transition-all duration-200 hover:bg-pane2/70 sm:flex-row sm:items-center sm:gap-4"
                  style={{ borderLeftColor: HUES[m.hue].hex }}
                >
                  <span className={`w-36 shrink-0 font-mono text-[12px] font-bold ${HUES[m.hue].text}`}>
                    {m.action}
                  </span>
                  <span className="flex shrink-0 items-center gap-2">
                    {m.nodes.map((nd) => (
                      <span key={nd.label} className="inline-flex items-center gap-1.5 border border-line bg-ink px-1.5 py-0.5">
                        <Led hue={nd.hue} pulse={false} className="h-1.5 w-1.5" />
                        <span className="font-mono text-[9px] tracking-wider text-dim">{nd.label}</span>
                      </span>
                    ))}
                  </span>
                  <span className="text-[12.5px] leading-relaxed text-dim">{m.text}</span>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ═══════════════ 04 · API CONTRACT ═══════════════ */

interface ApiRow {
  method: string;
  path: string;
  detail: string;
}

const MEMORY_API: ApiRow[] = [
  { method: "GET", path: "/health", detail: "— → {status, records, embed_model, uptime_s}" },
  { method: "POST", path: "/memory/add", detail: "{text, metadata?} → {id, status, total_records}" },
  { method: "POST", path: "/memory/query", detail: "{query, n_results ≤ 20} → [{id, text, score, metadata}]" },
  { method: "DELETE", path: "/memory/{id}", detail: "— → {status: 'forgotten'} · 404 when unknown" },
  { method: "GET", path: "/memory/stats", detail: "— → {collection, records, model}" },
];

const EXECUTOR_API: ApiRow[] = [
  { method: "GET", path: "/health", detail: "— → {python, platform, cpus, uptime_s}" },
  { method: "POST", path: "/execute", detail: "{code, timeout ≤ 300} → {stdout, stderr, exit_code, timed_out, duration_s}" },
];

const ENV_VARS: { v: string; d: string; note: string; node: string; hue: Hue }[] = [
  { v: "OLLAMA_URL", d: "http://localhost:11434", note: "local model server on the Brain", node: "L1", hue: "brain" },
  { v: "MEMORY_URL", d: "http://10.0.0.11:8000", note: "Memory node base URL", node: "L1", hue: "brain" },
  { v: "EXECUTOR_URL", d: "http://10.0.0.12:8001", note: "Executor node base URL", node: "L1", hue: "brain" },
  { v: "REASON_MODEL", d: "glm4:latest", note: "router, chat & summariser", node: "L1", hue: "brain" },
  { v: "CODE_MODEL", d: "qwen2.5-coder:7b", note: "writes the scripts, never runs them", node: "L1", hue: "brain" },
  { v: "MEMORY_OLLAMA_URL", d: "http://10.0.0.10:11434", note: "where Memory borrows the embedder", node: "L3", hue: "mem" },
  { v: "MEMORY_EMBED_MODEL", d: "nomic-embed-text-v2-moe", note: "embedding model name in Ollama", node: "L3", hue: "mem" },
];

function ApiPanel({ title, base, hue, rows, foot }: { title: string; base: string; hue: Hue; rows: ApiRow[]; foot?: string[] }) {
  const h = HUES[hue];
  return (
    <div className="overflow-hidden border border-line bg-pane">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-pane2/70 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Led hue={hue} />
          <span className={`font-display text-[13px] font-bold tracking-[0.1em] ${h.text}`}>{title}</span>
        </div>
        <span className={`border px-2 py-0.5 font-mono text-[10px] tracking-wider ${h.border} ${h.soft} ${h.text}`}>{base}</span>
      </div>
      <div>
        {rows.map((r) => (
          <div
            key={r.path}
            className="group flex flex-col gap-1.5 border-b border-line/70 px-4 py-3 transition-colors last:border-b-0 hover:bg-pane2/60 sm:flex-row sm:items-center sm:gap-3"
          >
            <MethodChip method={r.method} />
            <span className="w-40 shrink-0 font-mono text-[12px] text-fog">{r.path}</span>
            <span className="font-mono text-[11px] leading-relaxed text-faint transition-colors group-hover:text-dim">
              {r.detail}
            </span>
          </div>
        ))}
      </div>
      {foot && (
        <div className="border-t border-line bg-ink/60 px-4 py-3">
          {foot.map((f) => (
            <p key={f} className="font-mono text-[10.5px] leading-relaxed text-faint">
              <span className={h.text}>▸</span> {f}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ApiSection() {
  return (
    <section id="api" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
      <SectionHead
        index="04"
        title="API CONTRACT · EVERY CALL ON THE WIRE"
        blurb="Two tiny HTTP surfaces, fully described by Pydantic schemas — both nodes serve interactive Swagger docs at /docs. Everything below is plain JSON over the LAN."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Reveal>
          <ApiPanel
            title="THE MEMORY"
            base="http://10.0.0.11:8000"
            hue="mem"
            rows={MEMORY_API}
            foot={[
              "score = 1 − cosine distance · 1.0 means identical",
              "ids are SHA-1(text)[:16] — re-adding a fact upserts it",
              "vectors persist under ./chroma_data across restarts",
            ]}
          />
        </Reveal>
        <Reveal delay={120}>
          <ApiPanel
            title="THE EXECUTOR"
            base="http://10.0.0.12:8001"
            hue="exec"
            rows={EXECUTOR_API}
            foot={[
              "fresh interpreter per job · python -I isolated mode",
              "temp-dir cwd, deleted the instant the job ends",
              "hard timeout kills the child · POSIX rlimits: CPU / 2 GB RAM / 50 MB writes",
              "stdout & stderr truncated at 100 KB",
            ]}
          />
        </Reveal>
      </div>

      <Reveal delay={160} className="mt-6">
        <div className="overflow-hidden border border-line bg-pane">
          <div className="flex items-center gap-2.5 border-b border-line bg-pane2/70 px-4 py-3">
            <Led hue="slate" />
            <span className="font-display text-[13px] font-bold tracking-[0.1em] text-dim">
              ENV OVERRIDES · RETUNE THE SWARM WITHOUT EDITING CODE
            </span>
          </div>
          <div className="grid grid-cols-[auto_auto_1fr] gap-x-0 overflow-x-auto">
            {ENV_VARS.map((e, i) => (
              <div key={e.v} className={`contents`}>
                <div className={`flex items-center gap-2.5 whitespace-nowrap px-4 py-2.5 font-mono text-[11.5px] text-fog ${i % 2 ? "bg-ink/40" : ""}`}>
                  <span className={`border px-1 py-px font-mono text-[8.5px] tracking-wider ${HUES[e.hue].border} ${HUES[e.hue].text}`}>
                    {e.node}
                  </span>
                  {e.v}
                </div>
                <div className={`whitespace-nowrap px-4 py-2.5 font-mono text-[11.5px] text-brain/90 ${i % 2 ? "bg-ink/40" : ""}`}>
                  {e.d}
                </div>
                <div className={`min-w-[220px] px-4 py-2.5 font-mono text-[11px] text-faint ${i % 2 ? "bg-ink/40" : ""}`}>
                  {e.note}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Reveal>
    </section>
  );
}
