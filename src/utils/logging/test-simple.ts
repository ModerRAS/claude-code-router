import { LogManager } from './LogManager';
import { LogConfig } from './types/log-config';

async function testLogManager() {
  console.log('Testing LogManager initialization...');
  
  try {
    const logManager = new LogManager();
    const result = await logManager.initialize();
    
    if (result.isErr()) {
      console.error('Initialization failed:', result.error.message);
      console.error('Stack:', result.error.stack);
      return false;
    }
    
    console.log('✅ LogManager initialized successfully');
    
    const logger = logManager.getLogger();
    console.log('✅ Logger retrieved successfully');
    
    logger.info('Test message from LogManager');
    console.log('✅ Test message logged successfully');
    
    const health = logManager.healthCheck();
    console.log('✅ Health check:', health);
    
    await logManager.cleanup();
    console.log('✅ Cleanup completed successfully');
    
    return true;
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

testLogManager()
  .then(success => {
    process.exit(success ? 0 : 1);
  })
  .catch(error => {
    console.error('Test crashed:', error);
    process.exit(1);
  });