/**
 * avatarUpload.js
 *
 * Handles profile avatar upload.
 *
 * Storage strategy:
 *   1. Compress the image to 320×320 JPEG locally.
 *   2. Upload to the Supabase 'avatars' bucket at path: {userId}/avatar.jpg
 *      This gives us a stable public URL that survives page refreshes.
 *   3. Store the public URL (not base64) in state.profile.avatarUrl.
 *   4. syncUserProfile() then saves that URL to users.avatar_url in the DB.
 *
 * Fallback:
 *   If Supabase Storage upload fails (offline, bucket doesn't exist yet, etc.)
 *   we fall back to the old base64 data-URL approach so the avatar still works
 *   locally without breaking the UX.
 *
 * Why this fixes the stale-avatar bug:
 *   - Base64 data URLs > 200 KB were silently stripped from localStorage by
 *     slimStateForStorage(), so after a page refresh without re-login the
 *     avatar reverted to the placeholder.
 *   - A stable https:// URL is never stripped and always loads correctly.
 */

import { compressImageFile } from './imageUtils'
import { supabase } from './supabase'
import { toast } from 'sonner'

const MAX_BYTES     = 5 * 1024 * 1024
const AVATAR_BUCKET = 'avatars'

function isSupabaseReady() {
  const url = import.meta.env.VITE_SUPABASE_URL
  return url && url !== 'https://placeholder.supabase.co'
}

/**
 * Compress + optionally upload a user-selected avatar file.
 *
 * @param {File}   file    - raw file from <input type="file">
 * @param {string} userId  - auth.users UUID (needed for Storage path)
 * @returns {string|null}  - public URL (preferred) or base64 data URL (fallback)
 */
export async function readAvatarFromFile(file, userId = null) {
  if (!file) return null

  if (file.size > MAX_BYTES) {
    toast.error('Image must be under 5MB')
    return null
  }

  // Step 1: compress locally first so we have something to show immediately
  let dataUrl
  try {
    dataUrl = await compressImageFile(file, { maxWidth: 320, maxHeight: 320, quality: 0.82 })
  } catch (err) {
    toast.error(err instanceof Error ? err.message : 'Could not process that image')
    return null
  }

  // Step 2: try uploading to Supabase Storage for a stable https:// URL
  if (userId && isSupabaseReady()) {
    try {
      // Convert data URL to Blob
      const res  = await fetch(dataUrl)
      const blob = await res.blob()
      const ext  = blob.type === 'image/gif' ? 'gif' : 'jpg'
      const path = `${userId}/avatar.${ext}`

      const { error: upErr } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(path, blob, {
          upsert:      true,
          contentType: blob.type || 'image/jpeg',
          cacheControl: '3600',
        })

      if (!upErr) {
        // Get the public URL — this is a stable https:// URL, never stripped
        const { data: urlData } = supabase.storage
          .from(AVATAR_BUCKET)
          .getPublicUrl(path)

        if (urlData?.publicUrl) {
          // Append a cache-buster so the browser always fetches the latest version
          // after a re-upload (Supabase CDN caches aggressively)
          return `${urlData.publicUrl}?t=${Date.now()}`
        }
      } else {
        // Storage upload failed — log but continue to base64 fallback
        console.warn('[avatarUpload] Storage upload failed:', upErr.message,
          '— using base64 fallback (run the avatars bucket migration)')
      }
    } catch (storageErr) {
      console.warn('[avatarUpload] Storage error:', storageErr?.message, '— using base64 fallback')
    }
  }

  // Step 3: fallback — return base64 data URL (works offline, no bucket needed)
  return dataUrl
}

/**
 * Delete the user's avatar from Supabase Storage (called on sign-out or avatar removal).
 * Fire-and-forget — never throws.
 */
export async function deleteAvatarFromStorage(userId) {
  if (!userId || !isSupabaseReady()) return
  try {
    await supabase.storage.from(AVATAR_BUCKET).remove([
      `${userId}/avatar.jpg`,
      `${userId}/avatar.gif`,
    ])
  } catch { /* ignore */ }
}
