const cron = require('node-cron');

console.log('=== Testing Cron Job ===');
console.log('Current time:', new Date().toString());

// Test cron job that runs every minute
const testJob = cron.schedule('* * * * *', () => {
  console.log('✅ Cron job is working! Current time:', new Date().toString());
}, {
  scheduled: false
});

console.log('Starting test cron job...');
testJob.start();

// Stop after 2 minutes
setTimeout(() => {
  console.log('Stopping test cron job...');
  testJob.stop();
  process.exit(0);
}, 120000); // 2 minutes
