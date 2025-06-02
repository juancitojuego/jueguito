import { Component, Show } from 'solid-js';
import { currentMessage } from '../store'; // Assuming path is correct

const MessageLine: Component = () => {
  return (
    <Show when={currentMessage()}>
      {(msg) => ( // msg is a non-null Message object here
        <div
          style={{
            border: '1px solid blue',
            padding: '10px',
            margin: '5px',
            background_color: msg.type === 'error' ? 'lightcoral' : msg.type === 'success' ? 'lightgreen' : 'lightblue',
            color: msg.type === 'error' ? 'white' : 'black',
            text_align: 'center',
          }}
        >
          {msg.text}
        </div>
      )}
    </Show>
  );
};

export default MessageLine;
