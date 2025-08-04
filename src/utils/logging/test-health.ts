import { LogManager } from './LogManager';

async function testHealthCheck() {
  console.log('Testing health check...');
  
  const logManager = new LogManager();
  const result = await logManager.initialize();
  
  if (result.isErr()) {
    console.error('Initialization failed:', result.error);
    return;
  }
  
  const health = logManager.healthCheck();
  console.log('Health check result:');
  console.log('streams type:', typeof health.streams);
  console.log('streams is array:', Array.isArray(health.streams));
  console.log('streams content:', health.streams);
}

testHealthCheck();