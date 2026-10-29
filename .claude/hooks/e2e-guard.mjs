// git push 직전에 실행된다. 푸시할 커밋에 화면(src/app, src/components, frontend) 변경이 있는데
// E2E 테스트(e2e/, frontend/e2e/) 변경이 없으면 한 번 막고, 테스트를 화면에 맞춰 고치라고 알린다.
// 같은 HEAD로 다시 푸시하면 통과시킨다(검토 결과 테스트를 고칠 필요가 없을 때).
import { execSync } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const git = (cmd) => execSync(`git ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim()

let input = ""
for await (const chunk of process.stdin) input += chunk
const command = JSON.parse(input || "{}").tool_input?.command ?? ""
if (!/\bgit\s+push\b/.test(command)) process.exit(0)

let base
for (const ref of ["@{u}", "origin/HEAD", "origin/main"]) {
  try { base = git(`rev-parse --verify ${ref}`); break } catch {}
}
if (!base) process.exit(0)

const head = git("rev-parse HEAD")
const changed = git(`diff --name-only ${base}...HEAD`).split("\n").filter(Boolean)
const isTest = (f) => f.startsWith("e2e/") || f.startsWith("frontend/e2e/")
const isFront = (f) => !isTest(f) && /^(src\/app|src\/components|frontend)\//.test(f)

const front = changed.filter(isFront)
if (!front.length || changed.some(isTest)) process.exit(0)

const marker = path.join(git("rev-parse --git-dir"), "claude-e2e-checked")
if (fs.existsSync(marker) && fs.readFileSync(marker, "utf8").trim() === head) process.exit(0)
fs.writeFileSync(marker, head)

const reason = [
  "푸시할 커밋에 화면 변경이 있는데 E2E 테스트 변경이 없습니다.",
  "바뀐 화면 파일:",
  ...front.map((f) => `  - ${f}`),
  "",
  "e2e/scenarios/*.spec.ts, e2e/helpers.ts (필요하면 frontend/e2e/run.mjs, docs/scenarios.yaml)에서",
  "바뀐 문구·버튼·흐름을 쓰는 부분을 찾아 화면에 맞게 고치고, 커밋한 뒤 다시 푸시하세요.",
  "검토해 보니 고칠 테스트가 없다면 지금 상태 그대로 다시 푸시하면 통과합니다.",
].join("\n")

console.log(JSON.stringify({
  hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: reason },
}))
