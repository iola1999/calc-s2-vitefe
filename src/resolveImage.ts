// 或者不用 canvas，而是使用 https://github.com/oliver-moran/jimp#supported-image-types, 但支持的格式有限
export const resolveImageToRgba = async (file: File) => {
  //   if (!file.type.startsWith("image/")) return;
  return new Promise<ImageData>((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.width;
      const height = img.height;

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      var context = canvas.getContext("2d")!;

      context.drawImage(img, 0, 0, width, height);

      var imageData = context.getImageData(0, 0, width, height, {
        colorSpace: "srgb",
      });
      resolve(imageData);
    };
    img.src = URL.createObjectURL(file);
  });
};
