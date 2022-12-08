import wasm from "vite-plugin-wasm";
// import topLevelAwait from "vite-plugin-top-level-await";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [
    wasm(),
    //  topLevelAwait()
  ],
  server: {
    fs: {
      // 可以为项目根目录的上一级提供服务
      allow: ["..", "*", "."],
    },
  },
});
