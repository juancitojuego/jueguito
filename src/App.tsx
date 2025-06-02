import { Component, Show, createSignal, onMount } from 'solid-js';
import { gameState, loadGame } from './store'; // Import new reactive state and actions
import StartMenu from './components/StartMenu';
import ConsoleLog from './components/ConsoleLog';
import MessageLine from './components/MessageLine';
import MainMenu from './components/MainMenu';
import StoneInfo from './components/StoneInfo';
import StonePreview from './components/StonePreview';
import InventoryMenu from './components/InventoryMenu'; // Will be created later
// Styles will be added later if needed, e.g., import './App.css';

const MainGameArea: Component<{ toggleInventory: () => void }> = (props) => {
  // No specific createEffect needed here for gameSeed changes now,
  // as GameStateManager handles opponent queue generation upon load/reset.
  // UI components will react directly to gameState changes.

  return (
    <div style={{ display: 'flex', "flex-wrap": "wrap", gap: '10px' }}>
      <div style={{ flex: '1 1 300px', "min-width": "250px", border: "1px solid #ccc", padding: "10px" }}>
        <StoneInfo />
      </div>
      <div style={{ flex: '1 1 300px', "min-width": "250px", border: "1px solid #ccc", padding: "10px" }}>
        <MainMenu toggleInventory={props.toggleInventory} />
      </div>
      <div style={{ flex: '2 1 400px', "min-width": "300px", border: "1px solid #ccc", padding: "10px" }}>
        <StonePreview />
      </div>
    </div>
  );
};

const App: Component = () => {
  const [showInventory, setShowInventory] = createSignal(false);
  const toggleInventory = () => setShowInventory(!showInventory());

  onMount(async () => {
    await loadGame(); // Load initial game state using the new action
  });

  return (
    <div id="app-container" style={{"max-width":"1200px", margin: "0 auto", padding: "10px", "font-family": "Arial, sans-serif" }}>
      <header style={{ "text-align": "center", "margin-bottom": "20px" }}>
        <h1>Stone Crafter - SolidJS Edition</h1>
      </header>
      <main>
        <Show
          when={gameState.gameSeed !== null && gameState.gameSeed !== undefined}
          fallback={<StartMenu />}
        >
          <Show when={!showInventory()} fallback={<InventoryMenu toggleInventory={toggleInventory} />}>
            <MainGameArea toggleInventory={toggleInventory} />
          </Show>
        </Show>
      </main>
      <footer style={{ "margin-top": "20px", border:"1px solid #eee", padding:"10px" }}>
        <MessageLine />
        <ConsoleLog />
      </footer>
    </div>
  );
};

export default App;
