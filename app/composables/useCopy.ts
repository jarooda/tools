import { useClipboard } from '@vueuse/core'

/**
 * Copy text to the clipboard with a transient "copied" flag for UI feedback.
 * Wraps VueUse `useClipboard` (with an execCommand fallback for older browsers).
 */
export function useCopy(timeout = 1500) {
  const {
    copy: copyToClipboard,
    copied,
    isSupported,
  } = useClipboard({
    copiedDuring: timeout,
    legacy: true,
  })

  async function copy(text: string) {
    await copyToClipboard(text)
  }

  return { copy, copied, isSupported }
}
