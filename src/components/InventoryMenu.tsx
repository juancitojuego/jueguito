import { Component, For, Show, createSignal } from 'solid-js';
import { currentSaveData, setCurrentSaveData, saveData, StoneQualities, setCurrentStoneDetails } from '../store';
import { showMessage, logMessage } from '../utils';
import StonePreview from './StonePreview'; // Assuming StonePreview can take a stone prop or we make a local version
import { produce } from 'solid-js/store';

interface InventoryMenuProps {
  toggleInventory: () => void;
}

const InventoryMenu: Component<InventoryMenuProps> = (props) => {
  const [selectedIndex, setSelectedIndex] = createSignal<number | null>(null);
  const [highlightedStone, setHighlightedStone] = createSignal<StoneQualities | null>(null);

  const selectStone = (stone: StoneQualities, index: number) => {
    setSelectedIndex(index);
    setHighlightedStone(stone);
    logMessage(`Inventory: Highlighted stone ${stone.seed}`);
  };

  const handleSetAsCurrent = () => {
    const stoneToEquip = highlightedStone();
    if (!stoneToEquip) {
      showMessage('No stone selected to equip.', 3000, 'error');
      return;
    }

    setCurrentSaveData('equippedStone', stoneToEquip); // Directly set the stone object
    setCurrentStoneDetails(stoneToEquip); // Update the global signal for current stone details
    saveData();
    
    logMessage(`Equipped stone set to: ${stoneToEquip.seed}`);
    showMessage(`Stone "${stoneToEquip.name || stoneToEquip.seed}" is now equipped.`, 3000, 'success');
    props.toggleInventory(); // Close inventory
  };
  
  const getStoneDisplayName = (stone: StoneQualities) => {
    return `${stone.name || stone.seed.toString().substring(0, 8)}.. - ${stone.color} ${stone.shape} (R${stone.rarity})`;
  };

  // Style objects
  const inventoryContainerStyle = { display: 'flex', "flex-direction": 'row', gap: '20px', padding: '20px', border: '1px solid #007bff', "border-radius": '8px', background_color: '#f8f9fa' };
  const stoneListStyle = { flex: '1', "max-height": '500px', "overflow-y": 'auto', border: '1px solid #ccc', padding: '10px' };
  const listItemStyle = (isSelected: boolean) => ({ 
    padding: '8px', margin: '4px 0', cursor: 'pointer', "border-radius": '4px', 
    background_color: isSelected ? '#007bff' : '#fff',
    color: isSelected ? 'white' : 'black',
    border: isSelected ? '1px solid #0056b3' : '1px solid #ddd'
  });
  const previewDetailsStyle = { flex: '2', padding: '10px', border: '1px solid #ccc', background_color: '#fff' };
  const buttonStyle = { padding: '10px 15px', "margin-top": '10px', cursor: 'pointer', "border-radius": '5px', border: 'none' };


  return (
    <div style={inventoryContainerStyle}>
      <div style={stoneListStyle}>
        <h3>Your Stones ({currentSaveData.stones.length})</h3>
        <For each={currentSaveData.stones} fallback={<p>No stones in inventory.</p>}>
          {(stone, index) => (
            <div
              style={listItemStyle(selectedIndex() === index())}
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
          {(stone) => (
            <>
              {/* Use the StonePreview component for the highlighted stone */}
              <StonePreview stone={stone} showTitle={false} />
              
              {/* Optionally, still list details if StonePreview is minimal, or remove this section */}
              <h4 style={{"margin-top": "15px"}}>Properties:</h4>
              <ul style={{ "list-style-type": 'none', padding: '0', "font-size": "0.9em" }}>
                <li><strong>Name:</strong> {stone().name || 'Unnamed Stone'}</li>
                <li><strong>Seed:</strong> {stone().seed}</li>
                <li><strong>Color:</strong> {stone().color}</li>
                <li><strong>Shape:</strong> {stone().shape}</li>
                <li><strong>Rarity:</strong> {stone().rarity}</li>
                <li><strong>Hardness:</strong> {stone().hardness.toFixed(2)}</li>
                <li><strong>Weight:</strong> {stone().weight.toFixed(2)}</li>
                <li><strong>Magic:</strong> {stone().magic.toFixed(2)}</li>
                <li><strong>Created:</strong> {new Date(stone().createdAt).toLocaleString()}</li>
              </ul>
              <button 
                onClick={handleSetAsCurrent} 
                disabled={!highlightedStone()}
                style={{ ...buttonStyle, "background-color": '#28a745', color: 'white', "margin-right": '10px' }}
              >
                Set as Current
              </button>
            </>
          )}
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
