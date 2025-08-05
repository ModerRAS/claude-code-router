import { join } from 'path';
import { existsSync, mkdirSync, readFileSync } from 'fs';
import roll from 'pino-roll';

async function testPinoRoll() {
  console.log('=== Testing pino-roll ===');
  
  try {
    const testLogDir = join(__dirname, '..', '..', '..', 'test-logs');
    const testLogFile = join(testLogDir, 'test-roll.log');
    
    console.log('Test log file:', testLogFile);
    
    if (!existsSync(testLogDir)) {
      mkdirSync(testLogDir, { recursive: true });
    }
    
    // Test pino-roll directly
    const stream = roll(testLogFile, {
      size: '1M',
      interval: '1d',
      mkdir: true,
    });
    
    console.log('pino-roll stream created successfully');
    console.log('Stream type:', typeof stream);
    console.log('Stream keys:', Object.keys(stream));
    
    // Check if file exists
    if (existsSync(testLogFile)) {
      const content = readFileSync(testLogFile, 'utf8');
      console.log('File content:', content);
    } else {
      console.log('File does not exist yet');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testPinoRoll();