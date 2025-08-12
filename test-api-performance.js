const axios = require('axios');

// Configuration
const BASE_URL = 'https://gitanime-backend.onrender.com';
const TEST_ENDPOINTS = [
  '/api/latest-episodes?page=1&limit=20',
  '/api/anime-list?page=1&limit=20',
  '/api/anime?page=1&limit=20',
  '/api/cache-status',
  '/health'
];

// Performance test function
async function testEndpointPerformance(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const startTime = Date.now();
  
  try {
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'Origin': 'https://gitanime-web.vercel.app',
        'User-Agent': 'GitAnime-Performance-Test/1.0'
      }
    });
    
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      endpoint,
      status: response.status,
      responseTime: `${responseTime}ms`,
      success: true,
      dataSize: JSON.stringify(response.data).length,
      fromCache: response.data?.data?.summary?.fromCache || response.data?.fromCache || false
    };
  } catch (error) {
    const endTime = Date.now();
    const responseTime = endTime - startTime;
    
    return {
      endpoint,
      status: error.response?.status || 'ERROR',
      responseTime: `${responseTime}ms`,
      success: false,
      error: error.message,
      fromCache: false
    };
  }
}

// Cache test function
async function testCachePerformance() {
  console.log('\n🧪 Testing Cache Performance...\n');
  
  // First request (should be slow - from file)
  console.log('📥 First request (should read from file):');
  const firstRequest = await testEndpointPerformance('/api/latest-episodes?page=1&limit=20');
  console.log(`   ${firstRequest.endpoint}`);
  console.log(`   Status: ${firstRequest.status}`);
  console.log(`   Response Time: ${firstRequest.responseTime}`);
  console.log(`   From Cache: ${firstRequest.fromCache}`);
  console.log(`   Data Size: ${firstRequest.dataSize} bytes`);
  
  // Wait a bit
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Second request (should be fast - from cache)
  console.log('\n📤 Second request (should read from cache):');
  const secondRequest = await testEndpointPerformance('/api/latest-episodes?page=1&limit=20');
  console.log(`   ${secondRequest.endpoint}`);
  console.log(`   Status: ${secondRequest.status}`);
  console.log(`   Response Time: ${secondRequest.responseTime}`);
  console.log(`   From Cache: ${secondRequest.fromCache}`);
  console.log(`   Data Size: ${secondRequest.dataSize} bytes`);
  
  // Calculate improvement
  if (firstRequest.success && secondRequest.success) {
    const firstTime = parseInt(firstRequest.responseTime);
    const secondTime = parseInt(secondRequest.responseTime);
    const improvement = ((firstTime - secondTime) / firstTime * 100).toFixed(1);
    
    console.log(`\n📊 Performance Improvement: ${improvement}% faster with cache`);
    
    if (secondTime < 100) {
      console.log('✅ Cache is working well! Response time < 100ms');
    } else if (secondTime < 500) {
      console.log('⚠️  Cache is working, but could be faster');
    } else {
      console.log('❌ Cache might not be working properly');
    }
  }
}

// CORS test function
async function testCORS() {
  console.log('\n🌐 Testing CORS Configuration...\n');
  
  try {
    // Test preflight request
    const preflightResponse = await axios.options(`${BASE_URL}/api/latest-episodes`, {
      headers: {
        'Origin': 'https://gitanime-web.vercel.app',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type'
      }
    });
    
    console.log('✅ Preflight request successful');
    console.log(`   Status: ${preflightResponse.status}`);
    console.log(`   CORS Headers: ${JSON.stringify(preflightResponse.headers, null, 2)}`);
    
  } catch (error) {
    console.log('❌ Preflight request failed');
    console.log(`   Error: ${error.message}`);
  }
  
  try {
    // Test actual request with CORS headers
    const response = await axios.get(`${BASE_URL}/api/latest-episodes?page=1&limit=20`, {
      headers: {
        'Origin': 'https://gitanime-web.vercel.app'
      }
    });
    
    console.log('\n✅ CORS request successful');
    console.log(`   Status: ${response.status}`);
    console.log(`   Response received: ${response.data ? 'Yes' : 'No'}`);
    
  } catch (error) {
    console.log('\n❌ CORS request failed');
    console.log(`   Error: ${error.message}`);
  }
}

// Main test function
async function runPerformanceTests() {
  console.log('🚀 GitAnime Backend Performance Test');
  console.log('=====================================\n');
  
  console.log('📋 Testing all endpoints...\n');
  
  // Test all endpoints
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testEndpointPerformance(endpoint);
    
    if (result.success) {
      console.log(`✅ ${endpoint}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response Time: ${result.responseTime}`);
      console.log(`   Data Size: ${result.dataSize} bytes`);
      console.log(`   From Cache: ${result.fromCache}`);
    } else {
      console.log(`❌ ${endpoint}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Response Time: ${result.responseTime}`);
      console.log(`   Error: ${result.error}`);
    }
    console.log('');
  }
  
  // Test cache performance
  await testCachePerformance();
  
  // Test CORS
  await testCORS();
  
  console.log('\n🎯 Performance Test Summary:');
  console.log('============================');
  console.log('✅ All endpoints tested');
  console.log('✅ Cache performance measured');
  console.log('✅ CORS configuration verified');
  console.log('\n📊 Check the results above for any issues');
}

// Run tests
if (require.main === module) {
  runPerformanceTests().catch(console.error);
}

module.exports = {
  testEndpointPerformance,
  testCachePerformance,
  testCORS,
  runPerformanceTests
};
