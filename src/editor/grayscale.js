// html2canvas ignores CSS filter: grayscale(), so watermark uploads are
// converted to a grayscale PNG before they are stored.

const MAX_EDGE = 800;

export async function toGrayscaleBlob(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  context.drawImage(bitmap, 0, 0, width, height);
  const image = context.getImageData(0, 0, width, height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const y = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    data[i] = y;
    data[i + 1] = y;
    data[i + 2] = y;
  }
  context.putImageData(image, 0, 0);
  if (typeof bitmap.close === 'function') bitmap.close();
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('Could not build grayscale watermark');
  return blob;
}
