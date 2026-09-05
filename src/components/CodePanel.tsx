import { FILES, type SourceFile } from "../data/sources";
import { HighlightPython, HighlightReqs } from "../lib/highlight";
import { CopyBtn, DownloadIcon, HUES, Led, MethodChip, Reveal } from "./ui";

function download(f: SourceFile) {
  const blob = new Blob([f.code], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = f.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function CodePanel({
  activeId,
  onSelect,
}: {
  activeId: string;
  onSelect: (id: string) => void;
}) {
  const file = FILES.find((f) => f.id === activeId) ?? FILES[0];
  const hue = HUES[file.hue];
  const lineCount = file.code.split("\n").length - (file.code.endsWith("\n") ? 1 : 0);
  const kb = (new Blob([file.code]).size / 1024).toFixed(1);

  return (
    <Reveal>
      {/* tab rail */}
      <div className="flex flex-wrap gap-1 border border-line bg-pane p-1.5">
        {FILES.map((f) => {
          const h = HUES[f.hue];
          const active = f.id === activeId;
          return (
            <button
              key={f.id}
              onClick={() => onSelect(f.id)}
              className={`flex items-center gap-2 px-3.5 py-2.5 font-mono text-[12px] transition-all duration-200 ${
                active
                  ? `${h.soft} ${h.text} shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]`
                  : "text-dim hover:bg-pane2 hover:text-fog"
              }`}
            >
              <Led hue={f.hue} pulse={active} className={active ? "" : "opacity-40"} />
              {f.name}
              <span className={`hidden text-[9px] tracking-[0.14em] sm:inline ${active ? h.text : "text-faint"}`}>
                {f.laptop}
              </span>
            </button>
          );
        })}
      </div>

      {/* file panel */}
      <div key={file.id} className="panel-in -mt-px border border-line bg-pane">
        {/* meta bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-pane2/60 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={`font-mono text-[13.5px] font-bold ${hue.text}`}>{file.name}</span>
            <span className={`border px-2 py-0.5 font-mono text-[9.5px] tracking-[0.14em] ${hue.border} ${hue.soft} ${hue.text}`}>
              {file.laptop} · {file.ip}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="mr-1 hidden font-mono text-[10px] tracking-wider text-faint md:inline">
              {lineCount} LINES · {kb} KB · UTF-8
            </span>
            <button
              onClick={() => download(file)}
              className="inline-flex items-center gap-1.5 border border-line2 bg-pane2 px-2.5 py-1.5 font-mono text-[10px] font-medium tracking-[0.14em] text-dim transition-all duration-200 hover:border-exec/60 hover:text-fog active:scale-95"
            >
              <DownloadIcon className="h-3 w-3" /> SAVE
            </button>
            <CopyBtn text={file.code} label="COPY ALL" />
          </div>
        </div>

        {/* blurb */}
        <p className="border-b border-line bg-pane2/30 px-4 py-3 text-[13.5px] leading-relaxed text-dim">
          {file.blurb}
        </p>

        {/* endpoint chips */}
        <div className="flex flex-wrap items-center gap-2 border-b border-line px-4 py-2.5">
          <span className="font-mono text-[9.5px] tracking-[0.2em] text-faint">SURFACE //</span>
          {file.endpoints.map((e) => (
            <span key={e.path} className="inline-flex items-center gap-1.5 border border-line bg-ink px-2 py-1">
              <MethodChip method={e.method} />
              <span className="font-mono text-[11px] text-fog/90">{e.path}</span>
            </span>
          ))}
        </div>

        {/* code well */}
        <div className="code-scroll max-h-[560px] overflow-auto bg-[#0b121c]">
          <div className="flex min-w-max">
            <div
              aria-hidden
              className="sticky left-0 select-none border-r border-line/70 bg-[#0b121c] py-4 pl-4 pr-3 text-right font-mono text-[12px] leading-[1.75] text-[#33486a]"
            >
              {Array.from({ length: lineCount }, (_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <pre className="whitespace-pre py-4 pl-4 pr-8 font-mono text-[12.5px] leading-[1.75] text-[#c7d5e8]">
              <code>{file.lang === "python" ? <HighlightPython code={file.code} /> : <HighlightReqs code={file.code} />}</code>
            </pre>
          </div>
        </div>
      </div>
    </Reveal>
  );
}
