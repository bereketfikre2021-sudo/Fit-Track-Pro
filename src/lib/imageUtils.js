/** Resize and compress an image file for localStorage-friendly storage.
 *  GIFs are returned as-is (base64 data URL) to preserve animation.
 */
export function compressImageFile(
  file,
  { maxWidth = 400, maxHeight = 400, quality = 0.75 } = {}
) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error('No file provided'))
      return
    }
    if (!file.type?.startsWith('image/')) {
      reject(new Error('Unsupported file type'))
      return
    }

    // GIFs must not be drawn onto a canvas — that collapses all frames into one.
    // Read them as-is and return the original data URL to preserve animation.
    if (file.type === 'image/gif') {
      const reader = new FileReader()
      reader.onerror = () => reject(new Error('Failed to read GIF file'))
      reader.onload = () => resolve(/** @type {string} */ (reader.result))
      reader.readAsDataURL(file)
      return
    }

    const toJpegDataUrl = (source, sourceWidth, sourceHeight) => {
      const w = Math.max(1, sourceWidth || 1)
      const h = Math.max(1, sourceHeight || 1)
      const scale = Math.min(maxWidth / w, maxHeight / h, 1)
      const width = Math.max(1, Math.round(w * scale))
      const height = Math.max(1, Math.round(h * scale))

      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        throw new Error('Canvas not supported')
      }
      ctx.drawImage(source, 0, 0, width, height)
      return canvas.toDataURL('image/jpeg', quality)
    }

    const isHeicLike =
      file.type === 'image/heic' ||
      file.type === 'image/heif' ||
      file.type === 'image/heic-sequence' ||
      file.type === 'image/heif-sequence' ||
      /\.hei[cf]$/i.test(file.name || '')

    const decodeViaImageTag = (src) =>
      new Promise((res, rej) => {
        const img = new Image()
        img.decoding = 'async'
        img.onload = () => res(img)
        img.onerror = () => rej(new Error('The source image could not be decoded'))
        img.src = src
      })

    const decodeImage = async (inputFile) => {
      // Prefer createImageBitmap when it works (fast + memory efficient).
      if (typeof createImageBitmap === 'function') {
        try {
          const bitmap = await createImageBitmap(inputFile)
          return { kind: 'bitmap', value: bitmap }
        } catch {
          // fall through to other decoders
        }
      }

      // Fallback #1: object URL + <img>
      try {
        const url = URL.createObjectURL(inputFile)
        try {
          const img = await decodeViaImageTag(url)
          return { kind: 'img', value: img }
        } finally {
          URL.revokeObjectURL(url)
        }
      } catch {
        // continue
      }

      // Fallback #2: FileReader data URL + <img> (works better on some mobile browsers)
      const dataUrl = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onerror = () => rej(new Error('Failed to read file'))
        r.onload = () => res(typeof r.result === 'string' ? r.result : '')
        r.readAsDataURL(inputFile)
      })
      if (!dataUrl) throw new Error('The source image could not be decoded')
      const img = await decodeViaImageTag(dataUrl)
      return { kind: 'img', value: img }
    }

    const convertHeicToJpegFile = async () => {
      const mod = await import('heic2any')
      const heic2any = mod?.default || mod
      const converted = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality,
      })
      const blob = Array.isArray(converted) ? converted[0] : converted
      return new File([blob], (file.name || 'image').replace(/\.hei[cf]$/i, '.jpg'), {
        type: 'image/jpeg',
      })
    }

    ;(async () => {
      try {
        // HEIC/HEIF is a very common mobile camera format and is not reliably decodable
        // in browsers. Convert it to JPEG first.
        let input = file
        if (isHeicLike) {
          input = await convertHeicToJpegFile()
        }

        const decoded = await decodeImage(input)
        try {
          if (decoded.kind === 'bitmap') {
            const bitmap = decoded.value
            resolve(toJpegDataUrl(bitmap, bitmap.width, bitmap.height))
            return
          }
          const img = decoded.value
          resolve(
            toJpegDataUrl(
              img,
              img.naturalWidth || img.width,
              img.naturalHeight || img.height
            )
          )
        } finally {
          if (decoded.kind === 'bitmap') decoded.value.close?.()
        }
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error('The source image could not be decoded')
        )
      }
    })()
  })
}
