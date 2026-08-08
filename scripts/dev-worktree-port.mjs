// Chạy dev server với một port ỔN ĐỊNH, RIÊNG theo worktree, để nhiều session
// (mỗi session một worktree) không lẫn dev server của nhau.
//
// Dùng: node scripts/dev-worktree-port.mjs <next|vite>
//
// Thứ tự chọn port:
//   1. PORT trong môi trường (Claude Code autoPort tự cấp) → tôn trọng
//   2. Checkout CHÍNH (không phải worktree phụ) + có DEV_BASE_PORT → giữ port gốc đó
//   3. Còn lại → suy port ỔN ĐỊNH từ đường dẫn worktree (hash → 3100–4900)
import { spawn, execSync } from "node:child_process";
import { createHash } from "node:crypto";
import { resolve } from "node:path";

const runner = process.argv[2] === "vite" ? "vite" : "next";
const LOW = 3100;
const HIGH = 4900;
// Chừa các port đã ghim cố định ở các app anh em + port thường dùng.
const RESERVED = new Set([3000, 3002, 3003, 3007, 3010, 3300, 5173]);

function derivePort(seed) {
  const n = createHash("sha1").update(seed).digest().readUInt32BE(0);
  let port = LOW + (n % (HIGH - LOW + 1));
  while (RESERVED.has(port)) port = port === HIGH ? LOW : port + 1;
  return port;
}

function isLinkedWorktree() {
  try {
    const opt = { stdio: ["ignore", "pipe", "ignore"] };
    const gitDir = execSync("git rev-parse --git-dir", opt).toString().trim();
    const commonDir = execSync("git rev-parse --git-common-dir", opt).toString().trim();
    return resolve(gitDir) !== resolve(commonDir);
  } catch {
    return false;
  }
}

const cwd = process.cwd();
const envPort = process.env.PORT && Number(process.env.PORT);
const basePort = process.env.DEV_BASE_PORT && Number(process.env.DEV_BASE_PORT);

let port;
let source;
if (envPort && Number.isInteger(envPort)) {
  port = envPort;
  source = "PORT env";
} else if (!isLinkedWorktree() && basePort && Number.isInteger(basePort)) {
  port = basePort;
  source = "base cố định (checkout chính)";
} else {
  port = derivePort(cwd);
  source = "worktree hash";
}

console.log(`[dev] ${runner} @ ${cwd}`);
console.log(`[dev] port ${port} (nguồn: ${source})`);

const args = runner === "vite" ? ["--port", String(port)] : ["dev", "-p", String(port)];
const child = spawn(runner, args, {
  stdio: "inherit",
  env: { ...process.env, PORT: String(port) },
  shell: false,
});
child.on("exit", (code) => process.exit(code ?? 0));
