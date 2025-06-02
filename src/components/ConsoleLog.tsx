import { Component, For, createEffect, onMount, onCleanup } from 'solid-js';
import { consoleLogMessages } from '../store'; // Assuming path is correct

const ConsoleLog: Component = () => {
  let scrollableLogRef: HTMLDivElement | undefined;

  createEffect(() => {
    // Auto-scroll to bottom when new messages are added
    if (scrollableLogRef) {
      // Accessing consoleLogMessages to trigger effect on change
      const messages = consoleLogMessages();
      if (messages.length > 0) {
         scrollableLogRef.scrollTop = scrollableLogRef.scrollHeight;
      }
    }
  });

  return (
    <div style={{ border: '1px solid grey', margin: '5px', padding: '5px', height: '150px', overflow_y: 'auto' }} ref={scrollableLogRef}>
      <strong>Console Log:</strong>
      <For each={consoleLogMessages()}>
        {(message, index) => (
          <div style={{ font-family: 'monospace', font-size: '12px' }}>
            {message}
          </div>
        )}
      </For>
    </div>
  );
};

export default ConsoleLog;
