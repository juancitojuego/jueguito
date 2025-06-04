// src/blessed/ui/messageLog.ts
import blessed from 'blessed';
import { screen } from '../index';
import { subscribeToShowMessage, subscribeToLogMessages } from '../../messageStore'; // Assumes these are exported

export function createMessageLine(parentContext: blessed.Widgets.NodeWithEvents | blessed.Widgets.Screen = screen) {
  const messageLine = blessed.text({
    parent: parentContext,
    // label: 'Messages', // Removed label to save space
    left: 0,
    top: 0, // Will be placed within bottomPanel, so top:0 is fine
    width: '100%',
    height: 1,
    tags: true,
    style: { fg: 'yellow' },
  });

  const update = (message: string, type: 'info' | 'error' | 'success' = 'info') => {
    let color = 'yellow';
    if (type === 'error') color = 'red';
    if (type === 'success') color = 'green';
    messageLine.setContent(`{${color}-fg}${message}{/${color}-fg}`);
    screen.render();
  };

  subscribeToShowMessage((msg: string, duration?: number, type?: 'info' | 'error' | 'success') => {
    update(msg, type);
    if (duration) {
      setTimeout(() => {
        // Check if the message is still the current one before clearing
        const currentContent = messageLine.getContent();
        const expectedContent = `{${type === 'error' ? 'red' : type === 'success' ? 'green' : 'yellow'}-fg}${msg}{/${type === 'error' ? 'red' : type === 'success' ? 'green' : 'yellow'}-fg}`;
        if (currentContent === expectedContent) {
            messageLine.setContent('');
            screen.render();
        }
      }, duration);
    }
  });
  return { element: messageLine, update };
}

export function createConsoleLog(parentContext: blessed.Widgets.NodeWithEvents | blessed.Widgets.Screen = screen) {
  const consoleLog = blessed.log({
    parent: parentContext,
    label: 'Console Log',
    left: 0,
    top: 1, // Positioned below the message line in the bottomPanel
    width: '100%',
    height: '100%-1', // Fill remaining space in parent (e.g. bottomPanel height - 1)
    border: 'line',
    tags: true,
    scrollable: true,
    scrollbar: {
      ch: ' ',
      inverse: true
    },
    keys: true,
    mouse: true,
  });

  const addLogEntry = (message: string) => {
    consoleLog.add(message);
    consoleLog.setScrollPerc(100);
    screen.render();
  };

  subscribeToLogMessages(addLogEntry);

  return { element: consoleLog, addLogEntry };
}
