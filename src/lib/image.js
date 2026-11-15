// Client-side image compression: resizes so the longest side is <= maxDim and re-encodes as JPEG.
// Returns { blob, dataUrl, base64, width, height }. base64 has no "data:" prefix.
export async function compressImage(file, maxDim = 1280, quality = 0.82) {
  let bitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error('This image format is not supported. Please use a JPG or PNG photo.')
  }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
  const dataUrl = canvas.toDataURL('image/jpeg', quality)
  return { blob, dataUrl, base64: dataUrl.split(',')[1], width, height }
}
