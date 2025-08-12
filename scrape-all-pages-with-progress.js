const scraper = require('./scraper');

async function scrapeAllPagesWithProgress() {
  console.log('🚀 Starting comprehensive scraping with progress monitoring...');
  console.log('============================================================');
  
  const startTime = Date.now();
  
  try {
    // Phase 1: Scrape all anime list pages
    console.log('\n📚 Phase 1: Scraping all anime list pages...');
    console.log('Starting from page 1, will continue until no more pages found...');
    
    const animeStartTime = Date.now();
    const allAnime = await scraper.scrapeAnimeList();
    const animeEndTime = Date.now();
    const animeDuration = (animeEndTime - animeStartTime) / 1000;
    
    console.log(`✅ Phase 1 completed in ${animeDuration.toFixed(2)} seconds`);
    console.log(`📚 Total anime found: ${allAnime.length}`);
    
    // Phase 2: Scrape all latest episodes pages
    console.log('\n🎬 Phase 2: Scraping all latest episodes pages...');
    console.log('Starting from page 1, will continue until no more pages found...');
    
    const episodesStartTime = Date.now();
    const allLatestEpisodes = await scraper.scrapeLatestEpisodesBatch();
    const episodesEndTime = Date.now();
    const episodesDuration = (episodesEndTime - episodesStartTime) / 1000;
    
    console.log(`✅ Phase 2 completed in ${episodesDuration.toFixed(2)} seconds`);
    console.log(`🎬 Total episodes found: ${allLatestEpisodes.length}`);
    
    // Phase 3: Save all data
    console.log('\n💾 Phase 3: Saving all data...');
    const saveStartTime = Date.now();
    
    await scraper.saveAnimeList(allAnime);
    await scraper.saveLatestEpisodes(allLatestEpisodes);
    
    const saveEndTime = Date.now();
    const saveDuration = (saveEndTime - saveStartTime) / 1000;
    
    console.log(`✅ Phase 3 completed in ${saveDuration.toFixed(2)} seconds`);
    
    // Final results
    const totalDuration = (Date.now() - startTime) / 1000;
    
    console.log('\n🎉 Comprehensive scraping completed!');
    console.log('=====================================');
    console.log(`⏱️  Total time: ${totalDuration.toFixed(2)} seconds`);
    console.log(`📚 Total anime: ${allAnime.length}`);
    console.log(`🎬 Total episodes: ${allLatestEpisodes.length}`);
    console.log(`📁 Data saved to:`);
    console.log(`   - Anime list: ./data/anime-list.json`);
    console.log(`   - Latest episodes: ./data/latest-episodes.json`);
    
    // Performance metrics
    console.log('\n📊 Performance Metrics:');
    console.log('========================');
    console.log(`📚 Anime scraping: ${animeDuration.toFixed(2)}s (${(allAnime.length / animeDuration).toFixed(2)} anime/sec)`);
    console.log(`🎬 Episodes scraping: ${episodesDuration.toFixed(2)}s (${(allLatestEpisodes.length / episodesDuration).toFixed(2)} episodes/sec)`);
    console.log(`💾 Data saving: ${saveDuration.toFixed(2)}s`);
    console.log(`🚀 Overall: ${(totalDuration / 60).toFixed(2)} minutes`);
    
    // Show some statistics
    if (allAnime.length > 0) {
      console.log('\n📈 Anime Statistics:');
      console.log('====================');
      
      // Count by status
      const statusCount = {};
      allAnime.forEach(anime => {
        const status = anime.status || 'Unknown';
        statusCount[status] = (statusCount[status] || 0) + 1;
      });
      
      Object.entries(statusCount).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} anime`);
      });
      
      // Count by type
      const typeCount = {};
      allAnime.forEach(anime => {
        const type = anime.type || 'Unknown';
        typeCount[type] = (typeCount[type] || 0) + 1;
      });
      
      console.log('\n   By Type:');
      Object.entries(typeCount).forEach(([type, count]) => {
        console.log(`     ${type}: ${count} anime`);
      });
    }
    
    if (allLatestEpisodes.length > 0) {
      console.log('\n📈 Episode Statistics:');
      console.log('=======================');
      
      // Count episodes by page
      const pageCount = {};
      allLatestEpisodes.forEach(episode => {
        const page = episode.pageNumber || 'Unknown';
        pageCount[page] = (pageCount[page] || 0) + 1;
      });
      
      console.log('   Episodes per page:');
      Object.entries(pageCount)
        .sort(([a], [b]) => parseInt(a) - parseInt(b))
        .forEach(([page, count]) => {
          console.log(`     Page ${page}: ${count} episodes`);
        });
    }
    
    console.log('\n✅ All done! Check the data files for complete results.');
    
    return {
      anime: allAnime,
      episodes: allLatestEpisodes,
      totalAnime: allAnime.length,
      totalEpisodes: allLatestEpisodes.length,
      duration: totalDuration,
      performance: {
        anime: animeDuration,
        episodes: episodesDuration,
        save: saveDuration
      }
    };
    
  } catch (error) {
    console.error('❌ Error during comprehensive scraping:', error);
    throw error;
  }
}

// Run the comprehensive scraping
scrapeAllPagesWithProgress().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
