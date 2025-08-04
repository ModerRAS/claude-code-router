import { LogManager } from './LogManager';

async function debugHealthCheck() {
  console.log('=== Debug Health Check ===');
  
  try {
    const logManager = new LogManager();
    const initResult = await logManager.initialize();
    
    if (initResult.isErr()) {
      console.error('初始化失败:', initResult.error);
      return;
    }
    
    const health = logManager.healthCheck();
    console.log('Health check result:');
    console.log(JSON.stringify(health, null, 2));
    
    console.log('\nStreams type:', typeof health.streams);
    console.log('Is array:', Array.isArray(health.streams));
    console.log('Streams content:', health.streams);
    
  } catch (error) {
    console.error('错误:', error);
  }
}

debugHealthCheck();