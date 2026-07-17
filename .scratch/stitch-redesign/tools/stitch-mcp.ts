#!/usr/bin/env bun
/**
 * Minimal Stitch MCP client over streamable HTTP — bypasses Claude Code's broken MCP OAuth
 * (which falls back to dynamic client registration, unsupported by stitch.googleapis.com).
 * Auth: gcloud OAuth2 bearer + X-Goog-User-Project quota header (per StitchAuthHeaders.sh).
 */
const ENDPOINT = "https://stitch.googleapis.com/mcp";
const PROJECT = process.env.STITCH_QUOTA_PROJECT ?? "nur-demo";

function token(): string {
  const p = Bun.spawnSync(["gcloud", "auth", "print-access-token"]);
  const t = p.stdout.toString().trim();
  if (!t) throw new Error("no gcloud access token — run: gcloud auth login");
  return t;
}

let sessionId = "";

function baseHeaders(): Record<string, string> {
  return {
    Authorization: `Bearer ${token()}`,
    "X-Goog-User-Project": PROJECT,
    "Content-Type": "application/json",
    Accept: "application/json, text/event-stream",
    ...(sessionId ? { "Mcp-Session-Id": sessionId } : {}),
  };
}

/** Parse an MCP response that may be plain JSON or SSE (data: {...}). */
async function parseBody(res: Response): Promise<any> {
  const text = await res.text();
  const ct = res.headers.get("content-type") ?? "";
  if (ct.includes("text/event-stream")) {
    // take the last `data:` line's JSON
    const lines = text.split("\n").filter((l) => l.startsWith("data:"));
    const last = lines[lines.length - 1];
    return last ? JSON.parse(last.slice(5).trim()) : null;
  }
  return text ? JSON.parse(text) : null;
}

export async function rpc(method: string, params: unknown, id: number | null = 1): Promise<any> {
  const body: Record<string, unknown> = { jsonrpc: "2.0", method };
  if (id !== null) body.id = id;
  if (params !== undefined) body.params = params;
  const res = await fetch(ENDPOINT, { method: "POST", headers: baseHeaders(), body: JSON.stringify(body) });
  const sid = res.headers.get("mcp-session-id");
  if (sid) sessionId = sid;
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MCP ${method} → HTTP ${res.status}: ${errText.slice(0, 300)}`);
  }
  return parseBody(res);
}

export async function initialize(): Promise<void> {
  await rpc("initialize", {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "alesha-stitch", version: "1.0" },
  });
  // notification — no id, no response expected
  await fetch(ENDPOINT, {
    method: "POST",
    headers: baseHeaders(),
    body: JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }),
  });
}

export async function callTool(name: string, args: Record<string, unknown>): Promise<any> {
  return rpc("tools/call", { name, arguments: args }, Math.floor(Date.now() % 1e6) + 2);
}

// ── general CLI: bun stitch-mcp.ts <toolName> '<jsonArgs>' ──
if (import.meta.main) {
  const [, , tool, argsJson] = process.argv;
  await initialize();
  if (!tool) {
    console.log(JSON.stringify(await callTool("list_projects", {}), null, 1));
  } else {
    const args = argsJson ? JSON.parse(argsJson) : {};
    const out = await callTool(tool, args);
    // Unwrap the MCP text content if present
    const text = out?.result?.content?.[0]?.text;
    console.log(text ?? JSON.stringify(out, null, 1));
  }
}
