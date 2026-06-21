import { compressImageFile } from './imageUtils'
import { toast } from 'sonner'

const MAX_BYTES = 5 * 1024 * 1024

export async function readAvatarFromFile(file) {
  if (!file) return null

  if (file.size > MAX_BYTES) {
    toast.error('Image must be under 5MB')
    return null
  }

  try {
    return await compressImageFile(file, { maxWidth: 320, maxHeight: 320, quality: 0.8 })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not process that image')
    return null
  }
}
