import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(here, "..");
const sharedJs = path.join(siteRoot, "js") + path.sep;

// 홈(React)만 빌드해서 사이트 루트에 index.html + assets/ 로 내보낸다.
// ../js/*.js 공용 모듈과 Firebase CDN은 번들에 복사하지 않고 런타임에 그대로 불러오므로,
// 공용 모듈을 수정해도 홈을 다시 빌드할 필요가 없다.
export default defineConfig({
  root: here,
  base: "./",
  publicDir: false,
  plugins: [
    react(),
    {
      // 번들은 assets/ 안에 생기므로 공용 모듈 import 경로를 assets 기준(../js/…)으로 맞춘다.
      name: "rewrite-shared-js-paths",
      renderChunk(code) {
        return code.replace(/(["'])(?:\.\.\/)+js\//g, "$1../js/");
      },
    },
  ],
  server: { fs: { allow: [siteRoot] } },
  build: {
    outDir: siteRoot,
    emptyOutDir: false,
    assetsDir: "assets",
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      external: (id, importer) => {
        if (id.startsWith("https://")) return true;
        const abs = id.startsWith(".") && importer ? path.resolve(path.dirname(importer), id) : id;
        return path.normalize(abs).startsWith(sharedJs);
      },
    },
  },
});
