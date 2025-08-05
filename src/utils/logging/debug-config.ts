import { LogConfigManager } from './config/LogConfigManager';

async function debugConfigManager() {
  console.log('=== Debug ConfigManager ===');
  
  try {
    const configManager = new LogConfigManager();
    console.log('1. ConfigManager created');
    
    const initResult = await configManager.initialize();
    console.log('2. Initialization result:', initResult);
    
    if (initResult.isErr()) {
      console.error('Initialization failed:', initResult.error);
      return;
    }
    
    const config = configManager.getConfig();
    console.log('3. Config streams:', config.streams);
    
    const stream = configManager.getStream('default-console');
    console.log('4. Get stream result:', stream);
    
    const updateResult = configManager.updateStream('default-console', { level: 'debug' });
    console.log('5. Update stream result:', updateResult);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

debugConfigManager();