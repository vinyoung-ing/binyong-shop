// 이전 빌드의 해시 파일이 쌓이지 않도록 루트의 assets/ 를 비운다.
import { rmSync } from "node:fs";
import { fileURLToPath } from "node:url";

rmSync(fileURLToPath(new URL("../../assets", import.meta.url)), { recursive: true, force: true });
