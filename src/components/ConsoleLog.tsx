import { Component, For, createEffect, JSX } from 'solid-js';
import { consoleLogMessages } from '../store'; 

const ConsoleLog: Component = () => {
  let scrollableLogRef: HTMLDivElement | undefined;

  createEffect(() => {
    if (scrollableLogRef) {
      const messages = consoleLogMessages(); // Access signal to trigger effect
      if (messages.length > 0) {
         scrollableLogRef.scrollTop = scrollableLogRef.scrollHeight;
      }
    }
  });

  const containerStyle: JSX.CSSProperties = {
    border: '1px solid grey',
    margin: '5px',
    padding: '5px',
    height: '150px',
    "overflow-y": 'auto', // Corrected: kebab-case in string literal
  };

  const messageStyle: JSX.CSSProperties = {
    "font-family": 'monospace', // Corrected: kebab-case in string literal
    "font-size": '12px', // Corrected: kebab-case in string literal
  };

  return (
    <div style={containerStyle} ref={scrollableLogRef}>
      <strong>Console Log:</strong>
      <For each={consoleLogMessages()}>
        {(msg) => ( // Corrected: 'msg' is the item from the array
          <div style={messageStyle}>
            {msg}
          </div>
        )}
      </For>
    </div>
  );
};

export default ConsoleLog;
