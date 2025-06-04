import { Component, For, Show, createSignal, JSX } from 'solid-js';
import { gameState, equipStone, saveGame } from '../store'; // Import new store items and actions
import type { StoneQualities } from '../interfaces'; // Import type from interfaces
import { showMessage, logMessage } from '../messageStore';
import StonePreview from './StonePreview';
// produce is not used here anymore

interface InventoryMenuProps {
  toggleInventory: () => void;
}

const InventoryMenu: Component<InventoryMenuProps> = (props) => {
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  // highlightedStone now stores the actual StoneQualities object or null, not an accessor
  const [highlightedStone, setHighlightedStone] = createSignal<StoneQualities | null>(null);

  const selectStone = (stone: StoneQualities, index: number) => {
    setSelectedIndex(index);
    setHighlightedStone(stone); 
    logMessage(`Inventory: Highlighted stone ${stone.seed}`);
  };

  const handleSetAsCurrent = async () => { // Make async for saveGame
    const stoneToEquip = highlightedStone(); // This is the actual stone object or null
    if (!stoneToEquip) {
      showMessage('No stone selected to equip.', 3000, 'error');
      return;
    }

    equipStone(stoneToEquip.seed); // Call new action
    await saveGame(); // Call new action
    
    logMessage(`Equipped stone set to: ${stoneToEquip.seed}`);
    showMessage(`Stone "${stoneToEquip.name || stoneToEquip.seed}" is now equipped.`, 3000, 'success');
    props.toggleInventory();
  };
  
  const getStoneDisplayName = (stone: StoneQualities): string => { // Added return type
    return `${stone.name || stone.seed.toString().substring(0, 8)}.. - ${stone.color} ${stone.shape} (R${stone.rarity})`;
  };

  // Style objects with correct CSS property names
  const inventoryContainerStyle: JSX.CSSProperties = { display: 'flex', "flex-direction": 'row', gap: '20px', padding: '20px', border: '1px solid #007bff', "border-radius": '8px', "background-color": '#f8f9fa' };
  const stoneListStyle: JSX.CSSProperties = { flex: '1', "max-height": '500px', "overflow-y": 'auto', border: '1px solid #ccc', padding: '10px' };
  const listItemStyle = (isSelected: boolean): JSX.CSSProperties => ({ 
    padding: '8px', margin: '4px 0', cursor: 'pointer', "border-radius": '4px', 
    "background-color": isSelected ? '#007bff' : '#fff', // Kept as string keys
    color: isSelected ? 'white' : 'black',
    border: isSelected ? '1px solid #0056b3' : '1px solid #ddd'
  });
  const previewDetailsStyle: JSX.CSSProperties = { flex: '2', padding: '10px', border: '1px solid #ccc', "background-color": '#fff' }; // Kept as string key
  const buttonStyle: JSX.CSSProperties = { padding: '10px 15px', "margin-top": '10px', cursor: 'pointer', "border-radius": '5px', border: 'none' }; // Kept as string keys

  return (
    <div style={inventoryContainerStyle}>
      <div style={stoneListStyle}>
        <h3>Your Stones ({gameState.stones.length})</h3> 
        <For each={gameState.stones} fallback={<p>No stones in inventory.</p>}>
          {(stone, index) => ( // stone here is the direct StoneQualities object from the array
            <div
              style={listItemStyle(selectedIndex() === index())} // selectedIndex is an accessor
              onClick={() => selectStone(stone, index())}
              onDblClick={handleSetAsCurrent} // Double click to equip
            >
              {getStoneDisplayName(stone)}
            </div>
          )}
        </For>
      </div>

      <div style={previewDetailsStyle}>
        <h3>Selected Stone Details</h3>
        <Show when={highlightedStone()} fallback={<p>Select a stone from the list to see details.</p>}>
          {(s) => { // s is an accessor for highlightedStone()
            const stone = s(); // Get the actual stone object
            return (
            <>
              <StonePreview stone={stone} showTitle={false} />
              
              <h4 style={{"margin-top": "15px"}}>Properties:</h4>
              <ul style={{ "list-style-type": 'none', padding: '0', "font-size": "0.9em" }}>
                <li><strong>Name:</strong> {stone.name || 'Unnamed Stone'}</li>
                <li><strong>Seed:</strong> {stone.seed}</li>
                <li><strong>Color:</strong> {stone.color}</li>
                <li><strong>Shape:</strong> {stone.shape}</li>
                <li><strong>Rarity:</strong> {stone.rarity}</li>
                <li><strong>Hardness:</strong> {stone.hardness.toFixed(2)}</li>
                <li><strong>Weight:</strong> {stone.weight.toFixed(2)}</li>
                <li><strong>Magic:</strong> {stone.magic.toFixed(2)}</li>
                <li><strong>Created:</strong> {new Date(stone.createdAt).toLocaleString()}</li>
              </ul>
              <button 
                onClick={handleSetAsCurrent} 
                disabled={!highlightedStone()}
                style={{ ...buttonStyle, "background-color": '#28a745', color: 'white', "margin-right": '10px' }}
              >
                Set as Current
              </button>
            </>
          );
        }}
        </Show>
        <hr style={{margin: "20px 0"}} />
        <button onClick={() => props.toggleInventory()} style={{ ...buttonStyle, "background-color": '#6c757d', color: 'white' }}>
          Close Inventory
        </button>
      </div>
    </div>
  );
};

export default InventoryMenu;
