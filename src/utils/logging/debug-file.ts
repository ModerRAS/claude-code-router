import { join } from 'path';
import { existsSync, readFileSync, mkdirSync } from 'fs';
import { LogManager } from '../LogManager';

async function debugLogFile() {
  console.log('=== Debug Log File ===');
  
  const testLogDir = join(__dirname, '..', '..', '..', 'test-logs');
  const testLogFile = join(testLogDir, 'test.log');
  
  console.log('Test log file:', testLogFile);
  console.log('File exists:', existsSync(testLogFile));
  
  if (existsSync(testLogFile)) {
    const content = readFileSync(testLogFile, 'utf8');
    console.log('File content:');
    console.log(content);
    console.log('Content length:', content.length);
  } else {
    console.log('File does not exist');
  }
  
  // Create directory if needed
  if (!existsSync(testLogDir)) {
    console.log('Creating directory:', testLogDir);
    mkdirSync(testLogDir, { recursive: true });
  }
}

debugLogFile();