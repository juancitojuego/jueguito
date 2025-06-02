// Mock os.homedir FIRST to provide a consistent path for tests
const mockHomeDir = '/mock/home';
jest.doMock('os', () => ({
  ...jest.requireActual('os'), // import and retain default behavior
  homedir: () => mockHomeDir, // override homedir
}));

import { loadData, saveData, getDefaultSaveData, SaveData } from '@src/store';
import { StoneQualities, createStone } from '@src/stone'; // For creating test StoneQualities
import * as fs from 'fs';
// import * as os from 'os'; // os is already mocked by jest.doMock
import * as path from 'path';

// Mock the 'fs' module
jest.mock('fs');
const mockedFs = fs as jest.Mocked<typeof fs>;
const SAVE_PATH = path.join(mockHomeDir, '.stone-crafter.json');

describe('Store Logic', () => {
  const defaultData = getDefaultSaveData();

  beforeEach(() => {
    // Reset all fs mocks before each test
    mockedFs.existsSync.mockReset();
    mockedFs.readFileSync.mockReset();
    mockedFs.writeFileSync.mockReset();
  });

  describe('getDefaultSaveData', () => {
    test('should return the correct default structure', () => {
      const data = getDefaultSaveData();
      expect(data).toEqual({
        stones: [],
        currency: 0,
        currentStoneSeed: null,
        gameSeed: null,
        opponents_index: 0,
        salt: 'StoneArenaSaltValueV1',
      });
    });
  });

  describe('saveData and loadData', () => {
    test('should save and load data correctly', () => {
      const stone1 = createStone(1);
      const stone2 = createStone(2);
      const testData: SaveData = {
        ...getDefaultSaveData(),
        stones: [stone1, stone2],
        currency: 100,
        currentStoneSeed: stone1.seed,
        gameSeed: 12345,
        opponents_index: 5,
        salt: 'TestSalt',
      };

      mockedFs.existsSync.mockReturnValue(true);
      // Capture what writeFileSync is called with
      let writtenData = '';
      mockedFs.writeFileSync.mockImplementation((path, data) => {
        writtenData = data as string;
      });

      saveData(testData);
      expect(mockedFs.writeFileSync).toHaveBeenCalledWith(SAVE_PATH, expect.any(String), 'utf-8');

      // Now mock readFileSync to return the captured data
      mockedFs.readFileSync.mockReturnValue(writtenData);

      const loaded = loadData();
      // Sort stones for comparison as order might change during stringify/parse if not careful,
      // though our save/load logic should preserve it due to sorting on load.
      // The loadData function itself sorts by createdAt.
      // For a stable comparison, we should ensure testData.stones is sorted similarly before comparing elements.
      const sortedTestDataStones = [...testData.stones].sort((a, b) => a.createdAt - b.createdAt);

      expect(loaded.stones.length).toBe(sortedTestDataStones.length);
      loaded.stones.forEach((loadedStone, index) => {
        expect(loadedStone.seed).toEqual(sortedTestDataStones[index].seed);
        expect(loadedStone.color).toEqual(sortedTestDataStones[index].color);
        // Add more property checks as needed for full validation
      });

      expect(loaded.currency).toBe(testData.currency);
      expect(loaded.currentStoneSeed).toBe(testData.currentStoneSeed);
      expect(loaded.gameSeed).toBe(testData.gameSeed);
      expect(loaded.opponents_index).toBe(testData.opponents_index);
      expect(loaded.salt).toBe(testData.salt);
    });

    test('loadData should return default data if save file does not exist', () => {
      mockedFs.existsSync.mockReturnValue(false);
      const loaded = loadData();
      expect(loaded).toEqual(defaultData);
    });

    test('loadData should return default data if JSON is corrupted', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('{"corrupted": json}');
      const loaded = loadData();
      expect(loaded).toEqual(defaultData);
    });

    test('loadData should use defaults for missing optional fields', () => {
      const partialSave = {
        stones: [],
        currency: 50,
        // gameSeed, opponents_index, salt are missing
      };
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(partialSave));
      const loaded = loadData();
      expect(loaded.currency).toBe(50);
      expect(loaded.gameSeed).toBe(defaultData.gameSeed);
      expect(loaded.opponents_index).toBe(defaultData.opponents_index);
      expect(loaded.salt).toBe(defaultData.salt);
    });

    test('loadData should filter out invalid stone objects', () => {
      const validStone = createStone(100);
      const invalidStone = { seed: 'not-a-number' }; // Missing other props, invalid seed type
      const mixedStones = [validStone, invalidStone];

      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ ...defaultData, stones: mixedStones }));

      const loaded = loadData();
      expect(loaded.stones.length).toBe(1);
      expect(loaded.stones[0].seed).toBe(validStone.seed);
    });

    test('loadData correctly sorts stones by createdAt', () => {
      const stoneOld = { ...createStone(300), createdAt: Date.now() - 1000 };
      const stoneNew = { ...createStone(400), createdAt: Date.now() };
      const stoneMiddle = { ...createStone(500), createdAt: Date.now() - 500 };

      // Save in unsorted order
      const savedStones: StoneQualities[] = [stoneNew, stoneOld, stoneMiddle];
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ ...defaultData, stones: savedStones }));

      const loaded = loadData();
      expect(loaded.stones.length).toBe(3);
      expect(loaded.stones.map((s) => s.seed)).toEqual([stoneOld.seed, stoneMiddle.seed, stoneNew.seed]);
    });

    test('loadData handles empty stones array and sets currentStoneSeed to null', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify({ ...defaultData, stones: [], currentStoneSeed: 123 }));
      const loaded = loadData();
      expect(loaded.stones).toEqual([]);
      expect(loaded.currentStoneSeed).toBeNull();
    });

    test('loadData sets currentStoneSeed to first stone if saved seed is invalid', () => {
      const stone1 = createStone(1);
      const stone2 = createStone(2);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(
        JSON.stringify({ ...defaultData, stones: [stone1, stone2], currentStoneSeed: 999 /* invalid */ })
      );
      const loaded = loadData();
      expect(loaded.currentStoneSeed).toBe(stone1.seed);
    });
  });
});
