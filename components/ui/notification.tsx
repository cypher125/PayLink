"use client"

import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { X } from 'lucide-react'

type NotificationType = 'success' | 'error' | 'info' | 'warning'

interface Notification {
  id: string
  message: string
  type: NotificationType
}

interface NotificationContextType {
  notifications: Notification[]
  showNotification: (message: string, type: NotificationType) => void
  removeNotification: (id: string) => void
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])

  const showNotification = useCallback((message: string, type: NotificationType) => {
    const id = Math.random().toString(36).substring(2, 9)
    
    setNotifications((prev) => [...prev, { id, message, type }])
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id)
    }, 5000)
  }, [])

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((notification) => notification.id !== id))
  }, [])

  return (
    <NotificationContext.Provider value={{ notifications, showNotification, removeNotification }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        {notifications.map((notification) => (
          <div
            key={notification.id}
            className={`
              flex items-center justify-between p-4 rounded-md shadow-md min-w-80 
              ${notification.type === 'success' ? 'bg-green-500 text-white' : ''}
              ${notification.type === 'error' ? 'bg-red-500 text-white' : ''}
              ${notification.type === 'info' ? 'bg-blue-500 text-white' : ''}
              ${notification.type === 'warning' ? 'bg-yellow-500 text-white' : ''}
            `}
          >
            <span>{notification.message}</span>
            <button 
              onClick={() => removeNotification(notification.id)}
              className="ml-2 p-1 hover:bg-black/10 rounded-full"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  )
}

export function useNotification() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotification must be used within a NotificationProvider')
  }
  return context
}

// Simple helper functions to make it easier to use
export const notification = {
  success: (message: string) => {
    // We need to check if we're in browser context to avoid SSR issues
    if (typeof window !== 'undefined') {
      // Use a small timeout to ensure this happens outside the render cycle
      setTimeout(() => {
        const context = useContext(NotificationContext)
        context?.showNotification(message, 'success')
      }, 0)
    }
  },
  error: (message: string) => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const context = useContext(NotificationContext)
        context?.showNotification(message, 'error')
      }, 0)
    }
  },
  info: (message: string) => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const context = useContext(NotificationContext)
        context?.showNotification(message, 'info')
      }, 0)
    }
  },
  warning: (message: string) => {
    if (typeof window !== 'undefined') {
      setTimeout(() => {
        const context = useContext(NotificationContext)
        context?.showNotification(message, 'warning')
      }, 0)
    }
  }
}
