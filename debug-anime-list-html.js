const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');

async function debugAnimeListHTML() {
  try {
    console.log('Fetching anime list page HTML...');
    
    const url = 'https://v1.samehadaku.how/daftar-anime-2/';
    
    const response = await axios.get(url, {
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    const $ = cheerio.load(response.data);
    
    console.log('Page title:', $('title').text());
    
    // Save the full HTML for inspection
    await fs.writeFile('./debug-anime-list.html', response.data);
    console.log('Full HTML saved to debug-anime-list.html');
    
    // Check for different possible selectors
    const selectors = [
      '.anime-list .anime-item',
      '.daftar-anime .anime-item', 
      '.anime-grid .anime-item',
      '.anime-item',
      '.anime-list',
      '.daftar-anime',
      '.anime-grid',
      '.post',
      '.entry',
      '.item',
      'article',
      '.anime',
      '.list-anime',
      '.anime-list-item'
    ];
    
    console.log('\nChecking different selectors:');
    selectors.forEach(selector => {
      const elements = $(selector);
      console.log(`${selector}: ${elements.length} elements found`);
      
      if (elements.length > 0) {
        console.log(`  First element HTML: ${$(elements[0]).html().substring(0, 200)}...`);
      }
    });
    
    // Look for any elements that might contain anime information
    console.log('\nLooking for potential anime containers...');
    const allDivs = $('div');
    console.log(`Total divs on page: ${allDivs.length}`);
    
    // Look for elements with anime-related classes or IDs
    const animeRelated = $('[class*="anime"], [id*="anime"], [class*="list"], [class*="item"]');
    console.log(`Elements with anime/list/item in class/id: ${animeRelated.length}`);
    
    if (animeRelated.length > 0) {
      console.log('\nFirst few anime-related elements:');
      animeRelated.slice(0, 5).each((i, element) => {
        const $el = $(element);
        console.log(`  ${i + 1}. Class: "${$el.attr('class')}", ID: "${$el.attr('id')}"`);
        console.log(`     HTML: ${$el.html().substring(0, 150)}...`);
      });
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugAnimeListHTML();
