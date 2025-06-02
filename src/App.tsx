import { Component, Show, createSignal, createEffect, onMount } from 'solid-js';
import { currentSaveData, loadData, generateOpponentList, initializeGamePrng } from './store'; // Removed gamePrngInstance
import StartMenu from './components/StartMenu';
import ConsoleLog from './components/ConsoleLog';
import MessageLine from './components/MessageLine';
import MainMenu from './components/MainMenu';
import StoneInfo from './components/StoneInfo';
import StonePreview from './components/StonePreview';
import InventoryMenu from './components/InventoryMenu'; // Will be created later
// Styles will be added later if needed, e.g., import './App.css';

const MainGameArea: Component<{ toggleInventory: () => void }> = (props) => {
  // This effect runs when currentSaveData.gameSeed changes and is not null.
  // It's a good place to initialize things that depend on the gameSeed.
  createEffect(() => {
    if (currentSaveData.gameSeed !== null && currentSaveData.gameSeed !== undefined) {
      // Check if PRNG is initialized, if not (e.g. after direct load into game), initialize it.
      // store.ts's loadData also tries to init PRNG and opponent list. This is a fallback.
      // The store's loadData should handle this.
      // if (currentSaveData.gameSeed && !getGamePrng()) { // getGamePrng would throw if not init
      //  initializeGamePrng(currentSaveData.gameSeed);
      //  console.log("App.tsx: Initialized gamePrng because it wasn't set.");
      // }
      // Generate opponent queue if it's empty (e.g., on first load or if not persisted)
      // store.ts's loadData handles this as well.
      // if (opponentQueue.length === 0) {
      //  generateOpponentList();
      //  logMessage("Initial opponent list generated from App.tsx.");
      // }
    }
  });

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

  // loadData is called when store.ts is imported.
  // generateOpponentList is called by loadData if gameSeed exists and queue is empty.

  return (
    <div id="app-container" style={{"max-width":"1200px", margin: "0 auto", padding: "10px", "font-family": "Arial, sans-serif" }}>
      <header style={{ "text-align": "center", "margin-bottom": "20px" }}>
        <h1>Stone Crafter - SolidJS Edition</h1>
      </header>
      <main>
        <Show
          when={currentSaveData.gameSeed !== null && currentSaveData.gameSeed !== undefined}
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
