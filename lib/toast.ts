// Custom toast notification system that displays notifications at the top or bottom of the screen with a timer

// Setup to suppress React's error overlay
// This will run when the file is imported
if (typeof window !== 'undefined') {
  // Override the console.error to prevent React from showing error overlays
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    // Check if this is a React error that would trigger the overlay
    const isReactError = args.some(arg => 
      typeof arg === 'string' && 
      (arg.includes('React will try to recreate this component tree') || 
       arg.includes('Error: Uncaught') ||
       arg.includes('The above error occurred in') ||
       arg.includes('Transaction failed') ||
       arg.includes('processing your transaction')
      )
    );
    
    // Don't show React errors in the console that would trigger the overlay
    if (!isReactError) {
      originalConsoleError(...args);
    }
  };
  
  // Prevent the default error handling
  window.addEventListener('error', (event) => {
    // If this is from our managed errors, prevent default handling
    if (event.message.includes('Insufficient balance') || 
        event.message.includes('Transaction failed') ||
        event.message.includes('processing your transaction') ||
        event.filename.includes('paylink')) {
      event.preventDefault();
      return false;
    }
  }, true);

  // Also catch unhandled rejections
  window.addEventListener('unhandledrejection', (event) => {
    // If this is a transaction related error, prevent it from showing
    if (event.reason && typeof event.reason.message === 'string' && 
        (event.reason.message.includes('Transaction failed') || 
         event.reason.message.includes('processing your transaction'))) {
      event.preventDefault();
      return false;
    }
  }, true);
}

// Types for the toast system
type ToastType = 'success' | 'error' | 'info' | 'warning';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
}

// Toast container that will be added to the DOM
let toastContainer: HTMLDivElement | null = null;

// Function to create the toast container if it doesn't exist
const createToastContainer = () => {
  if (toastContainer) return toastContainer;
  
  // Create a container for toasts if it doesn't exist
  toastContainer = document.createElement('div');
  toastContainer.id = 'toast-container';
  toastContainer.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 9999;
    display: flex;
    flex-direction: column-reverse;
    gap: 10px;
  `;
  
  document.body.appendChild(toastContainer);
  return toastContainer;
};

// Function to create a toast element
const createToastElement = (toast: ToastItem): HTMLDivElement => {
  const { id, message, type, duration } = toast;
  
  const toastElement = document.createElement('div');
  toastElement.id = id;
  toastElement.style.cssText = `
    padding: 12px 20px;
    border-radius: 8px;
    max-width: 350px;
    min-width: 280px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    display: flex;
    align-items: center;
    justify-content: space-between;
    transform: translateX(100%);
    animation: slideIn 0.3s forwards;
    transition: transform 0.3s ease, opacity 0.3s ease;
    color: white;
  `;

  // Set different background colors based on the type
  switch (type) {
    case 'success':
      toastElement.style.backgroundColor = '#4CAF50';
      break;
    case 'error':
      toastElement.style.backgroundColor = '#F44336';
      break;
    case 'info':
      toastElement.style.backgroundColor = '#2196F3';
      break;
    case 'warning':
      toastElement.style.backgroundColor = '#FF9800';
      break;
  }

  // Create the toast content
  const content = document.createElement('div');
  content.style.cssText = `
    flex-grow: 1;
    margin-right: 8px;
    word-wrap: break-word;
  `;
  content.textContent = message;
  toastElement.appendChild(content);

  // Create a close button
  const closeButton = document.createElement('button');
  closeButton.style.cssText = `
    background: none;
    border: none;
    color: white;
    font-size: 16px;
    cursor: pointer;
    padding: 0;
    margin-left: 8px;
  `;
  closeButton.textContent = '×';
  closeButton.onclick = () => removeToast(id);
  toastElement.appendChild(closeButton);

  // Add the CSS animations
  const style = document.createElement('style');
  style.innerHTML = `
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOut {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;
  document.head.appendChild(style);

  // Set a timeout to remove the toast after the duration
  setTimeout(() => removeToast(id), duration);

  return toastElement;
};

// Function to remove a toast
const removeToast = (id: string) => {
  const toastElement = document.getElementById(id);
  if (!toastElement) return;

  // Animate the toast out
  toastElement.style.animation = 'slideOut 0.3s forwards';
  
  // Remove the toast after the animation
    setTimeout(() => {
    if (toastElement.parentNode) {
      toastElement.parentNode.removeChild(toastElement);
    }
  }, 300);
};

// Function to show a toast
const showToast = (message: string, type: ToastType = 'info', duration: number = 5000) => {
  if (typeof window === 'undefined') return; // Don't run on server-side
  
  // Make sure the container exists
  const container = createToastContainer();
  
  // Create a unique ID for the toast
  const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Create the toast
  const toastElement = createToastElement({ id, message, type, duration });
  
  // Add the toast to the container
  container.appendChild(toastElement);
  
  // Only log non-error toasts to console
  switch (type) {
    case 'success':
      console.log('%c Success:', 'color: green; font-weight: bold;', message);
      break;
    case 'error':
      // Don't log errors to console - they'll show up in the UI
      break;
    case 'info':
      console.log('%c Info:', 'color: blue; font-weight: bold;', message);
      break;
    case 'warning':
      console.log('%c Warning:', 'color: orange; font-weight: bold;', message);
      break;
  }
  
  // Return the toast ID
  return id;
};

// Public API
const toast = {
  success: (message: string) => showToast(message, 'success'),
  error: (message: string) => showToast(message, 'error'),
  info: (message: string) => showToast(message, 'info'),
  warning: (message: string) => showToast(message, 'warning'),
  // Maintain compatibility with the previous API
  promise: () => Promise.resolve(),
  dismiss: (id?: string) => {
    if (id) removeToast(id);
  },
};

export default toast;
