import { CheckIcon, HUES, Led, Reveal, SectionHead, TermBlock, type TermLine } from "./ui";

const CHECKLIST = [
  ["Copy all four files to every laptop", "same project folder on each machine — the scripts are fully self-contained."],
  ["Python 3.10+ venv + dependencies", "run the venv block below on all three; one requirements.txt covers everyone."],
  ["Pull the models on Laptop 1", "glm4:latest, qwen2.5-coder:7b — and expose Ollama on 0.0.0.0 so Laptop 3 can borrow the embedder."],
  ["Open the firewall ports", "TCP 8000 inbound on Laptop 3 · TCP 8001 on Laptop 2 · TCP 11434 on Laptop 1."],
] as const;

const BOOT_STEPS: { step: string; title: string; hue: "mem" | "exec" | "brain"; lines: TermLine[] }[] = [
  {
    step: "STEP 1",
    title: "LAPTOP 3 · 10.0.0.11 · start the Memory",
    hue: "mem",
    lines: [
      { cmd: "python memory_node.py" },
      { tag: { text: "memory", hue: "mem" }, out: "chroma @ ./chroma_data · embedder nomic-embed-text-v2-moe via http://10.0.0.10:11434" },
      { out: "INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)" },
    ],
  },
  {
    step: "STEP 2",
    title: "LAPTOP 2 · 10.0.0.12 · start the Executor",
    hue: "exec",
    lines: [
      { cmd: "python executor_node.py" },
      { tag: { text: "executor", hue: "exec" }, out: "sandbox ready · python 3.11.9 · 8 cpus" },
      { out: "INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)" },
    ],
  },
  {
    step: "STEP 3",
    title: "LAPTOP 1 · 10.0.0.10 · start the Brain",
    hue: "brain",
    lines: [
      { comment: "# one-time: fetch the two minds" },
      { cmd: "ollama pull glm4:latest" },
      { cmd: "ollama pull qwen2.5-coder:7b" },
      { comment: "# expose Ollama to the LAN (separate terminal) — Laptop 3 embeds through it" },
      { cmd: "OLLAMA_HOST=0.0.0.0:11434 ollama serve" },
      { comment: "# then launch the orchestrator" },
      { cmd: "python brain_node.py" },
      { tag: { text: "memory", hue: "mem" }, out: "http://10.0.0.11:8000 → ONLINE" },
      { tag: { text: "exec", hue: "exec" }, out: "http://10.0.0.12:8001 → ONLINE" },
      { tag: { text: "brain", hue: "brain" }, out: "reasoning=glm4:latest · coding=qwen2.5-coder:7b @ http://localhost:11434" },
    ],
  },
];

const SMOKE: TermLine[] = [
  { comment: "# from any laptop on the LAN — verify each node answers" },
  { cmd: 'curl http://10.0.0.11:8000/health' },
  { out: '{"node":"memory","status":"ok","records":0,"embed_model":"nomic-embed-text-v2-moe","uptime_s":12.4}' },
  { cmd: 'curl -X POST http://10.0.0.11:8000/memory/add -H "Content-Type: application/json" -d \'{"text":"TRIAD swarm is online"}\'' },
  { out: '{"id":"3f9a21c8b7e04d55","status":"stored","total_records":1}' },
  { cmd: 'curl -X POST http://10.0.0.12:8001/execute -H "Content-Type: application/json" -d \'{"code":"print(sum(range(101)))"}\'' },
  { out: '{"stdout":"5050\\n","stderr":"","exit_code":0,"timed_out":false,"duration_s":0.061}' },
];

export default function DeploySection() {
  return (
    <section id="deploy" className="mx-auto max-w-7xl px-5 py-20 md:px-8">
      <SectionHead
        index="05"
        title="DEPLOYMENT RUNBOOK · BOOT THE SWARM"
        blurb="Workers first, Brain last. Each node degrades gracefully — the Brain boots even if a worker is dark, and tells you exactly what is missing."
      />

      <div className="grid gap-8 lg:grid-cols-12">
        {/* pre-flight */}
        <div className="lg:col-span-5">
          <Reveal>
            <div className="border border-line bg-pane">
              <div className="flex items-center gap-2.5 border-b border-line bg-pane2/70 px-4 py-3">
                <Led hue="slate" />
                <span className="font-mono text-[11px] font-medium tracking-[0.18em] text-dim">PRE-FLIGHT · ONCE PER MACHINE</span>
              </div>
              <div>
                {CHECKLIST.map(([title, sub], i) => (
                  <div key={title} className="group flex gap-3.5 border-b border-line/70 px-4 py-3.5 transition-colors last:border-b-0 hover:bg-pane2/50">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center border border-exec/40 bg-exec/10 text-exec">
                      <CheckIcon className="h-3 w-3" />
                    </span>
                    <div>
                      <p className="text-[13.5px] font-medium text-fog">
                        <span className="mr-2 font-mono text-[10px] text-faint">{String(i + 1).padStart(2, "0")}</span>
                        {title}
                      </p>
                      <p className="mt-1 text-[12.5px] leading-relaxed text-dim">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>

          <Reveal delay={120} className="mt-6">
            <TermBlock
              title="ALL LAPTOPS · environment"
              hue="slate"
              lines={[
                { cmd: "python -m venv .venv" },
                { cmd: "source .venv/bin/activate   # Windows: .venv\\Scripts\\activate" },
                { cmd: "pip install -r requirements.txt" },
              ]}
            />
          </Reveal>

          <Reveal delay={160} className="mt-6">
            <div className="border border-line bg-pane px-4 py-3.5">
              <p className="font-mono text-[10px] tracking-[0.2em] text-brain">OPTIONAL · EMBED LOCALLY</p>
              <p className="mt-2 text-[12.5px] leading-relaxed text-dim">
                Prefer Laptop 3 to embed on its own hardware? Pull{" "}
                <span className="font-mono text-[11.5px] text-mem">nomic-embed-text-v2-moe</span> there and start it with{" "}
                <span className="font-mono text-[11.5px] text-fog">MEMORY_OLLAMA_URL=http://localhost:11434</span>.
              </p>
            </div>
          </Reveal>
        </div>

        {/* boot sequence */}
        <div className="lg:col-span-7">
          {BOOT_STEPS.map((s, i) => (
            <Reveal key={s.step} delay={i * 100} className={i > 0 ? "mt-3" : ""}>
              {i > 0 && (
                <div className="mb-3 flex items-center gap-3 pl-1">
                  <span className={`h-px flex-1 bg-gradient-to-r from-line2 to-transparent`} />
                  <span className="font-mono text-[10px] tracking-[0.25em] text-faint">THEN</span>
                  <span className={`h-px flex-1 bg-gradient-to-l from-line2 to-transparent`} />
                </div>
              )}
              <div className="relative">
                <span
                  className={`absolute -left-px -top-px z-10 border border-line bg-ink px-2 py-1 font-mono text-[9.5px] font-bold tracking-[0.2em] ${HUES[s.hue].text} ${HUES[s.hue].border}`}
                >
                  {s.step}
                </span>
                <TermBlock title={s.title} hue={s.hue} lines={s.lines} className="pt-0" />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* smoke test + live session */}
      <div className="mt-12 grid gap-6 lg:grid-cols-2">
        <Reveal>
          <TermBlock title="SMOKE TEST · from any laptop on the LAN" hue="exec" lines={SMOKE} />
        </Reveal>

        <Reveal delay={120}>
          <div className="flex h-full flex-col overflow-hidden border border-line bg-pane">
            <div className="flex items-center justify-between border-b border-line bg-pane2/70 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <Led hue="brain" />
                <span className="font-mono text-[11px] font-medium tracking-[0.16em] text-dim">LIVE SESSION · ONE FULL TURN</span>
              </div>
              <span className="font-mono text-[10px] tracking-wider text-faint">brain_node.py</span>
            </div>
            <div className="code-scroll flex-1 overflow-x-auto px-4 py-3.5 font-mono text-[12px] leading-[1.95]">
              <div className="whitespace-pre"><span className="text-brain">you ▸ </span><span className="text-fog">Compute the first 15 Fibonacci numbers</span></div>
              <div className="whitespace-pre"><span className="text-mem">[memory]</span> <span className="text-dim">recalled 0 relevant memories</span></div>
              <div className="whitespace-pre"><span className="text-brain">[brain]</span> <span className="text-dim">route → </span><span className="font-bold text-fog">run_code</span></div>
              <div className="whitespace-pre"><span className="text-brain">[brain]</span> <span className="text-dim">coder spec → print the first 15 Fibonacci numbers</span></div>
              <div className="whitespace-pre"><span className="text-exec">[exec]</span> <span className="text-dim">running 6 lines on 10.0.0.12 …</span></div>
              <div className="whitespace-pre text-faint">── stdout ──</div>
              <div className="whitespace-pre text-fog">0 1 1 2 3 5 8 13 21 34 55 89 144 233 377</div>
              <div className="whitespace-pre"><span className="text-brain">[brain]</span> <span className="text-dim">The script built the sequence iteratively — the 15th value is 377.</span></div>
              <div className="whitespace-pre"><span className="text-mem">[memory]</span> <span className="text-dim">stored · id=7c19be02 · source=executor</span></div>
              <div className="whitespace-pre">&nbsp;</div>
              <div className="whitespace-pre"><span className="text-brain">you ▸ </span><span className="text-fog">What did I just ask you to compute?</span></div>
              <div className="whitespace-pre"><span className="text-mem">[memory]</span> <span className="text-dim">recalled 1 relevant memory</span></div>
              <div className="whitespace-pre"><span className="text-brain">[brain]</span> <span className="text-dim">route → </span><span className="font-bold text-fog">recall_memory</span></div>
              <div className="whitespace-pre"><span className="text-brain">[brain]</span> <span className="text-dim">You asked for the first 15 Fibonacci numbers — result: 0 … 377.</span></div>
              <div className="whitespace-pre"><span className="caret text-brain">you ▸ ▍</span></div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
