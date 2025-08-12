const scraper = require('./scraper');

async function main() {
  console.log('🚀 Starting comprehensive scraping of ALL pages...');
  
  try {
    const result = await scraper.scrapeAllPages();
    
    console.log('\n🎉 Completed!');
    console.log(`📚 Total anime: ${result.totalAnime}`);
    console.log(`🎬 Total episodes: ${result.totalEpisodes}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
