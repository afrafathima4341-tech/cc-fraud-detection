import { useEffect } from 'react'
import { create } from 'zustand'

const useToastStore = create((set) => ({
  toasts: [],
  addToast: (message, type = 'error') =>
    set((state) => {
      const id = Date.now()
      return { toasts: [...state.toasts, { id, message, type }] }
    }),
  removeToast: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
}))

export function useToast() {
  const addToast = useToastStore((s) => s.addToast)
  return { addToast }
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts)
  const removeToast = useToastStore((s) => s.removeToast)

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((t) =>
      setTimeout(() => removeToast(t.id), 4000)
    )
    return () => timers.forEach(clearTimeout)
  }, [toasts, removeToast])

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg text-white ${
            t.type === 'error' ? 'bg-red-600' : 'bg-gray-800'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
