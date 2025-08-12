const scraper = require('./scraper');

async function testUnlimitedScraping() {
  console.log('🧪 Testing unlimited scraping (no page limit)...');
  console.log('===============================================');
  
  try {
    // Test scraping latest episodes without page limit
    console.log('\n🎬 Testing latest episodes scraping (unlimited pages)...');
    const allEpisodes = await scraper.scrapeLatestEpisodesBatch(1);
    
    console.log('\n📊 Latest Episodes Results:');
    console.log('============================');
    console.log(`Total episodes found: ${allEpisodes.length}`);
    
    if (allEpisodes.length > 0) {
      console.log('\n📝 Sample episodes:');
      allEpisodes.slice(0, 5).forEach((episode, index) => {
        console.log(`${index + 1}. ${episode.title} Episode ${episode.episodeNumber}`);
        console.log(`   Page: ${episode.pageNumber}`);
        console.log(`   Posted by: ${episode.postedBy || 'N/A'}`);
        console.log('');
      });
    }
    
    // Test scraping anime list without page limit
    console.log('\n📚 Testing anime list scraping (unlimited pages)...');
    const allAnime = await scraper.scrapeAnimeListBatch(1);
    
    console.log('\n📊 Anime List Results:');
    console.log('=======================');
    console.log(`Total anime found: ${allAnime.length}`);
    
    if (allAnime.length > 0) {
      console.log('\n📝 Sample anime:');
      allAnime.slice(0, 5).forEach((anime, index) => {
        console.log(`${index + 1}. ${anime.title}`);
        console.log(`   Page: ${anime.pageNumber}`);
        console.log(`   Rating: ${anime.rating || 'N/A'}`);
        console.log(`   Status: ${anime.status || 'N/A'}`);
        console.log('');
      });
    }
    
    console.log('\n✅ Unlimited scraping test completed successfully!');
    console.log(`🎬 Total episodes: ${allEpisodes.length}`);
    console.log(`📚 Total anime: ${allAnime.length}`);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testUnlimitedScraping();
