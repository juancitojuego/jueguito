import * as readline from 'readline';
import { SeedProperties } from '../types'; // For displaying seed info

export function displayMainMenuOptions(seedProps?: SeedProperties): void {
    console.log("\n=============================");
    console.log("   Idle Stone Collector");
    if (seedProps) {
        // Customize this to show relevant parts of the seed's properties
        console.log(`   World Seed ID: ${seedProps.color.charAt(0)}${seedProps.shape.charAt(0)}-${String(seedProps.weight).padStart(3,'0')}${String(seedProps.hardness).padStart(3,'0')}${String(seedProps.rarity).padStart(2,'0')}`);
    }
    console.log("=============================");
    console.log("1. Open a new stone package");
    console.log("2. View inventory");
    console.log("3. Exit game");
    console.log("=============================");
}

export function promptMenuChoice(): Promise<string> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve) => {
        rl.question("Enter your choice (1-3): ", (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

export function promptForKeyPress(message: string): Promise<void> {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise<void>(resolve => {
        rl.question(`\n${message}`, () => {
            rl.close();
            resolve();
        });
    });
}
