const scraper = require('./scraper');

async function main() {
  console.log('🚀 Starting unlimited scraping (no page limit)...');
  console.log('This will scrape ALL available pages from Samehadaku');
  console.log('===================================================');
  
  try {
    // Scrape latest episodes without page limit
    console.log('\n🎬 Phase 1: Scraping all latest episodes pages...');
    const allEpisodes = await scraper.scrapeLatestEpisodesBatch(1);
    
    console.log('\n📚 Phase 2: Scraping all anime list pages...');
    const allAnime = await scraper.scrapeAnimeListBatch(1);
    
    // Save results
    console.log('\n💾 Phase 3: Saving all data...');
    await scraper.saveLatestEpisodes(allEpisodes);
    await scraper.saveAnimeList(allAnime);
    
    console.log('\n🎉 Unlimited scraping completed!');
    console.log(`🎬 Total episodes: ${allEpisodes.length}`);
    console.log(`📚 Total anime: ${allAnime.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

main();
