import { LogConfigManager } from './config/LogConfigManager';

async function testConfigManager() {
  console.log('=== Test ConfigManager ===');
  
  try {
    const configManager = new LogConfigManager();
    console.log('1. ConfigManager created');
    
    const result = await configManager.initialize();
    console.log('2. Initialization result:', result.isOk());
    
    if (result.isErr()) {
      console.error('Initialization failed:', result.error);
      return;
    }
    
    const config = configManager.getConfig();
    console.log('3. Config streams:', config.streams.map(s => s.name));
    
    const stream = configManager.getStream('default-console');
    console.log('4. Get stream result:', stream?.name);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testConfigManager();