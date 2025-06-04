// src/messageStore.ts
type ShowMessageSubscriber = (message: string, duration?: number, type?: 'info' | 'error' | 'success') => void;
type LogMessageSubscriber = (message: string) => void;

const showMessageSubscribers: ShowMessageSubscriber[] = [];
const logMessageSubscribers: LogMessageSubscriber[] = [];

// Export the store object if you need to group methods, otherwise direct exports are fine.
// export const messageStore = {};

export function subscribeToShowMessage(callback: ShowMessageSubscriber): () => void {
  showMessageSubscribers.push(callback);
  return () => {
    const index = showMessageSubscribers.indexOf(callback);
    if (index > -1) {
      showMessageSubscribers.splice(index, 1);
    }
  };
}

export function subscribeToLogMessages(callback: LogMessageSubscriber): () => void {
  logMessageSubscribers.push(callback);
  return () => {
    const index = logMessageSubscribers.indexOf(callback);
    if (index > -1) {
      logMessageSubscribers.splice(index, 1);
    }
  };
}

export function showMessage(message: string, duration: number = 3000, type: 'info' | 'error' | 'success' = 'info') {
  showMessageSubscribers.forEach(cb => cb(message, duration, type));
}

export function logMessage(message: string) {
  logMessageSubscribers.forEach(cb => cb(message));
}
