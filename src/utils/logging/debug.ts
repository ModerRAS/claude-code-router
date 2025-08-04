import { LogManager } from './LogManager';
import { LogConfig } from './types/log-config';
import { Ok, Err } from './types/common';

async function debugLogManager() {
  console.log('=== Debug LogManager Initialization ===');
  
  try {
    console.log('1. Creating LogManager instance...');
    const logManager = new LogManager();
    console.log('✅ LogManager created');
    
    console.log('2. Initializing LogManager...');
    const result = await logManager.initialize();
    
    console.log('Initialization result:', result);
    
    if (result.isErr()) {
      console.error('❌ Initialization failed:', result.error.message);
      console.error('Stack:', result.error.stack);
      return false;
    }
    
    console.log('✅ LogManager initialized successfully');
    
    console.log('3. Getting logger...');
    const logger = logManager.getLogger();
    console.log('✅ Logger retrieved successfully');
    
    console.log('4. Testing logger...');
    logger.info('Test message from LogManager');
    console.log('✅ Test message logged successfully');
    
    console.log('5. Health check...');
    const health = logManager.healthCheck();
    console.log('Health check result:', JSON.stringify(health, null, 2));
    
    console.log('6. Cleanup...');
    await logManager.cleanup();
    console.log('✅ Cleanup completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Test crashed:', error);
    console.error('Stack:', error.stack);
    return false;
  }
}

debugLogManager()
  .then(success => {
    console.log('=== Test Result ===');
    console.log(success ? '✅ SUCCESS' : '❌ FAILED');
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test crashed:', error);
    process.exit(1);
  });