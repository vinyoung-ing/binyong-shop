// 이전 빌드의 해시 파일이 쌓이지 않도록 루트의 assets/ 를 비운다.
// Windows에서 백신/편집기가 파일을 잡고 있으면 지우지 못할 수 있는데,
// 그런 파일은 건너뛰고 빌드는 계속 진행한다(나중에 다시 빌드하면 정리됨).
import { readdirSync, rmSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = fileURLToPath(new URL("../../assets", import.meta.url));

let files = [];
try {
  files = readdirSync(dir);
} catch {
  process.exit(0);
}

for (const name of files) {
  try {
    rmSync(path.join(dir, name), { force: true, recursive: true });
  } catch (e) {
    console.warn(`[clean] ${name} 을(를) 지우지 못해 건너뜁니다 (${e.code}).`);
  }
}
