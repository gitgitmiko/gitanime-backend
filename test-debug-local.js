const fs = require('fs-extra');
const path = require('path');

// Test script untuk debug masalah file path dan data
async function debugLocalFiles() {
  console.log('🔍 Debug Local Files - GitAnime Backend\n');
  
  // Environment check
  const isProduction = process.env.NODE_ENV === 'production';
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Is Production: ${isProduction}\n`);
  
  // File paths
  const filePaths = {
    DATA_FILE: isProduction ? '/tmp/anime-data.json' : './data/anime-data.json',
    CONFIG_FILE: isProduction ? '/tmp/config.json' : './data/config.json',
    ANIME_LIST_FILE: isProduction ? '/tmp/anime-list.json' : './data/anime-list.json',
    LATEST_EPISODES_FILE: isProduction ? '/tmp/latest-episodes.json' : './data/latest-episodes.json'
  };
  
  console.log('📁 File Paths:');
  for (const [key, path] of Object.entries(filePaths)) {
    console.log(`   ${key}: ${path}`);
  }
  console.log('');
  
  // Check files
  console.log('📋 File Status:');
  for (const [key, filePath] of Object.entries(filePaths)) {
    try {
      const exists = await fs.pathExists(filePath);
      console.log(`   ${key}: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
      
      if (exists) {
        const stats = await fs.stat(filePath);
        const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
        console.log(`      Size: ${sizeInMB} MB`);
        console.log(`      Modified: ${stats.mtime}`);
        
        // Try to read file content
        try {
          const content = await fs.readFile(filePath, 'utf8');
          const data = JSON.parse(content);
          
          if (key === 'LATEST_EPISODES_FILE') {
            console.log(`      Episodes: ${data.latestEpisodes?.length || 0}`);
            console.log(`      Total Episodes: ${data.totalEpisodes || 0}`);
          } else if (key === 'ANIME_LIST_FILE') {
            console.log(`      Anime: ${data.animeList?.length || 0}`);
            console.log(`      Total Anime: ${data.totalAnime || 0}`);
          } else if (key === 'DATA_FILE') {
            console.log(`      Anime: ${data.anime?.length || 0}`);
            console.log(`      Episodes: ${data.episodes?.length || 0}`);
          }
          
          console.log(`      Last Updated: ${data.lastUpdated || 'N/A'}`);
        } catch (parseError) {
          console.log(`      ❌ Parse Error: ${parseError.message}`);
        }
      }
      console.log('');
    } catch (error) {
      console.log(`   ${key}: ❌ ERROR - ${error.message}`);
      console.log('');
    }
  }
  
  // Check local data folder
  console.log('📂 Local Data Folder:');
  try {
    const localDataPath = './data';
    const exists = await fs.pathExists(localDataPath);
    console.log(`   Local data folder: ${exists ? '✅ EXISTS' : '❌ NOT FOUND'}`);
    
    if (exists) {
      const files = await fs.readdir(localDataPath);
      console.log(`   Files in local data folder:`);
      for (const file of files) {
        const filePath = path.join(localDataPath, file);
        try {
          const stats = await fs.stat(filePath);
          const sizeInMB = (stats.size / 1024 / 1024).toFixed(2);
          console.log(`      ${file}: ${sizeInMB} MB (${stats.mtime})`);
        } catch (error) {
          console.log(`      ${file}: ERROR - ${error.message}`);
        }
      }
    }
  } catch (error) {
    console.log(`   ❌ Error checking local data folder: ${error.message}`);
  }
  console.log('');
  
  // Environment variables
  console.log('🔧 Environment Variables:');
  const envVars = [
    'NODE_ENV',
    'DATA_FILE',
    'CONFIG_FILE',
    'ANIME_LIST_FILE',
    'LATEST_EPISODES_FILE'
  ];
  
  for (const envVar of envVars) {
    const value = process.env[envVar];
    console.log(`   ${envVar}: ${value || 'NOT SET'}`);
  }
  console.log('');
  
  // Recommendations
  console.log('💡 Recommendations:');
  if (isProduction) {
    console.log('   🚨 Production environment detected!');
    console.log('   - Check if files exist in /tmp/ folder');
    console.log('   - Verify scraper saved data to correct paths');
    console.log('   - Check Render.com logs for file operations');
  } else {
    console.log('   🏠 Development environment detected!');
    console.log('   - Check if files exist in ./data/ folder');
    console.log('   - Verify scraper saved data to correct paths');
    console.log('   - Check if data files have content');
  }
  
  console.log('\n   🔄 Next steps:');
  console.log('   1. Deploy updated server.js with debug endpoints');
  console.log('   2. Use /api/debug-files to check production status');
  console.log('   3. Use /api/force-refresh to reload data');
  console.log('   4. Check if cache is working properly');
}

// Run debug
if (require.main === module) {
  debugLocalFiles().catch(console.error);
}

module.exports = { debugLocalFiles };
