export interface SourceFile {
  id: string;
  name: string;
  laptop: string;
  ip: string;
  role: string;
  hue: "brain" | "exec" | "mem" | "slate";
  lang: "python" | "text";
  blurb: string;
  endpoints: { method: string; path: string }[];
  code: string;
}

// Backticks can't live literally inside template strings — interpolate them.
const T = "```";
const B = "`";

/* ─────────────────────────────────────────────────────────────────
   requirements.txt — shared by all three laptops
   ───────────────────────────────────────────────────────────────── */
const REQUIREMENTS = String.raw`# ════════════════════════════════════════════════════════════════
# TRIAD//LAN — shared dependencies.
# Install this ONE file on all three laptops (simplest), or trim:
#   Laptop 3 needs: fastapi, uvicorn, chromadb, pydantic
#   Laptop 2 needs: fastapi, uvicorn, pydantic
#   Laptop 1 needs: langchain, langchain-community,
#                   langchain-ollama, requests
# ════════════════════════════════════════════════════════════════

# ── Web framework + ASGI server (Laptop 2 & 3) ──────────────────
fastapi>=0.110.0
uvicorn[standard]>=0.29.0

# ── Laptop 3 · Memory node (vector store) ───────────────────────
chromadb>=0.5.0

# ── Laptop 1 · Brain node (LLM orchestration) ───────────────────
langchain>=0.3.0
langchain-community>=0.3.0
langchain-ollama>=0.2.0

# ── Inter-node transport (Brain → Memory / Executor) ────────────
requests>=2.31.0

# ── Validation schemas (all nodes) ──────────────────────────────
pydantic>=2.6.0
`;

/* ─────────────────────────────────────────────────────────────────
   memory_node.py — Laptop 3 · 10.0.0.11 · ChromaDB + FastAPI :8000
   ───────────────────────────────────────────────────────────────── */
const MEMORY_NODE = String.raw`"""
memory_node.py  —  LAPTOP 3 · 10.0.0.11 · "THE MEMORY"
═══════════════════════════════════════════════════════
Long-term vector memory of the swarm: a persistent ChromaDB collection
behind a tiny FastAPI service. The Brain (Laptop 1) saves and recalls
facts over the LAN; embeddings come from Ollama's 'nomic-embed-text-v2-moe'.

Run:   python memory_node.py            →  http://0.0.0.0:8000
Docs:  http://10.0.0.11:8000/docs       (interactive Swagger UI)

The embedder points at the Ollama instance on the Brain by default —
set MEMORY_OLLAMA_URL=http://localhost:11434 (and pull the model here)
if you would rather embed on this laptop instead.
"""

from __future__ import annotations

import hashlib
import os
import time
from typing import Any, Dict, List, Optional

import chromadb
import uvicorn
from chromadb.utils import embedding_functions
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

# ─── Configuration ───────────────────────────────────────────────
OLLAMA_URL  = os.getenv("MEMORY_OLLAMA_URL", "http://10.0.0.10:11434")
EMBED_MODEL = os.getenv("MEMORY_EMBED_MODEL", "nomic-embed-text-v2-moe")
CHROMA_PATH = os.getenv("MEMORY_CHROMA_PATH", "./chroma_data")  # on-disk store
COLLECTION  = "agent_memory"
START_TIME  = time.time()

# ─── Vector store bootstrap ──────────────────────────────────────
app = FastAPI(title="TRIAD Memory Node", version="1.0.0")

# PersistentClient ⇒ vectors survive restarts (SQLite + HNSW on disk).
client = chromadb.PersistentClient(path=CHROMA_PATH)

# Chroma calls Ollama's /api/embeddings itself — this node needs no GPU,
# the model just has to be pulled on the machine behind OLLAMA_URL.
embedder = embedding_functions.OllamaEmbeddingFunction(
    url=f"{OLLAMA_URL}/api/embeddings",
    model_name=EMBED_MODEL,
)

# get_or_create with the SAME embedder every boot — otherwise persisted
# queries would silently run against a different vector space.
collection = client.get_or_create_collection(
    name=COLLECTION,
    embedding_function=embedder,
    metadata={"hnsw:space": "cosine"},   # cosine similarity for text
)


# ─── Request / response schemas ──────────────────────────────────
class AddRequest(BaseModel):
    text: str = Field(..., min_length=1, description="content to remember")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1)
    n_results: int = Field(default=3, ge=1, le=20)


class MemoryRecord(BaseModel):
    id: str
    text: str
    score: float            # cosine similarity — 1.0 means "identical"
    metadata: Dict[str, Any]


# ─── Endpoints ───────────────────────────────────────────────────
@app.get("/health")
def health() -> Dict[str, Any]:
    """Liveness probe — the Brain calls this at boot and on /status."""
    return {
        "node": "memory",
        "status": "ok",
        "records": collection.count(),
        "embed_model": EMBED_MODEL,
        "uptime_s": round(time.time() - START_TIME, 1),
    }


@app.post("/memory/add")
def add_memory(req: AddRequest) -> Dict[str, Any]:
    """Store a fact/document. The id is a hash of the text, so adding
    the same fact twice UPSERTS instead of duplicating it."""
    record_id = hashlib.sha1(req.text.encode("utf-8")).hexdigest()[:16]
    meta = dict(req.metadata or {})
    meta.setdefault("saved_at", time.strftime("%Y-%m-%d %H:%M:%S"))
    collection.upsert(ids=[record_id], documents=[req.text], metadatas=[meta])
    return {"id": record_id, "status": "stored", "total_records": collection.count()}


@app.post("/memory/query", response_model=List[MemoryRecord])
def query_memory(req: QueryRequest) -> List[Dict[str, Any]]:
    """Semantic search: the n memories closest to the query text."""
    total = collection.count()
    if total == 0:
        return []
    hits = collection.query(
        query_texts=[req.query],
        n_results=min(req.n_results, total),
    )
    return [
        {
            "id": doc_id,
            "text": doc,
            "score": round(1.0 - dist, 4),   # cosine distance → similarity
            "metadata": meta or {},
        }
        for doc_id, doc, dist, meta in zip(
            hits["ids"][0],
            hits["documents"][0],
            hits["distances"][0],
            hits["metadatas"][0],
        )
    ]


@app.delete("/memory/{record_id}")
def forget(record_id: str) -> Dict[str, str]:
    """Delete one memory by id (404 when the id is unknown)."""
    try:
        collection.delete(ids=[record_id])
    except Exception as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    return {"status": "forgotten", "id": record_id}


@app.get("/memory/stats")
def stats() -> Dict[str, Any]:
    """Quick introspection: how much does the swarm remember?"""
    return {"collection": COLLECTION, "records": collection.count(), "model": EMBED_MODEL}


if __name__ == "__main__":
    print(f"[memory] chroma @ {CHROMA_PATH} · embedder {EMBED_MODEL} via {OLLAMA_URL}")
    uvicorn.run(app, host="0.0.0.0", port=8000, log_level="info")
`;

/* ─────────────────────────────────────────────────────────────────
   executor_node.py — Laptop 2 · 10.0.0.12 · sandboxed FastAPI :8001
   ───────────────────────────────────────────────────────────────── */
const EXECUTOR_NODE = String.raw`"""
executor_node.py  —  LAPTOP 2 · 10.0.0.12 · "THE EXECUTOR"
═══════════════════════════════════════════════════════════
The hands of the swarm. Receives Python source from the Brain, runs it
in a disposable sandbox — fresh interpreter, temp directory, isolated
mode, hard timeout, POSIX resource limits — and ships the verdict
(stdout / stderr / exit code / duration) back over the LAN.

Run:   python executor_node.py          →  http://0.0.0.0:8001
Docs:  http://10.0.0.12:8001/docs
"""

from __future__ import annotations

import os
import platform
import subprocess
import sys
import tempfile
import time
from typing import Any, Dict

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel, Field

MAX_OUTPUT_BYTES = 100_000   # truncate runaway prints
DEFAULT_TIMEOUT  = 30        # seconds of wall-clock per job
MAX_TIMEOUT      = 300       # clients may ask for at most 5 minutes
START_TIME       = time.time()

app = FastAPI(title="TRIAD Executor Node", version="1.0.0")


def _posix_resource_limits() -> None:
    """Runs inside the forked child (Linux/macOS): caps CPU time, RAM
    and file size so one bad job cannot eat the whole laptop. Windows
    has no ${B}resource${B} module — there we rely on the timeout alone."""
    try:
        import resource
        resource.setrlimit(resource.RLIMIT_CPU, (DEFAULT_TIMEOUT, DEFAULT_TIMEOUT))
        resource.setrlimit(resource.RLIMIT_AS, (2 * 1024**3,) * 2)      # 2 GB RAM
        resource.setrlimit(resource.RLIMIT_FSIZE, (50 * 1024**2,) * 2)  # 50 MB writes
    except (ImportError, ValueError):
        pass


class ExecuteRequest(BaseModel):
    code: str = Field(..., min_length=1, description="Python 3 source to run")
    timeout: int = Field(default=DEFAULT_TIMEOUT, ge=1, le=MAX_TIMEOUT)


def _truncate(blob: str) -> str:
    if len(blob) > MAX_OUTPUT_BYTES:
        return blob[:MAX_OUTPUT_BYTES] + f"\n…[truncated at {MAX_OUTPUT_BYTES} bytes]"
    return blob


@app.get("/health")
def health() -> Dict[str, Any]:
    """Liveness probe + a fingerprint of the machine doing the work."""
    return {
        "node": "executor",
        "status": "ok",
        "python": sys.version.split()[0],
        "platform": platform.platform(),
        "cpus": os.cpu_count(),
        "uptime_s": round(time.time() - START_TIME, 1),
    }


@app.post("/execute")
def execute(req: ExecuteRequest) -> Dict[str, Any]:
    """
    Sandboxed execution pipeline:
      1. write the code into a throw-away temp dir (that becomes the cwd);
      2. spawn a FRESH interpreter with ${B}python -I${B} (isolated: no user
         site-packages, no inherited env vars) — the API process itself
         never imports or eval()s untrusted code;
      3. enforce the wall-clock timeout and kill the child on overruns;
      4. return stdout / stderr / exit code / duration, truncated.
    """
    started = time.perf_counter()

    with tempfile.TemporaryDirectory(prefix="triad_job_") as sandbox:
        script = os.path.join(sandbox, "job.py")
        with open(script, "w", encoding="utf-8") as fh:
            fh.write(req.code)

        try:
            proc = subprocess.run(
                [sys.executable, "-I", script],
                capture_output=True,
                text=True,
                timeout=req.timeout,
                cwd=sandbox,
                preexec_fn=_posix_resource_limits if os.name == "posix" else None,
            )
            stdout, stderr, exit_code, timed_out = (
                proc.stdout or "", proc.stderr or "", proc.returncode, False,
            )
        except subprocess.TimeoutExpired as exc:
            # subprocess already killed the child; report what we saw.
            stdout = exc.stdout.decode(errors="replace") if isinstance(exc.stdout, bytes) else (exc.stdout or "")
            stderr = exc.stderr.decode(errors="replace") if isinstance(exc.stderr, bytes) else (exc.stderr or "")
            stderr += f"\n[killed after {req.timeout}s — timeout]"
            exit_code, timed_out = -1, True

    return {
        "stdout": _truncate(stdout),
        "stderr": _truncate(stderr),
        "exit_code": exit_code,
        "timed_out": timed_out,
        "duration_s": round(time.perf_counter() - started, 3),
    }


if __name__ == "__main__":
    print(f"[executor] sandbox ready · python {sys.version.split()[0]} · {os.cpu_count()} cpus")
    uvicorn.run(app, host="0.0.0.0", port=8001, log_level="info")
`;

/* ─────────────────────────────────────────────────────────────────
   brain_node.py — Laptop 1 · 10.0.0.10 · LangChain orchestrator CLI
   ───────────────────────────────────────────────────────────────── */
const BRAIN_NODE = String.raw`"""
brain_node.py  —  LAPTOP 1 · 10.0.0.10 · "THE BRAIN"
═════════════════════════════════════════════════════
Main orchestrator of the swarm. Runs on the laptop with Ollama and:

  1. reads prompts from a CLI loop,
  2. peeks into long-term memory on Laptop 3 (grounding),
  3. asks the *router* model (glm4:latest) for a single JSON decision,
  4. executes that decision — answering directly, saving/recalling
     memory, or having the *coder* model (qwen2.5-coder:7b) write
     Python that Laptop 2 executes inside its sandbox,
  5. summarises remote results back to the user in plain language.

Run:      python brain_node.py
Requires: ollama pull glm4:latest && ollama pull qwen2.5-coder:7b
"""

from __future__ import annotations

import json
import os
import re
from typing import Any, Dict, List, Optional

import requests
from langchain_ollama import ChatOllama

# ─── Swarm addresses (override via env vars) ─────────────────────
OLLAMA_URL   = os.getenv("OLLAMA_URL", "http://localhost:11434")   # this laptop
MEMORY_URL   = os.getenv("MEMORY_URL", "http://10.0.0.11:8000")    # Laptop 3
EXECUTOR_URL = os.getenv("EXECUTOR_URL", "http://10.0.0.12:8001")  # Laptop 2
REASON_MODEL = os.getenv("REASON_MODEL", "glm4:latest")            # router + chat
CODE_MODEL   = os.getenv("CODE_MODEL", "qwen2.5-coder:7b")         # writes Python
HTTP_TIMEOUT = 10   # seconds for control calls (recall / save / health)

# ─── The two specialist minds ────────────────────────────────────
# reasoner: decides *what to do* and talks to the human.
reasoner = ChatOllama(model=REASON_MODEL, base_url=OLLAMA_URL, temperature=0.2)
# coder: only ever writes Python. Never routes, never chats.
coder = ChatOllama(model=CODE_MODEL, base_url=OLLAMA_URL, temperature=0.0)

# Minimal ANSI palette so the CLI stays dependency-free.
AMBER, BLUE, GREEN, DIM, BOLD, RED, RESET = (
    "\033[38;5;214m", "\033[38;5;111m", "\033[38;5;114m",
    "\033[2m", "\033[1m", "\033[38;5;203m", "\033[0m",
)


def say(tag: str, msg: str) -> None:
    """Print a coloured [node] trace line so you can watch the swarm think."""
    color = {"brain": AMBER, "memory": BLUE, "exec": GREEN}.get(tag, DIM)
    print(f"{color}[{tag}]{RESET} {msg}")


# ─── Node health checks ──────────────────────────────────────────
def node_alive(base_url: str) -> bool:
    """True when a worker node answers GET /health within 3 seconds."""
    try:
        return requests.get(f"{base_url}/health", timeout=3).status_code == 200
    except requests.RequestException:
        return False


def boot_report() -> None:
    print(f"\n{BOLD}TRIAD // distributed multi-agent swarm{RESET}")
    for name, url in (("memory", MEMORY_URL), ("executor", EXECUTOR_URL)):
        state = "ONLINE" if node_alive(url) else "OFFLINE (degraded mode)"
        say(name, f"{url} → {state}")
    say("brain", f"reasoning={REASON_MODEL} · coding={CODE_MODEL} @ {OLLAMA_URL}")
    print(f"{DIM}type /help for commands · /quit to exit{RESET}\n")


# ─── Memory node client · Laptop 3 ───────────────────────────────
def memory_recall(query: str, n: int = 3) -> List[Dict[str, Any]]:
    """Fetch the n memories most similar to ${B}query${B} (cosine similarity
    over nomic-embed-text-v2-moe vectors). Returns [] when the node is
    down — the brain must never crash because memory is unreachable."""
    try:
        r = requests.post(
            f"{MEMORY_URL}/memory/query",
            json={"query": query, "n_results": n},
            timeout=HTTP_TIMEOUT,
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException as exc:
        say("memory", f"unreachable ({exc.__class__.__name__}) — skipping recall")
        return []


def memory_save(text: str, source: str = "brain") -> None:
    """Persist one fact on Laptop 3. Chroma hashes the text into the id,
    so saving the same fact twice updates instead of duplicating."""
    try:
        r = requests.post(
            f"{MEMORY_URL}/memory/add",
            json={"text": text, "metadata": {"source": source}},
            timeout=HTTP_TIMEOUT,
        )
        r.raise_for_status()
        say("memory", f"stored · id={r.json().get('id')}")
    except requests.RequestException:
        say("memory", "unreachable — fact NOT saved")


# ─── Executor node client · Laptop 2 ─────────────────────────────
def executor_run(code: str, timeout: int = 60) -> Optional[Dict[str, Any]]:
    """Ship Python source to the sandbox on Laptop 2 and wait for the
    verdict (stdout / stderr / exit code). None ⇒ node unreachable."""
    try:
        r = requests.post(
            f"{EXECUTOR_URL}/execute",
            json={"code": code, "timeout": timeout},
            timeout=timeout + HTTP_TIMEOUT,   # give the job its full budget
        )
        r.raise_for_status()
        return r.json()
    except requests.RequestException as exc:
        say("exec", f"unreachable ({exc.__class__.__name__})")
        return None


# ─── Routing: one JSON decision from glm4 ────────────────────────
# Free-text routing is fragile, so the router must emit a strict JSON
# object. The ${B}action${B} field is the switch that drives the whole swarm:
#
#   answer         reply directly — no other node involved
#   save_memory    persist a fact the user wants remembered (Laptop 3)
#   recall_memory  answer grounded in previously saved facts (Laptop 3)
#   run_code       coder writes Python, Laptop 2 executes it
ROUTER_PROMPT = """You are the router of a three-node agent swarm.
Choose exactly ONE action for the user's request.

Rules:
- "save_memory": the user asks you to remember/store/note a fact.
- "recall_memory": answering needs information the user told you before.
- "run_code": the request needs math, data crunching, text processing,
  algorithms or any computation — anything a script can do.
- "answer": everything else (chat, explanations, advice).

Reply with ONLY valid JSON (no markdown fences):
{{"action": "answer" | "recall_memory" | "save_memory" | "run_code",
  "fact_to_save": "the fact to store (save_memory only, else '')",
  "code_task": "precise spec for the coder model (run_code only, else '')"}}

Memories already retrieved for this prompt:
{context}

User request: {prompt}"""


def extract_json(text: str) -> str:
    """Strip optional ${T}json fences, then slice the outermost {...}."""
    fenced = re.search(r"${T}(?:json)?\s*(\{.*\})\s*${T}", text, re.S)
    if fenced:
        return fenced.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        return text[start : end + 1]
    raise ValueError("no JSON object in model output")


def route(prompt: str, context: str) -> Dict[str, str]:
    try:
        raw = reasoner.invoke(
            ROUTER_PROMPT.format(context=context or "(no memories found)", prompt=prompt)
        )
        decision = json.loads(extract_json(raw.content))
        if decision.get("action") not in {"answer", "recall_memory", "save_memory", "run_code"}:
            raise ValueError(f"unknown action {decision.get('action')!r}")
        return decision
    except (ValueError, json.JSONDecodeError) as exc:
        # Never wedge the conversation: fall back to a direct answer.
        say("brain", f"router fallback ({exc}) — answering directly")
        return {"action": "answer", "fact_to_save": "", "code_task": ""}


# ─── Code generation: qwen2.5-coder writes, never executes ───────
CODER_PROMPT = """Write ONE self-contained Python 3 script for the task below.
Hard rules: print() every result; standard library only; no network;
no input(); no command-line arguments. Reply with ONLY the code
inside a single ${T}python fence.

Task: {task}"""


def write_code(task: str) -> str:
    raw = coder.invoke(CODER_PROMPT.format(task=task)).content
    fenced = re.search(r"${T}python\s*(.*?)${T}", raw, re.S)
    return (fenced.group(1) if fenced else raw).strip()


# ─── Summarising remote execution ────────────────────────────────
SUMMARISE_PROMPT = """The user asked: {prompt}

A Python script just ran on a remote sandbox. Verdict:
exit code: {exit_code}
stdout:
{stdout}
stderr:
{stderr}

Explain the outcome to the user in 2-4 plain sentences. If it failed,
name the error and what likely caused it."""


def summarise(prompt: str, result: Dict[str, Any]) -> str:
    return reasoner.invoke(
        SUMMARISE_PROMPT.format(
            prompt=prompt,
            exit_code=result.get("exit_code"),
            stdout=result.get("stdout") or "(empty)",
            stderr=result.get("stderr") or "(empty)",
        )
    ).content


# ─── One conversation turn ───────────────────────────────────────
def handle(prompt: str) -> None:
    # STEP 1 · Grounding — always ask Memory (Laptop 3) for context
    # before deciding. Cheap, and it lets the router *see* saved facts.
    memories = memory_recall(prompt)
    context = "\n".join(f"- {m['text']}" for m in memories)
    if memories:
        say("memory", f"recalled {len(memories)} relevant memor{'y' if len(memories) == 1 else 'ies'}")

    # STEP 2 · Routing — glm4 picks exactly one action (JSON contract).
    decision = route(prompt, context)
    action = decision["action"]
    say("brain", f"route → {BOLD}{action}{RESET}")

    # STEP 3 · Dispatch on the decision.
    if action == "save_memory":
        fact = decision.get("fact_to_save") or prompt
        memory_save(fact, source="user")
        print(f"\nNoted. I will remember: {DIM}“{fact}”{RESET}\n")

    elif action == "recall_memory":
        grounded = (
            "Answer the user using these long-term memories when relevant:\n"
            f"{context or '(memory is empty)'}\n\nUser: {prompt}"
        )
        print(f"\n{reasoner.invoke(grounded).content}\n")

    elif action == "run_code":
        task = decision.get("code_task") or prompt
        say("brain", f"coder spec → {task}")
        code = write_code(task)                       # Laptop 1 writes…
        say("exec", f"running {len(code.splitlines())} lines on 10.0.0.12 …")
        result = executor_run(code)                   # …Laptop 2 runs.
        if result is None:
            print(f"\n{RED}Executor offline — I can write code but cannot run it.{RESET}\n")
            return
        print(f"{DIM}── stdout ──{RESET}\n{result['stdout'] or '(empty)'}")
        if result.get("stderr"):
            print(f"{RED}── stderr ──\n{result['stderr']}{RESET}")
        print(f"\n{summarise(prompt, result)}\n")     # Laptop 1 explains.
        # Persist successful results so later prompts can build on them.
        if result.get("exit_code") == 0 and result.get("stdout"):
            memory_save(
                f"Computed for '{prompt}': {result['stdout'][:500]}",
                source="executor",
            )

    else:  # action == "answer" — direct reply, optionally grounded.
        chat_prompt = (
            f"Context from long-term memory:\n{context}\n\nUser: {prompt}"
            if context
            else prompt
        )
        print(f"\n{reasoner.invoke(chat_prompt).content}\n")


# ─── CLI loop ────────────────────────────────────────────────────
HELP = f"""{BOLD}commands{RESET}
  /help             this list
  /status           ping both worker nodes
  /memory <text>    force-save a fact to Laptop 3
  /recall <query>   force-search long-term memory
  /quit             shut the swarm down
anything else is a normal prompt for the swarm."""


def main() -> None:
    boot_report()
    while True:
        try:
            prompt = input(f"{AMBER}you ▸ {RESET}").strip()
        except (EOFError, KeyboardInterrupt):
            print("\nshutting down…")
            break
        if not prompt:
            continue

        cmd, _, arg = prompt.partition(" ")
        try:
            if cmd in {"/quit", "/exit"}:
                print("bye.")
                break
            if cmd == "/help":
                print(HELP)
                continue
            if cmd == "/status":
                for name, url in (("memory", MEMORY_URL), ("executor", EXECUTOR_URL)):
                    say(name, "ONLINE" if node_alive(url) else "OFFLINE")
                continue
            if cmd == "/memory":
                memory_save(arg or prompt, source="user")
                continue
            if cmd == "/recall":
                hits = memory_recall(arg or prompt, n=5)
                for m in hits:
                    say("memory", f"({m['score']:.2f}) {m['text'][:120]}")
                if not hits:
                    say("memory", "nothing found")
                continue
            handle(prompt)
        except KeyboardInterrupt:
            say("brain", "turn interrupted")
        except Exception as exc:  # one bad turn must never kill the loop
            print(f"{RED}[error] {exc.__class__.__name__}: {exc}{RESET}")


if __name__ == "__main__":
    main()
`;

export const FILES: SourceFile[] = [
  {
    id: "brain",
    name: "brain_node.py",
    laptop: "LAPTOP 1",
    ip: "10.0.0.10",
    role: "THE BRAIN",
    hue: "brain",
    lang: "python",
    blurb:
      "Orchestrator & CLI. Grounds every prompt in recalled memory, asks glm4:latest for a single JSON routing decision, then answers, stores, recalls — or has qwen2.5-coder:7b write Python for Laptop 2 to execute.",
    endpoints: [
      { method: "CLI", path: "python brain_node.py" },
      { method: "LLM", path: "glm4:latest · router + chat" },
      { method: "LLM", path: "qwen2.5-coder:7b · code writer" },
    ],
    code: BRAIN_NODE,
  },
  {
    id: "memory",
    name: "memory_node.py",
    laptop: "LAPTOP 3",
    ip: "10.0.0.11",
    role: "THE MEMORY",
    hue: "mem",
    lang: "python",
    blurb:
      "Persistent ChromaDB collection behind FastAPI on 0.0.0.0:8000. Embeds with nomic-embed-text-v2-moe via Ollama (the Brain's instance by default), cosine-ranked semantic recall, content-hashed upserts.",
    endpoints: [
      { method: "GET", path: "/health" },
      { method: "POST", path: "/memory/add" },
      { method: "POST", path: "/memory/query" },
      { method: "DELETE", path: "/memory/{id}" },
      { method: "GET", path: "/memory/stats" },
    ],
    code: MEMORY_NODE,
  },
  {
    id: "executor",
    name: "executor_node.py",
    laptop: "LAPTOP 2",
    ip: "10.0.0.12",
    role: "THE EXECUTOR",
    hue: "exec",
    lang: "python",
    blurb:
      "Sandboxed code runner on 0.0.0.0:8001. Fresh interpreter per job, temp-dir cwd, python -I isolation, hard wall-clock timeout, POSIX rlimits (CPU / 2 GB RAM / 50 MB writes), truncated 100 KB output.",
    endpoints: [
      { method: "GET", path: "/health" },
      { method: "POST", path: "/execute" },
    ],
    code: EXECUTOR_NODE,
  },
  {
    id: "reqs",
    name: "requirements.txt",
    laptop: "ALL NODES",
    ip: "pip install -r",
    role: "DEPENDENCIES",
    hue: "slate",
    lang: "text",
    blurb:
      "One shared manifest. FastAPI + Uvicorn power both worker nodes, ChromaDB backs the Memory, LangChain + langchain-ollama drive the Brain, and requests carries every inter-node call across the LAN.",
    endpoints: [
      { method: "PKG", path: "fastapi · uvicorn" },
      { method: "PKG", path: "chromadb" },
      { method: "PKG", path: "langchain · langchain-ollama" },
      { method: "PKG", path: "requests · pydantic" },
    ],
    code: REQUIREMENTS,
  },
];
