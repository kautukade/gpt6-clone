import React from "react";

const KEYWORDS = new Set(
  "def class return if elif else for while import from as with try except finally raise pass lambda yield global nonlocal assert break continue in not and or is None True False async await del".split(" ")
);

const BUILTINS = new Set(
  "print len range str int float dict list tuple set bool enumerate zip open input type isinstance min max sum round sorted abs bytes Exception ValueError KeyError TypeError RuntimeError OSError".split(" ")
);

const CONSTANT_RE = /^[A-Z][A-Z0-9_]{2,}$/;

const TOKEN_SOURCE =
  '(#[^\\n]*)|("""[\\s\\S]*?"""|\'\'\'[\\s\\S]*?\'\'\')|("(?:\\\\.|[^"\\\\\\n])*"|\'(?:\\\\.|[^\'\\\\\\n])*\')|(@[A-Za-z_][\\w.]*)|([A-Za-z_]\\w*)|(\\d[\\d_]*(?:\\.\\d+)?)';

/**
 * Lightweight single-pass Python highlighter.
 * Group order: comment · triple-string · string · decorator · identifier · number
 */
export function HighlightPython({ code }: { code: string }): React.ReactElement {
  const re = new RegExp(TOKEN_SOURCE, "g");
  const out: React.ReactNode[] = [];
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(code))) {
    if (m.index > last) out.push(code.slice(last, m.index));
    const [, comment, tstr, str, deco, ident, num] = m;
    let cls = "";
    if (comment) cls = "tok-c";
    else if (tstr || str) cls = "tok-s";
    else if (deco) cls = "tok-d";
    else if (ident) {
      if (KEYWORDS.has(ident)) cls = "tok-k";
      else if (BUILTINS.has(ident)) cls = "tok-b";
      else if (CONSTANT_RE.test(ident)) cls = "tok-const";
      else {
        // identifier immediately followed by "(" → call / definition name
        const rest = code.slice(re.lastIndex);
        if (/^\s*\(/.test(rest)) cls = "tok-f";
      }
    } else if (num) cls = "tok-n";
    out.push(
      cls ? (
        <span key={key++} className={cls}>
          {m[0]}
        </span>
      ) : (
        m[0]
      )
    );
    last = re.lastIndex;
  }
  if (last < code.length) out.push(code.slice(last));
  return <>{out}</>;
}

/** requirements.txt — comments, package names, extras, version pins */
export function HighlightReqs({ code }: { code: string }): React.ReactElement {
  const lines = code.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        let node: React.ReactNode = line;
        const trimmed = line.trim();
        if (trimmed.startsWith("#")) {
          node = <span className="tok-c">{line}</span>;
        } else {
          const pm = line.match(/^([A-Za-z0-9_.\-]+)(\[[^\]]*\])?\s*([<>=!~][^\s#]*)(\s*#.*)?$/);
          if (pm) {
            node = (
              <>
                <span className="tok-f">{pm[1]}</span>
                {pm[2] && <span className="tok-s">{pm[2]}</span>}
                <span className="tok-k">{pm[3]}</span>
                {pm[4] && <span className="tok-c">{pm[4]}</span>}
              </>
            );
          }
        }
        return (
          <React.Fragment key={i}>
            {node}
            {i < lines.length - 1 ? "\n" : null}
          </React.Fragment>
        );
      })}
    </>
  );
}
