const scraper = require('./scraper');

async function debugScraping() {
  console.log('🔍 Debug Scraping Process...\n');
  
  await scraper.initialize();
  
  console.log('📊 Current data in anime-data.json:');
  const fs = require('fs-extra');
  const dataPath = './anime-data.json';
  
  if (await fs.pathExists(dataPath)) {
    const currentData = await fs.readJson(dataPath);
    console.log(`Total latest episodes: ${currentData.latestEpisodes ? currentData.latestEpisodes.length : 0}`);
  
    if (currentData.latestEpisodes && currentData.latestEpisodes.length > 0) {
      console.log('\n📋 Sample of scraped anime:');
      currentData.latestEpisodes.slice(0, 5).forEach((anime, index) => {
        console.log(`\n${index + 1}. ${anime.title}`);
        console.log(`   Episode: ${anime.episodeNumber}`);
        console.log(`   Image: ${anime.image}`);
        console.log(`   Screenshot: ${anime.episodeScreenshot}`);
        console.log(`   Link: ${anime.link}`);
      });
    }
  } else {
    console.log('❌ No anime-data.json found');
  }
  
  console.log('\n🎯 Testing image mapping for specific titles:');
  const testTitles = [
    'Dandadan Season 2',
    'Dr. Stone Season 4 Part 2',
    'Tsuyokute New Saga',
    'Jidou Hanbaiki ni Umarekawatta Season 2'
  ];
  
  for (const title of testTitles) {
    const image = scraper.getAnimeImageSync(title);
    console.log(`\n"${title}" -> ${image}`);
  }
  
  console.log('\n✅ Debug complete!');
}

debugScraping().catch(console.error);
