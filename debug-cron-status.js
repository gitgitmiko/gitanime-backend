const cron = require('node-cron');

console.log('=== Debug Cron Job Status ===');
console.log('Current time (UTC):', new Date().toISOString());
console.log('Current local time:', new Date().toString());
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

// Test cron expression
const cronExpression = '0 0 * * *';
console.log('Cron expression:', cronExpression);

// Calculate next midnight
const now = new Date();
const tomorrow = new Date(now);
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(0, 0, 0, 0);

console.log('Next midnight (local):', tomorrow.toString());
console.log('Next midnight (UTC):', tomorrow.toISOString());

// Check if we're past midnight
const isPastMidnight = now.getHours() >= 0 && now.getMinutes() >= 0;
console.log('Is past midnight today:', isPastMidnight);

// Calculate time until next run
const timeUntilNext = tomorrow.getTime() - now.getTime();
const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
const minutesUntilNext = Math.floor((timeUntilNext % (1000 * 60 * 60)) / (1000 * 60));

console.log(`Time until next run: ${hoursUntilNext}h ${minutesUntilNext}m`);

console.log('=== End Debug ===');
