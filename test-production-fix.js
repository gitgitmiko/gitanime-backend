const axios = require('axios');

// Configuration
const BASE_URL = 'https://gitanime-backend.onrender.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'your_admin_password_here';

// Test script untuk production fix
async function testProductionFix() {
  console.log('🧪 Testing Production Fix - GitAnime Backend\n');
  
  try {
    // 1. Test basic endpoints
    console.log('1️⃣ Testing Basic Endpoints...\n');
    
    const healthResponse = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Health endpoint:', healthResponse.status);
    
    const cacheStatusResponse = await axios.get(`${BASE_URL}/api/cache-status`);
    console.log('✅ Cache status endpoint:', cacheStatusResponse.status);
    
    // 2. Test debug endpoint
    console.log('\n2️⃣ Testing Debug Endpoint...\n');
    
    try {
      const debugResponse = await axios.get(`${BASE_URL}/api/debug-files`);
      console.log('✅ Debug endpoint accessible');
      
      const debugData = debugResponse.data.data;
      console.log('   Environment:', debugData.environment);
      console.log('   File Paths:', debugData.filePaths);
      console.log('   File Exists:', debugData.fileExists);
      console.log('   File Sizes:', debugData.fileSizes);
      console.log('   Cache Data:', debugData.cacheData);
      
    } catch (error) {
      console.log('❌ Debug endpoint not accessible yet (needs deployment)');
      console.log('   Error:', error.response?.status || error.message);
    }
    
    // 3. Test force refresh
    console.log('\n3️⃣ Testing Force Refresh...\n');
    
    try {
      const forceRefreshResponse = await axios.post(`${BASE_URL}/api/force-refresh`, {
        password: ADMIN_PASSWORD
      });
      
      console.log('✅ Force refresh successful');
      const results = forceRefreshResponse.data.data.results;
      
      if (results.latestEpisodes) {
        console.log('   Latest Episodes:', results.latestEpisodes.totalEpisodes, 'episodes');
      }
      if (results.animeList) {
        console.log('   Anime List:', results.animeList.totalAnime, 'anime');
      }
      if (results.animeData) {
        console.log('   Anime Data:', results.animeData.totalAnime, 'anime,', results.animeData.totalEpisodes, 'episodes');
      }
      
      if (results.errors && results.errors.length > 0) {
        console.log('   Errors:', results.errors);
      }
      
    } catch (error) {
      if (error.response?.status === 401) {
        console.log('❌ Force refresh failed: Unauthorized (check ADMIN_PASSWORD)');
      } else {
        console.log('❌ Force refresh failed:', error.response?.status || error.message);
      }
    }
    
    // 4. Test API with force refresh
    console.log('\n4️⃣ Testing API with Force Refresh...\n');
    
    try {
      const latestEpisodesResponse = await axios.get(`${BASE_URL}/api/latest-episodes?page=1&limit=20&forceRefresh=true`);
      const data = latestEpisodesResponse.data.data;
      
      console.log('✅ Latest Episodes API:');
      console.log('   Status:', latestEpisodesResponse.status);
      console.log('   Episodes Count:', data.episodes.length);
      console.log('   Total Episodes:', data.summary.totalEpisodes);
      console.log('   From Cache:', data.summary.fromCache);
      
      if (data.episodes.length === 0) {
        console.log('   ⚠️  WARNING: Episodes array is empty!');
      } else {
        console.log('   ✅ SUCCESS: Episodes data is loaded!');
      }
      
    } catch (error) {
      console.log('❌ Latest Episodes API failed:', error.response?.status || error.message);
    }
    
    // 5. Test cache performance
    console.log('\n5️⃣ Testing Cache Performance...\n');
    
    try {
      // First request (should be from file)
      const start1 = Date.now();
      const firstResponse = await axios.get(`${BASE_URL}/api/latest-episodes?page=1&limit=20`);
      const time1 = Date.now() - start1;
      
      console.log('📥 First request (from file):', time1, 'ms');
      console.log('   Episodes:', firstResponse.data.data.episodes.length);
      console.log('   From Cache:', firstResponse.data.data.summary.fromCache);
      
      // Wait a bit
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Second request (should be from cache)
      const start2 = Date.now();
      const secondResponse = await axios.get(`${BASE_URL}/api/latest-episodes?page=1&limit=20`);
      const time2 = Date.now() - start2;
      
      console.log('📤 Second request (from cache):', time2, 'ms');
      console.log('   Episodes:', secondResponse.data.data.episodes.length);
      console.log('   From Cache:', secondResponse.data.data.summary.fromCache);
      
      // Calculate improvement
      if (time1 > 0 && time2 > 0) {
        const improvement = ((time1 - time2) / time1 * 100).toFixed(1);
        console.log(`\n📊 Performance Improvement: ${improvement}% faster with cache`);
        
        if (time2 < 100) {
          console.log('✅ Cache is working well! Response time < 100ms');
        } else if (time2 < 500) {
          console.log('⚠️  Cache is working, but could be faster');
        } else {
          console.log('❌ Cache might not be working properly');
        }
      }
      
    } catch (error) {
      console.log('❌ Cache performance test failed:', error.response?.status || error.message);
    }
    
    // 6. Summary
    console.log('\n🎯 Test Summary:');
    console.log('================');
    console.log('✅ Basic endpoints working');
    
    if (debugResponse) {
      console.log('✅ Debug endpoint accessible');
    } else {
      console.log('⚠️  Debug endpoint needs deployment');
    }
    
    if (forceRefreshResponse) {
      console.log('✅ Force refresh working');
    } else {
      console.log('❌ Force refresh failed');
    }
    
    if (latestEpisodesResponse && latestEpisodesResponse.data.data.episodes.length > 0) {
      console.log('✅ API returning data');
      console.log('✅ Data loading issue resolved');
    } else {
      console.log('❌ API still returning empty data');
      console.log('❌ Data loading issue persists');
    }
    
    console.log('\n📋 Next Steps:');
    if (debugResponse && forceRefreshResponse && latestEpisodesResponse.data.data.episodes.length > 0) {
      console.log('1. ✅ All tests passed - issue resolved!');
      console.log('2. Monitor performance and cache effectiveness');
      console.log('3. Check logs for any remaining issues');
    } else {
      console.log('1. Deploy updated server.js with debug endpoints');
      console.log('2. Use /api/debug-files to check file status');
      console.log('3. Use /api/force-refresh to reload data');
      console.log('4. Verify file paths and data existence');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
  }
}

// Run tests
if (require.main === module) {
  testProductionFix().catch(console.error);
}

module.exports = { testProductionFix };
