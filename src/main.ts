(window as any).__random = () => {
  return Math.floor(Math.random() * 256);
};
import init, { InitOutput, new_buffer, calc_s2 } from "calc-s2-rust";
import { resolveImageToRgba } from "./resolveImage";
class WasmRenderManager {
  wasm: InitOutput | null = null;
  async init() {
    return new Promise((rs, rj) => {
      init()
        .then((instance: InitOutput) => {
          this.wasm = instance;
          (window as any).wasm = instance;
          instance.set_wasm_panic_hook();
          rs(1);
        })
        .catch((e: any) => {
          rj(e);
        });
    });
  }
  allocImageData(key: string, len: number) {
    console.log("allocImageData: len:", len, "key:", key);
    const ptr = new_buffer(key, len);
    // const u8Arr = new Uint8ClampedArray(this.wasm!.memory.buffer, ptr, len);
    // const imageData = new ImageData(u8Arr, width, height);
    // return imageData;
    return ptr;
  }
}

// function initJS(width: number, height: number) {
//   const buffer = new Uint8ClampedArray(width * height * 4);
//   ctx.putImageData(new ImageData(buffer, width, height), 0, 0);
// }

const image1El = document.querySelector("#image1") as HTMLInputElement;
const image2El = document.querySelector("#image2") as HTMLInputElement;
const calcEl = document.querySelector("#calc") as HTMLButtonElement;
const resultEl = document.querySelector("#result") as HTMLDivElement;

const wasmManager = new WasmRenderManager();

const writeImageFileRgbToWasm = async (file: File, imageKey: string) => {
  const { data: jsU8ca, width, height } = await resolveImageToRgba(file);
  (window as any).imgWidth = width;
  (window as any).imgHeight = height;
  console.log("jsU8ca", jsU8ca);
  if (!jsU8ca) return;
  const memLength = width * height * 3;
  const bufferPtr = wasmManager.allocImageData(imageKey, memLength);
  console.log("bufferPtr", bufferPtr);
  const wasmU8ca = new Uint8ClampedArray(
    wasmManager.wasm!.memory.buffer,
    bufferPtr,
    memLength
  );
  console.log("wasmU8ca", wasmU8ca);
  // 提前读一次就写不进去了，奇怪
  // console.log("wasm buffer:");
  // print_buffer(imageKey);
  for (let row = 0; row < height; row += 1) {
    for (let column = 0; column < width; column += 1) {
      wasmU8ca[(row * width + column) * 3] = jsU8ca[(row * width + column) * 4];
      wasmU8ca[(row * width + column) * 3 + 1] =
        jsU8ca[(row * width + column) * 4 + 1];
      wasmU8ca[(row * width + column) * 3 + 2] =
        jsU8ca[(row * width + column) * 4 + 2];
    }
  }
  console.log("wasmU8ca after copy", wasmU8ca);
  // console.log("wasm buffer after copy:");
  // print_buffer(imageKey);
};

wasmManager.init().then(() => {
  image1El.addEventListener("change", async (evt: any) => {
    const file = evt.target!.files[0];
    await writeImageFileRgbToWasm(file, "img1");
    calcEl.disabled = !(image1El.value && image2El.value);
  });

  image2El.addEventListener("change", async (evt: any) => {
    const file = evt.target!.files[0];
    await writeImageFileRgbToWasm(file, "img2");
    calcEl.disabled = !(image1El.value && image2El.value);
  });

  calcEl.addEventListener("click", () => {
    calcEl.disabled = true;
    const result = calc_s2(
      "img1",
      "img2",
      (window as any).imgWidth,
      (window as any).imgHeight
    );
    console.log("calc_s2 result", result);
    resultEl.innerText = `result is: ${result}`;
    image1El.value = "";
    image2El.value = "";
    calcEl.disabled = !(image1El.value && image2El.value);
  });
});
