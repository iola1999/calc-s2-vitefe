(window as any).__random = () => {
  return Math.floor(Math.random() * 256);
};

import init from "calc-s2-rust";

class WasmRenderManager {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  wasm: any | null;

  async init() {
    return new Promise((rs, rj) => {
      // @ts-ignore
      //   const js = import("calc-s2-rust/calc_s2_rust_bg.wasm?init");
      init()
        .then((instance) => {
          this.wasm = instance;
          (window as any).wasm = instance;
          instance.set_wasm_panic_hook();
          rs(1);
        })
        .catch((e) => {
          rj();
        });
    });
  }
  allocImageData(key: string, len: number, width: number, height?: number) {
    console.log("allocImageData: len:", len, "key:", key);
    let begin = window.performance.now();
    // const ptr = this.wasm!.new_buffer(key, len);
    const ptr = this.wasm!.new_buffer();
    const u8Arr = new Uint8ClampedArray(this.wasm!.memory.buffer, ptr, len);
    const imageData = new ImageData(u8Arr, width, height);
    console.log("allocImageData cost!!:", window.performance.now() - begin);
    return imageData;
  }
  convolution(key: string, width: number, height: number, kernel: number[]) {
    this.wasm.convolution(key, width, height, kernel);
  }
}

const wasmManager = new WasmRenderManager();
const canvas = document.getElementById("canvas")! as HTMLCanvasElement;
const DEFAULT_AREA = 4800;
const MAX_WIDTH = 120;
const MAX_HEIGHT = 80;
const kernel = [1, 2, 1, 2, 4, 2, 1, 2, 1];

function reComputeCanvasSize(width, height) {
  const k = height / width;
  let resultWidth = Math.floor(Math.sqrt(DEFAULT_AREA / k));
  let resultHeight = 0;
  if (resultWidth > MAX_WIDTH) {
    resultWidth = MAX_WIDTH;
    resultHeight = resultWidth * k;
  } else {
    resultHeight = resultWidth * k;
    if (resultHeight > MAX_HEIGHT) {
      resultHeight = MAX_HEIGHT;
      resultWidth = resultHeight / k;
    }
  }
  return {
    width: resultWidth,
    height: Math.floor(resultHeight),
  };
}

async function benchMark() {
  const [ctx, width, height] = await initCanvas();
  // eslint-disable-next-line no-console
  console.log("initCanvas success");
  const times = 10;
  let wasmCost = 0;
  let jsCost = 0;
  // for(let i = 0; i < times; i += 1) {
  //   const begin = window.performance.now();
  //   testWasm(ctx, width, height);
  //   wasmCost += (window.performance.now() - begin);
  //   // eslint-disable-next-line no-console
  //   console.log('wasm time:', i);
  // }
  // wasmCost /= times;
  // for(let i = 0; i < times; i += 1) {
  //   const begin = window.performance.now();
  //   testJS(ctx, width, height);
  //   jsCost += (window.performance.now() - begin);
  //   // eslint-disable-next-line no-console
  //   console.log('js time:', i);
  // }
  // jsCost /= times;
  // // eslint-disable-next-line no-console
  // console.log('[result] wasm cost:', wasmCost);
  // // eslint-disable-next-line no-console
  // console.log('[result] js cost:', jsCost);
}

function resizeCanvas(imgWidth, imgHeight) {
  const result = reComputeCanvasSize(imgWidth, imgHeight);
  canvas.style.width = `${result.width}px`;
  canvas.style.height = `${result.height}px`;
  // eslint-disable-next-line no-multi-assign
  const width = (canvas.width = result.width * 2);
  // eslint-disable-next-line no-multi-assign
  const height = (canvas.height = result.height * 2);
  //   size = width * height;
  //   memSize = width * height * 4 * 2 + 9 * 4 * 2; // rgba for one pixel
  return {
    width,
    height,
  };
}

async function initCanvas(url?: string) {
  const res = resizeCanvas(MAX_WIDTH, MAX_HEIGHT);
  const ctx = canvas.getContext("2d");
  await initWasm(ctx, res.width, res.height);
  initJS(ctx, res.width, res.height);
  return [ctx, res.width, res.height];
}

async function initWasm(ctx, width, height) {
  await wasmManager.init();
  const imageData = wasmManager.allocImageData(
    "test",
    width * height * 4,
    width,
    height
  );
  // let begin = window.performance.now();
  // for(let i = 0; i < imageData.data.length; i += 1) {
  //   imageData.data[i] = window.__random();
  // }
  // let cost = window.performance.now() - begin;
  // console.log('write cost:', cost);
  return imageData;
}

function testWasm(ctx, width, height) {
  wasmManager.convolution("test", width, height, kernel);
}

function initJS(ctx, width, height) {
  (window as any).buffer = new Uint8ClampedArray(width * height * 4);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // let begin = window.performance.now();
  // for(let val in buffer) {
  //   val = window.__random();
  // }
  // let cost = window.performance.now() - begin;
  // console.log('write cost js:', cost);
  return new ImageData((window as any).buffer, width, height);
}

async function testJS(ctx, width, height) {
  const { buffer } = window as any;
  const kernel_length = kernel.reduce((a, b) => a + b);
  for (let i = 1; i < width - 1; i += 1) {
    for (let j = 1; j < height - 1; j += 1) {
      let newR = 0;
      let newG = 0;
      let newB = 0;
      for (let x = 0; x < 3; x += 1) {
        // 取前后左右共9个格子
        for (let y = 0; y < 3; y += 1) {
          newR +=
            (buffer[width * (j + y - 1) * 4 + (i + x - 1) * 4 + 0] *
              kernel[y * 3 + x]) /
            kernel_length;
          newG +=
            (buffer[width * (j + y - 1) * 4 + (i + x - 1) * 4 + 1] *
              kernel[y * 3 + x]) /
            kernel_length;
          newB +=
            (buffer[width * (j + y - 1) * 4 + (i + x - 1) * 4 + 2] *
              kernel[y * 3 + x]) /
            kernel_length;
        }
      }
      buffer[width * j * 4 + i * 4 + 0] = newR;
      buffer[width * j * 4 + i * 4 + 1] = newG;
      buffer[width * j * 4 + i * 4 + 2] = newB;
    }
  }
}

benchMark();
