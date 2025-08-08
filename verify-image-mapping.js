const fs = require('fs-extra');
const path = require('path');

async function verifyImageMapping() {
  console.log('🔍 Verifying Image Mapping...\n');
  
  try {
    const dataPath = path.join(__dirname, 'data', 'anime-data.json');
    const data = await fs.readJson(dataPath);
    
    console.log(`📊 Total anime: ${data.latestEpisodes.length}\n`);
    
    // Check for unique images
    const imageMap = new Map();
    const duplicateImages = [];
    const missingImages = [];
    
    data.latestEpisodes.forEach(anime => {
      if (!anime.image) {
        missingImages.push(anime.title);
      } else if (imageMap.has(anime.image)) {
        duplicateImages.push({
          title: anime.title,
          duplicateWith: imageMap.get(anime.image),
          image: anime.image
        });
      } else {
        imageMap.set(anime.image, anime.title);
      }
    });
    
    // Display results
    console.log('🎯 Image Mapping Results:');
    console.log('========================\n');
    
    data.latestEpisodes.forEach((anime, index) => {
      console.log(`${index + 1}. ${anime.title}`);
      console.log(`   Episode: ${anime.episodeNumber}`);
      console.log(`   Image: ${anime.image ? '✅' : '❌'} ${anime.image || 'Missing'}`);
      console.log(`   Screenshot: ${anime.episodeScreenshot ? '✅' : '❌'} ${anime.episodeScreenshot || 'Missing'}`);
      console.log('');
    });
    
    // Check for issues
    if (missingImages.length > 0) {
      console.log('❌ Missing Images:');
      missingImages.forEach(title => {
        console.log(`   - ${title}`);
      });
      console.log('');
    }
    
    if (duplicateImages.length > 0) {
      console.log('⚠️  Duplicate Images:');
      duplicateImages.forEach(item => {
        console.log(`   - ${item.title} (same as ${item.duplicateWith})`);
        console.log(`     Image: ${item.image}`);
      });
      console.log('');
    }
    
    if (missingImages.length === 0 && duplicateImages.length === 0) {
      console.log('✅ All anime have unique and correct images!');
    }
    
    // Verify specific anime mentioned by user
    console.log('\n🎯 Specific Anime Verification:');
    console.log('==============================');
    
    const specificAnime = [
      'Dandadan Season 2',
      'Tsuyokute New Saga', 
      'Jidou Hanbaiki ni Umarekawatta Season 2',
      'Dr. Stone Season 4 Part 2'
    ];
    
    specificAnime.forEach(title => {
      const anime = data.latestEpisodes.find(a => a.title === title);
      if (anime) {
        console.log(`\n${title}:`);
        console.log(`   Image: ${anime.image}`);
        console.log(`   Screenshot: ${anime.episodeScreenshot}`);
        console.log(`   Match: ${anime.image === anime.episodeScreenshot ? '✅' : '❌'}`);
      } else {
        console.log(`\n${title}: ❌ Not found in data`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error verifying image mapping:', error.message);
  }
}

verifyImageMapping();
