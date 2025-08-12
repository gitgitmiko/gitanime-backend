const scraper = require('./scraper');

async function testScrapeAllPages() {
  console.log('🧪 Testing comprehensive scraping of all pages...');
  console.log('================================================');
  
  try {
    // Test scraping all pages
    const result = await scraper.scrapeAllPages();
    
    console.log('\n📊 Final Results:');
    console.log('==================');
    console.log(`📚 Total Anime: ${result.totalAnime}`);
    console.log(`🎬 Total Episodes: ${result.totalEpisodes}`);
    console.log(`📁 Data saved to:`);
    console.log(`   - Anime list: ./data/anime-list.json`);
    console.log(`   - Latest episodes: ./data/latest-episodes.json`);
    
    // Show sample data
    if (result.anime.length > 0) {
      console.log('\n📚 Sample Anime:');
      console.log('================');
      result.anime.slice(0, 3).forEach((anime, index) => {
        console.log(`${index + 1}. ${anime.title}`);
        console.log(`   Rating: ${anime.rating || 'N/A'}`);
        console.log(`   Status: ${anime.status || 'N/A'}`);
        console.log(`   Genres: ${anime.genres.join(', ') || 'N/A'}`);
        console.log('');
      });
    }
    
    if (result.episodes.length > 0) {
      console.log('\n🎬 Sample Episodes:');
      console.log('==================');
      result.episodes.slice(0, 3).forEach((episode, index) => {
        console.log(`${index + 1}. ${episode.title} Episode ${episode.episodeNumber}`);
        console.log(`   Posted by: ${episode.postedBy || 'N/A'}`);
        console.log(`   Released: ${episode.releasedOn || 'N/A'}`);
        console.log(`   Page: ${episode.pageNumber || 'N/A'}`);
        console.log('');
      });
    }
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testScrapeAllPages();
