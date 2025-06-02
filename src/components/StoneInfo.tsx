import { Component, Show } from 'solid-js';
import { currentSaveData, currentStoneDetails } from '../store'; // Adjust path as needed

const StoneInfo: Component = () => {
  return (
    <div>
      <h3>Stone Information</h3>
      <Show
        when={currentStoneDetails()}
        fallback={<p>No stone equipped or details available.</p>}
      >
        {(stone) => (
          <ul style={{ "list-style-type": "none", padding: "0" }}>
            <li><strong>Name:</strong> {stone.name || 'Unnamed Stone'}</li>
            <li><strong>Seed:</strong> {stone.seed}</li>
            <li><strong>Color:</strong> {stone.color}</li>
            <li><strong>Shape:</strong> {stone.shape}</li>
            <li><strong>Rarity:</strong> {stone.rarity}</li>
            <li><strong>Hardness:</strong> {stone.hardness.toFixed(2)}</li>
            <li><strong>Weight:</strong> {stone.weight.toFixed(2)}</li> {/* Assuming weight can be float */}
            <li><strong>Magic:</strong> {stone.magic.toFixed(2)}</li> {/* Assuming magic can be float */}
            <li><strong>Created:</strong> {new Date(stone.createdAt).toLocaleString()}</li>
          </ul>
        )}
      </Show>
      <hr />
      <div>
        <strong>Player:</strong> {currentSaveData.playerName || 'N/A'}
      </div>
      <div>
        <strong>Currency:</strong> ${currentSaveData.currency}
      </div>
    </div>
  );
};

export default StoneInfo;
