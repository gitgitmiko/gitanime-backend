const scraper = require('./scraper');
const fs = require('fs-extra');

async function testAnimeListScraping() {
  try {
    console.log('Testing anime list scraping...');
    console.log('Environment variables:');
    console.log('ANIME_LIST_FILE:', process.env.ANIME_LIST_FILE);
    console.log('NODE_ENV:', process.env.NODE_ENV);
    
    // Test the scraping function
    console.log('\nStarting scrape...');
    const animeList = await scraper.scrapeAnimeList();
    
    console.log('\nScraping completed!');
    console.log('Total anime found:', animeList.length);
    
    if (animeList.length > 0) {
      console.log('\nFirst anime sample:');
      console.log(JSON.stringify(animeList[0], null, 2));
    }
    
    // Test saving
    console.log('\nTesting save function...');
    const savedData = await scraper.saveAnimeList(animeList);
    console.log('Save completed:', savedData);
    
    // Check if file exists
    const animeListFile = process.env.ANIME_LIST_FILE || './data/anime-list.json';
    const fileExists = await fs.pathExists(animeListFile);
    console.log('\nFile exists:', fileExists);
    console.log('File path:', animeListFile);
    
    if (fileExists) {
      const fileContent = await fs.readJson(animeListFile);
      console.log('\nFile content summary:');
      console.log('Total anime in file:', fileContent.totalAnime);
      console.log('Last updated:', fileContent.lastUpdated);
    }
    
  } catch (error) {
    console.error('Error during test:', error);
  }
}

testAnimeListScraping();
