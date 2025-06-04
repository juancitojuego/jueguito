import { Component, Show } from 'solid-js';
import { currentMessage } from '../messageStore'; // Use messageStore for currentMessage

const MessageLine: Component = () => {
  return (
    <Show when={currentMessage()}>
      {(msg) => ( // msg is a non-null Message object here
        <div
          style={{
            border: '1px solid blue',
            padding: '10px',
            margin: '5px',
            "background-color": msg().type === 'error' ? 'lightcoral' : msg().type === 'success' ? 'lightgreen' : 'lightblue', // kebab-case
            color: msg().type === 'error' ? 'white' : 'black',
            "text-align": 'center', // kebab-case
          }}
        >
          {msg().text}
        </div>
      )}
    </Show>
  );
};

export default MessageLine;
