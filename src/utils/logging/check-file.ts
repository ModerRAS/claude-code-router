import { join } from 'path';
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'fs';

async function checkTestFile() {
  console.log('=== Check Test File ===');
  
  const testLogDir = join(__dirname, '..', '..', '..', 'test-logs');
  const testLogFile = join(testLogDir, 'test.log');
  
  console.log('Test log directory:', testLogDir);
  console.log('Test log file:', testLogFile);
  console.log('Directory exists:', existsSync(testLogDir));
  console.log('File exists:', existsSync(testLogFile));
  
  if (existsSync(testLogFile)) {
    const stats = require('fs').statSync(testLogFile);
    console.log('File size:', stats.size);
    console.log('File modified time:', stats.mtime);
    
    const content = readFileSync(testLogFile, 'utf8');
    console.log('File content (length:', content.length, '):');
    console.log(JSON.stringify(content));
  } else {
    console.log('File does not exist');
    
    // Try to create directory and file
    if (!existsSync(testLogDir)) {
      console.log('Creating directory');
      mkdirSync(testLogDir, { recursive: true });
    }
    
    console.log('Creating test file');
    writeFileSync(testLogFile, 'test content\n');
    console.log('Test file created');
  }
}

checkTestFile();