const scraper = require('./scraper');
const axios = require('axios');
const cheerio = require('cheerio');

async function testVideoScraping() {
  console.log('Testing video scraping...');
  
  try {
    const episodeUrl = 'https://v1.samehadaku.how/dandadan-season-2-episode-6/';
    console.log(`Scraping video from: ${episodeUrl}`);
    
    // Now try the original scraping method
    console.log('\n🔍 Trying enhanced scraping method...');
    const videoData = await scraper.scrapeEpisodeVideo(episodeUrl);
    
    if (videoData) {
      console.log('\n✅ Video scraping successful!');
      console.log('Video URL:', videoData.url);
      console.log('Video Type:', videoData.type);
      console.log('Episode URL:', videoData.episodeUrl);
      
      if (videoData.playerOptions && videoData.playerOptions.length > 0) {
        console.log('\n🎬 Player Options Found:');
        videoData.playerOptions.forEach((option, index) => {
          console.log(`  ${index + 1}. ${option.text} (${option.id})`);
          if (option.videoUrl) {
            console.log(`     Video URL: ${option.videoUrl}`);
          }
        });
      }
      
      // Test if the video URL is accessible
      if (videoData.url) {
        console.log('\n🔍 Testing video URL accessibility...');
        try {
          const response = await axios.head(videoData.url, {
            timeout: 10000,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
          });
          console.log('✅ Video URL is accessible!');
          console.log('Content-Type:', response.headers['content-type']);
          console.log('Content-Length:', response.headers['content-length']);
        } catch (error) {
          console.log('⚠️ Video URL might not be directly accessible:', error.message);
        }
      }
    } else {
      console.log('❌ No video found');
    }
  } catch (error) {
    console.error('❌ Error during video scraping:', error.message);
  }
}

testVideoScraping();
