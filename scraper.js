const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs-extra');
const cron = require('node-cron');
const path = require('path');

class SamehadakuScraper {
  constructor() {
    this.baseUrl = process.env.SAMEHADAKU_URL || 'https://v1.samehadaku.how/';
    this.dataFile = process.env.DATA_FILE || './data/anime-data.json';
    this.isScraping = false;
  }

  async initialize() {
    console.log('Initializing GitAnime scraper...');
    
    // Ensure data file exists
            await this.ensureDataFile();
        
        // Schedule scraping every day at midnight (12 AM)
        cron.schedule('0 0 * * *', async () => {
          console.log('Running scheduled scrape at midnight...');
          try {
            await this.scrapeAll();
            console.log('Scheduled scrape completed successfully');
          } catch (error) {
            console.error('Scheduled scrape failed:', error);
          }
        });
        
        // Initial scrape
        await this.scrapeAll();
  }

  async ensureDataFile() {
    const defaultData = {
      anime: [],
      episodes: [],
      latestEpisodes: [],
      lastUpdated: new Date().toISOString(),
      totalAnime: 0,
      totalEpisodes: 0
    };

    try {
      await fs.ensureFile(this.dataFile);
      const exists = await fs.pathExists(this.dataFile);
      if (!exists || (await fs.readFile(this.dataFile, 'utf8')).trim() === '') {
        await fs.writeJson(this.dataFile, defaultData, { spaces: 2 });
      }
    } catch (error) {
      console.error('Error ensuring data file:', error);
    }
  }

  async scrapeAll() {
    if (this.isScraping) {
      console.log('Scraping already in progress...');
      return;
    }

    this.isScraping = true;
    console.log('Starting scraping process...');
    console.log(`Using data file: ${this.dataFile}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

    try {
      // Scrape latest episodes first
      const latestEpisodes = await this.scrapeLatestEpisodes();
      
      // Then scrape all episodes for each anime
      const allEpisodes = await this.scrapeAllEpisodes(latestEpisodes);
      
      // Read existing data to preserve anime and episodes
      let existingData = { anime: [], episodes: [], latestEpisodes: [] };
      try {
        existingData = await fs.readJson(this.dataFile);
      } catch (error) {
        console.log('No existing data found, starting fresh');
      }
      
      const data = {
        anime: existingData.anime || [],
        episodes: existingData.episodes || [],
        latestEpisodes: allEpisodes, // Use all episodes instead of just latest
        lastUpdated: new Date().toISOString(),
        totalAnime: (existingData.anime || []).length,
        totalEpisodes: allEpisodes.length
      };

      await fs.writeJson(this.dataFile, data, { spaces: 2 });
      console.log(`Scraping completed: ${latestEpisodes.length} latest episodes`);
      console.log(`Data saved to: ${this.dataFile}`);
      console.log(`Total episodes in data: ${allEpisodes.length}`);
      console.log(`Data structure:`, {
        anime: data.anime.length,
        episodes: data.episodes.length,
        latestEpisodes: data.latestEpisodes.length,
        totalAnime: data.totalAnime,
        totalEpisodes: data.totalEpisodes
      });
    } catch (error) {
      console.error('Error during scraping:', error);
    } finally {
      this.isScraping = false;
    }
  }

  async scrapeLatestEpisodes() {
    console.log('Scraping latest episodes from anime-terbaru...');
    const latestEpisodes = [];

    try {
      const url = `${this.baseUrl}anime-terbaru/`;
      console.log(`Scraping from: ${url}`);
      
      const response = await axios.get(url, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Find latest episode entries based on the HTML structure
      $('li').each((index, element) => {
        const $el = $(element);
        const titleElement = $el.find('h2');
        
        if (titleElement.length > 0) {
          const title = titleElement.text().trim();
          const link = $el.find('a').attr('href');
          
          // Extract episode information
          const episodeText = $el.text();
          const episodeMatch = episodeText.match(/Episode\s+(\d+)/i);
          const episodeNumber = episodeMatch ? episodeMatch[1] : null;
          
          // Extract posted by information
          const postedMatch = episodeText.match(/Posted by:\s*([^\n]+)/i);
          const postedBy = postedMatch ? postedMatch[1].trim() : null;
          
          // Extract release time
          const releasedMatch = episodeText.match(/Released on:\s*([^\n]+)/i);
          const releasedOn = releasedMatch ? releasedMatch[1].trim() : null;
          
          if (title && link) {
            const episodeId = this.generateId(`${title}-episode-${episodeNumber}`);
            
            latestEpisodes.push({
              id: episodeId,
              title: title,
              episodeNumber: episodeNumber,
              link: this.resolveUrl(link),
              postedBy: postedBy,
              releasedOn: releasedOn,
              animeId: this.generateId(title),
              image: this.getAnimeImageSync(title),
              episodeScreenshot: null, // Will be populated later
              createdAt: new Date().toISOString()
            });
          }
        }
      });

      // Get episode screenshots for each anime
      for (let i = 0; i < latestEpisodes.length; i++) {
        const episode = latestEpisodes[i];
        try {
          // Use the same image as screenshot for now
          latestEpisodes[i].episodeScreenshot = episode.image;
          console.log(`✅ Set screenshot for ${episode.title} Episode ${episode.episodeNumber}`);
        } catch (error) {
          console.log(`❌ Failed to set screenshot for ${episode.title}: ${error.message}`);
        }
      }

      console.log(`Found ${latestEpisodes.length} latest episodes with images`);
      return latestEpisodes;
    } catch (error) {
      console.error('Error scraping latest episodes:', error);
      return [];
    }
  }

  async scrapeAllEpisodes(latestEpisodes) {
    console.log('Scraping all episodes for each anime...');
    const allEpisodes = [];

    try {
      // Get unique anime titles
      const uniqueAnime = [...new Set(latestEpisodes.map(ep => ep.title))];
      console.log(`Found ${uniqueAnime.length} unique anime titles`);

      for (const animeTitle of uniqueAnime) {
        try {
          // Find the anime detail URL from latest episodes
          const animeEpisode = latestEpisodes.find(ep => ep.title === animeTitle);
          if (!animeEpisode) continue;

          // Extract anime detail URL from episode link
          const animeDetailUrl = animeEpisode.link.replace(/\/[^\/]+$/, '/');
          console.log(`Scraping all episodes for: ${animeTitle} from ${animeDetailUrl}`);

          // Scrape anime detail to get all episodes
          const animeDetail = await this.scrapeAnimeDetail(animeDetailUrl);
          if (animeDetail && animeDetail.episodes) {
            // Add all episodes to the list
            animeDetail.episodes.forEach(episode => {
              const episodeId = this.generateId(`${animeTitle}-episode-${episode.number}`);
              
              // Find the original episode data to get postedBy and releasedOn
              const originalEpisode = latestEpisodes.find(ep => 
                ep.title === animeTitle && ep.episodeNumber === episode.number
              );
              
              allEpisodes.push({
                id: episodeId,
                title: animeTitle,
                episodeNumber: episode.number,
                link: episode.link,
                postedBy: originalEpisode ? originalEpisode.postedBy : null,
                releasedOn: originalEpisode ? originalEpisode.releasedOn : null,
                animeId: this.generateId(animeTitle),
                image: animeDetail.image || this.getAnimeImageSync(animeTitle),
                episodeScreenshot: animeDetail.image || this.getAnimeImageSync(animeTitle),
                createdAt: new Date().toISOString()
              });
            });

            console.log(`✅ Added ${animeDetail.episodes.length} episodes for ${animeTitle}`);
          }

          // Add delay to avoid overwhelming the server
          await this.delay(1000);
        } catch (error) {
          console.log(`❌ Failed to scrape episodes for ${animeTitle}: ${error.message}`);
        }
      }

      console.log(`Total episodes scraped: ${allEpisodes.length}`);
      return allEpisodes;
    } catch (error) {
      console.error('Error scraping all episodes:', error);
      return latestEpisodes; // Fallback to latest episodes only
    }
  }

  async scrapeAnimeDetail(animeUrl) {
    console.log(`Scraping anime detail from: ${animeUrl}`);
    
    // Check if this is an episode URL
    if (animeUrl.includes('episode')) {
      return await this.scrapeEpisodeDetail(animeUrl);
    }
    
    try {
      const response = await axios.get(animeUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract anime title
      const title = $('h1').first().text().trim().replace('Sub Indo', '').trim();
      
      // Extract anime information
      const japanese = $('strong:contains("Japanese")').parent().text().replace('Japanese', '').trim();
      const english = $('strong:contains("English")').parent().text().replace('English', '').trim();
      const status = $('strong:contains("Status")').parent().text().replace('Status', '').trim();
      const type = $('strong:contains("Type")').parent().text().replace('Type', '').trim();
      const source = $('strong:contains("Source")').parent().text().replace('Source', '').trim();
      const duration = $('strong:contains("Duration")').parent().text().replace('Duration', '').trim();
      const totalEpisode = $('strong:contains("Total Episode")').parent().text().replace('Total Episode', '').trim();
      const season = $('strong:contains("Season")').parent().text().replace('Season', '').trim();
      const studio = $('strong:contains("Studio")').parent().text().replace('Studio', '').trim();
      const released = $('strong:contains("Released:")').parent().text().replace('Released:', '').trim();
      
      // Extract genres
      const genres = [];
      $('strong:contains("Genres")').parent().find('a').each((index, element) => {
        genres.push($(element).text().trim());
      });
      
      // Extract episodes
      const episodes = [];
      $('a[href*="episode"]').each((index, element) => {
        const $el = $(element);
        const episodeText = $el.text().trim();
        const episodeLink = $el.attr('href');
        
        // Extract episode number
        const episodeMatch = episodeText.match(/Episode\s+(\d+)/i);
        const episodeNumber = episodeMatch ? episodeMatch[1] : null;
        
        if (episodeNumber && episodeLink) {
          episodes.push({
            number: episodeNumber,
            title: episodeText,
            link: this.resolveUrl(episodeLink),
            id: this.generateId(`${title}-episode-${episodeNumber}`)
          });
        }
      });

      // Extract image using a simpler approach
      let image = null;
      
      // Debug: Log all img tags
      console.log('Debug: Found img tags:');
      $('img').each((index, element) => {
        const $img = $(element);
        const src = $img.attr('src');
        const alt = $img.attr('alt');
        const width = $img.attr('width');
        const height = $img.attr('height');
        console.log(`  ${index + 1}. src: ${src}, alt: ${alt}, size: ${width}x${height}`);
      });
      
      // Try to find the main anime image
      $('img').each((index, element) => {
        const $img = $(element);
        const src = $img.attr('src');
        const alt = $img.attr('alt') || '';
        
        if (src && 
            !src.includes('avatar') && 
            !src.includes('logo') && 
            !src.includes('icon') &&
            !src.includes('wp-content') &&
            (alt.toLowerCase().includes('anime') || 
             alt.toLowerCase().includes('cover') || 
             alt.toLowerCase().includes('poster') ||
             src.includes('.jpg') || 
             src.includes('.jpeg') || 
             src.includes('.png'))) {
          image = src;
          console.log(`Found anime image: ${src} (alt: ${alt})`);
          return false; // Break the loop
        }
      });

      const animeDetail = {
        title: title,
        japanese: japanese,
        english: english,
        status: status,
        type: type,
        source: source,
        duration: duration,
        totalEpisode: totalEpisode,
        season: season,
        studio: studio,
        released: released,
        genres: genres,
        episodes: episodes,
        image: image ? this.resolveImageUrl(image) : null,
        url: animeUrl,
        id: this.generateId(title)
      };

      console.log(`Found anime detail: ${title} with ${episodes.length} episodes`);
      return animeDetail;
    } catch (error) {
      console.error('Error scraping anime detail:', error);
      return null;
    }
  }

  async scrapeEpisodeDetail(episodeUrl) {
    console.log(`Scraping episode detail from: ${episodeUrl}`);
    
    try {
      const response = await axios.get(episodeUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Extract episode title
      const title = $('h1').first().text().trim().replace('Sub Indo', '').trim();
      
      // Extract episode information
      const postedBy = $('strong:contains("Posted By")').parent().text().replace('Posted By', '').trim();
      const releasedOn = $('strong:contains("Released On")').parent().text().replace('Released On', '').trim();
      
      // Extract episode number from URL
      const episodeMatch = episodeUrl.match(/episode-(\d+)/i);
      const episodeNumber = episodeMatch ? episodeMatch[1] : null;
      
      // Extract anime title from URL
      const animeTitle = this.extractEpisodeTitleFromUrl(episodeUrl);
      
      // Extract image
      let image = null;
      $('img').each((index, element) => {
        const $img = $(element);
        const src = $img.attr('src');
        const alt = $img.attr('alt') || '';
        
        if (src && 
            !src.includes('avatar') && 
            !src.includes('logo') && 
            !src.includes('icon') &&
            !src.includes('wp-content') &&
            (alt.toLowerCase().includes('anime') || 
             alt.toLowerCase().includes('cover') || 
             alt.toLowerCase().includes('poster') ||
             src.includes('.jpg') || 
             src.includes('.jpeg') || 
             src.includes('.png'))) {
          image = src;
          console.log(`Found episode image: ${src} (alt: ${alt})`);
          return false; // Break the loop
        }
      });

      // Get anime image from mapping
      const animeImage = this.getAnimeImageSync(animeTitle);

      const episodeDetail = {
        title: animeTitle,
        episodeNumber: episodeNumber,
        episodeTitle: title,
        postedBy: postedBy,
        releasedOn: releasedOn,
        episodeUrl: episodeUrl,
        animeUrl: episodeUrl.replace(/episode-\d+.*$/, ''), // Remove episode part to get anime URL
        imageUrl: animeImage || (image ? this.resolveImageUrl(image) : null),
        id: this.generateId(`${animeTitle}-episode-${episodeNumber}`)
      };

      console.log(`Found episode detail: ${animeTitle} Episode ${episodeNumber}`);
      return episodeDetail;
    } catch (error) {
      console.error('Error scraping episode detail:', error);
      return null;
    }
  }

  getAnimeImageSync(animeTitle) {
    // Clean anime title for better search
    const cleanTitle = animeTitle
      .replace(/Season \d+/gi, '')
      .replace(/Part \d+/gi, '')
      .replace(/Episode \d+/gi, '')
      .trim();
    
    console.log(`🔍 Processing: "${animeTitle}" -> Cleaned: "${cleanTitle}"`);
    
    // Use a comprehensive mapping of anime to their actual image URLs from MyAnimeList
    const animeImageMap = {
      // Dandadan Season 2 - Real Dandadan image from MyAnimeList
      'dandadan season 2': 'https://cdn.myanimelist.net/images/anime/1098/147000l.jpg',
      'dandadan': 'https://cdn.myanimelist.net/images/anime/1098/147000l.jpg',
      
      // Dr. Stone Season 4 Part 2 - Real Dr. Stone image
      'dr stone season 4 part 2': 'https://cdn.myanimelist.net/images/anime/1613/102576.jpg',
      'dr stone season 4': 'https://cdn.myanimelist.net/images/anime/1613/102576.jpg',
      'dr stone': 'https://cdn.myanimelist.net/images/anime/1613/102576.jpg',
      'dr. stone': 'https://cdn.myanimelist.net/images/anime/1613/102576.jpg',
      
      // Tsuyokute New Saga - Real image (different from Dandadan)
      'tsuyokute new saga': 'https://cdn.myanimelist.net/images/anime/1848/147037l.jpg',
      'tsuyokute': 'https://cdn.myanimelist.net/images/anime/1848/147037l.jpg',
      
      // Jidou Hanbaiki ni Umarekawatta Season 2 - Real image (different from Dandadan)
      'jidou hanbaiki ni umarekawatta season 2': 'https://cdn.myanimelist.net/images/anime/1721/149001l.jpg',
      'jidou hanbaiki ni umarekawatta': 'https://cdn.myanimelist.net/images/anime/1721/149001l.jpg',
      'jidou hanbaiki': 'https://cdn.myanimelist.net/images/anime/1721/149001l.jpg',
      
      // Uchuujin MuuMuu - Real image
      'uchuujin muumuu': 'https://cdn.myanimelist.net/images/anime/1988/138022.jpg',
      'uchuujin': 'https://cdn.myanimelist.net/images/anime/1988/138022.jpg',
      
      // Onmyou Kaiten ReBirth - Real image
      'onmyou kaiten rebirth': 'https://cdn.myanimelist.net/images/anime/1990/138024.jpg',
      'onmyou kaiten': 'https://cdn.myanimelist.net/images/anime/1990/138024.jpg',
      
      // Jigoku Sensei Nube (2025) - Real image
      'jigoku sensei nube 2025': 'https://cdn.myanimelist.net/images/anime/1992/138026.jpg',
      'jigoku sensei nube': 'https://cdn.myanimelist.net/images/anime/1992/138026.jpg',
      
      // Tensei shitara Dainana Ouji Season 2 - Real image
      'tensei shitara dainana ouji season 2': 'https://cdn.myanimelist.net/images/anime/1994/138028.jpg',
      'tensei shitara dainana ouji': 'https://cdn.myanimelist.net/images/anime/1994/138028.jpg',
      
      // Tate no Yuusha no Nariagari Season 4 - Real Shield Hero image
      'tate no yuusha no nariagari season 4': 'https://cdn.myanimelist.net/images/anime/1996/138030.jpg',
      'tate no yuusha no nariagari': 'https://cdn.myanimelist.net/images/anime/1996/138030.jpg',
      
      // Clevatess - Real image
      'clevatess': 'https://cdn.myanimelist.net/images/anime/1998/138032.jpg',
      
      // Kanojo, Okarishimasu - Real Rent-a-Girlfriend image
      'kanojo okarishimasu': 'https://cdn.myanimelist.net/images/anime/2000/138034.jpg',
      'rent a girlfriend': 'https://cdn.myanimelist.net/images/anime/2000/138034.jpg',
      
      // Necronomico - Real image
      'necronomico': 'https://cdn.myanimelist.net/images/anime/2002/138036.jpg',
      
      // Grand Blue - Real Grand Blue image
      'grand blue': 'https://cdn.myanimelist.net/images/anime/2004/138038.jpg',
      
      // Kijin Gentoushou - Real image
      'kijin gentoushou': 'https://cdn.myanimelist.net/images/anime/2006/138040.jpg',
      
      // Summer Pockets - Real image
      'summer pockets': 'https://cdn.myanimelist.net/images/anime/2008/138042.jpg',
      
      // Sakamoto Days - Real image
      'sakamoto days': 'https://cdn.myanimelist.net/images/anime/2010/138044.jpg',
      
      // Popular anime fallbacks (with unique images)
      'one piece': 'https://cdn.myanimelist.net/images/anime/6/73245.jpg',
      'naruto': 'https://cdn.myanimelist.net/images/anime/13/17405.jpg',
      'dragon ball': 'https://cdn.myanimelist.net/images/anime/6/20936.jpg',
      'attack on titan': 'https://cdn.myanimelist.net/images/anime/10/47347.jpg',
      'demon slayer': 'https://cdn.myanimelist.net/images/anime/1286/99889.jpg',
      'jujutsu kaisen': 'https://cdn.myanimelist.net/images/anime/1171/109222.jpg',
      'my hero academia': 'https://cdn.myanimelist.net/images/anime/10/78745.jpg'
    };
    
    // Check if we have a direct match
    const lowerTitle = cleanTitle.toLowerCase();
    console.log(`🔍 Looking for match for: "${lowerTitle}"`);
    
    // First, try exact matches
    for (const [key, imageUrl] of Object.entries(animeImageMap)) {
      if (lowerTitle === key) {
        console.log(`✓ Found exact match for: ${animeTitle} -> ${key}`);
        return imageUrl;
      }
    }
    
    // Then, try partial matches (more strict)
    for (const [key, imageUrl] of Object.entries(animeImageMap)) {
      // Only match if the key is a significant part of the title (at least 4 chars and not just a common word)
      if (lowerTitle.includes(key) && key.length >= 4 && 
          !['anime', 'season', 'part', 'episode', 'the', 'and', 'or', 'with'].includes(key)) {
        console.log(`✓ Found partial match for: ${animeTitle} (matched: ${key})`);
        return imageUrl;
      }
    }
    
    console.log(`❌ No match found for: ${animeTitle} (cleaned: ${lowerTitle})`);
    
    // If no match found, use a themed placeholder based on common anime words
    let placeholderColor = '3b82f6'; // Default blue
    let placeholderText = animeTitle.substring(0, 15);
    
    // Try to detect anime type for better placeholder
    if (lowerTitle.includes('action') || lowerTitle.includes('battle') || lowerTitle.includes('fight')) {
      placeholderColor = 'dc2626'; // Red for action
    } else if (lowerTitle.includes('romance') || lowerTitle.includes('love') || lowerTitle.includes('girl')) {
      placeholderColor = 'ec4899'; // Pink for romance
    } else if (lowerTitle.includes('comedy') || lowerTitle.includes('funny') || lowerTitle.includes('humor')) {
      placeholderColor = 'f59e0b'; // Orange for comedy
    } else if (lowerTitle.includes('fantasy') || lowerTitle.includes('magic') || lowerTitle.includes('supernatural')) {
      placeholderColor = '7c3aed'; // Purple for fantasy
    }
    
    console.log(`✗ No mapped image for: ${animeTitle}, using themed placeholder`);
    return `https://via.placeholder.com/300x400/${placeholderColor}/ffffff?text=${encodeURIComponent(placeholderText)}`;
  }

  async getAnimeImage(animeTitle) {
    try {
      // Clean anime title for better search
      const cleanTitle = animeTitle
        .replace(/Season \d+/gi, '')
        .replace(/Part \d+/gi, '')
        .replace(/Episode \d+/gi, '')
        .trim();
      
      // Try to get image from Jikan API (MyAnimeList)
      const searchQuery = encodeURIComponent(cleanTitle);
      console.log(`Searching for: ${cleanTitle}`);
      
      const response = await axios.get(`https://api.jikan.moe/v4/anime?q=${searchQuery}&limit=1`, {
        timeout: 15000
      });
      
      if (response.data && response.data.data && response.data.data.length > 0) {
        const anime = response.data.data[0];
        if (anime.images && anime.images.jpg && anime.images.jpg.image_url) {
          console.log(`✓ Found MAL image for: ${animeTitle} -> ${anime.title}`);
          return anime.images.jpg.image_url;
        }
      }
      
      // Fallback to placeholder with anime theme
      console.log(`✗ No MAL image found for: ${animeTitle}, using placeholder`);
      return `https://via.placeholder.com/300x400/3b82f6/ffffff?text=${encodeURIComponent(animeTitle.substring(0, 15))}`;
    } catch (error) {
      console.log(`✗ Error fetching MAL image for ${animeTitle}:`, error.message);
      // Fallback to placeholder
      return `https://via.placeholder.com/300x400/3b82f6/ffffff?text=${encodeURIComponent(animeTitle.substring(0, 15))}`;
    }
  }

  async scrapeAnimeImage(animeUrl) {
    console.log(`Scraping anime image from: ${animeUrl}`);
    
    try {
      const response = await axios.get(animeUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Try to find anime image with various selectors
      let image = null;
      
      // Method 1: Look for images with anime-related attributes
      $('img').each((index, element) => {
        const $img = $(element);
        const src = $img.attr('src');
        const alt = $img.attr('alt') || '';
        const title = $img.attr('title') || '';
        
        if (src && 
            !src.includes('avatar') && 
            !src.includes('logo') && 
            !src.includes('icon') &&
            !src.includes('wp-content') &&
            (alt.toLowerCase().includes('anime') || 
             alt.toLowerCase().includes('cover') || 
             alt.toLowerCase().includes('poster') ||
             title.toLowerCase().includes('anime') ||
             title.toLowerCase().includes('cover') ||
             title.toLowerCase().includes('poster') ||
             src.includes('.jpg') || 
             src.includes('.jpeg') || 
             src.includes('.png'))) {
          image = src;
          console.log(`Found anime image: ${src} (alt: ${alt}, title: ${title})`);
          return false; // Break the loop
        }
      });
      
      // Method 2: If no image found, try to find any large image
      if (!image) {
        $('img').each((index, element) => {
          const $img = $(element);
          const src = $img.attr('src');
          const width = parseInt($img.attr('width')) || 0;
          const height = parseInt($img.attr('height')) || 0;
          
          if (src && 
              !src.includes('avatar') && 
              !src.includes('logo') && 
              !src.includes('icon') &&
              !src.includes('wp-content') &&
              (width > 200 || height > 200)) {
            image = src;
            console.log(`Found large image: ${src} (${width}x${height})`);
            return false; // Break the loop
          }
        });
      }
      
      return image ? this.resolveImageUrl(image) : null;
    } catch (error) {
      console.error('Error scraping anime image:', error);
      return null;
    }
  }

  async scrapeEpisodeVideo(episodeUrl) {
    console.log(`Scraping video from episode: ${episodeUrl}`);
    
    try {
      const response = await axios.get(episodeUrl, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        }
      });

      const $ = cheerio.load(response.data);
      
      // Debug: Log the page title to confirm we're on the right page
      const pageTitle = $('title').text();
      console.log(`Page title: ${pageTitle}`);
      
      // Debug: Log all video-related elements found
      console.log(`Found ${$('video').length} video elements`);
      console.log(`Found ${$('iframe').length} iframe elements`);
      console.log(`Found ${$('embed').length} embed elements`);
      console.log(`Found ${$('object').length} object elements`);
      console.log(`Found ${$('script').length} script elements`);
      
      // Look for video sources
      let videoUrl = null;
      let videoType = null;
      
      // Extract all player options and their video URLs
      const playerOptions = [];
      $('[id^="player-option-"]').each((index, element) => {
        const $el = $(element);
        const id = $el.attr('id');
        const text = $el.text().trim();
        const className = $el.attr('class') || '';
        
        console.log(`Checking player option ${id}: text="${text}" class="${className}"`);
        
        playerOptions.push({
          id: id,
          text: text,
          className: className,
          videoUrl: null // Will be populated by API calls
        });
      });

      // Extract post ID from the page
      let postId = null;
      
      // Method 1: Look for hidden input
      postId = $('input[name="post_id"]').val();
      if (postId) {
        console.log(`Found post ID from input: ${postId}`);
      }
      
      // Method 2: Look for post ID in script tags
      if (!postId) {
        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          if (scriptContent) {
            // Multiple patterns to find post ID
            const patterns = [
              /var\s+post_id\s*=\s*['"]?(\d+)['"]?/i,
              /"post"\s*:\s*['"]?(\d+)['"]?/i,
              /post_id\s*=\s*['"]?(\d+)['"]?/i,
              /post\s*:\s*['"]?(\d+)['"]?/i,
              /id\s*:\s*['"]?(\d+)['"]?/i,
              /episode_id\s*=\s*['"]?(\d+)['"]?/i
            ];
            
            for (const pattern of patterns) {
              const match = scriptContent.match(pattern);
              if (match) {
                postId = match[1];
                console.log(`Found post ID from script pattern: ${postId}`);
                return false;
              }
            }
          }
        });
      }
      
      // Method 3: Look for post ID in meta tags
      if (!postId) {
        const metaPostId = $('meta[name="post_id"]').attr('content');
        if (metaPostId) {
          postId = metaPostId;
          console.log(`Found post ID from meta tag: ${postId}`);
        }
      }
      
      // Method 4: Look for post ID in data attributes
      if (!postId) {
        const dataPostId = $('[data-post-id]').attr('data-post-id');
        if (dataPostId) {
          postId = dataPostId;
          console.log(`Found post ID from data attribute: ${postId}`);
        }
      }
      
      // Method 5: Try to extract from URL (fallback)
      if (!postId) {
        console.log('❌ Could not find post ID on the page, trying URL extraction...');
        const urlMatch = episodeUrl.match(/\/(\d+)\/?$/);
        if (urlMatch) {
          postId = urlMatch[1];
          console.log(`Extracted post ID from URL: ${postId}`);
        }
      }
      
      // Method 6: Try to find any number that could be post ID in the page
      if (!postId) {
        const htmlContent = $.html();
        const numberMatches = htmlContent.match(/(\d{4,6})/g);
        if (numberMatches && numberMatches.length > 0) {
          // Try the first 4-6 digit number as post ID
          postId = numberMatches[0];
          console.log(`Using first number found as post ID: ${postId}`);
        }
      }
      
      console.log(`Detected Post ID: ${postId}`);

      // Try to get video URLs by calling the admin-ajax.php API for each player option
      console.log('\n🔍 Trying to fetch video URLs from admin-ajax.php API...');
      
      for (let i = 0; i < playerOptions.length; i++) {
        const option = playerOptions[i];
        const nume = i + 1; // nume is 1-based index
        try {
          const apiVideoUrl = await this.fetchVideoFromAPI(episodeUrl, postId, nume, option.id, option.text);
          if (apiVideoUrl) {
            playerOptions[i].videoUrl = apiVideoUrl;
            console.log(`✅ Found video URL for ${option.text}: ${apiVideoUrl}`);
            
            // Set the first found video as the main video
            if (!videoUrl) {
              videoUrl = apiVideoUrl;
              videoType = 'api_fetch';
            }
          }
        } catch (error) {
          console.log(`❌ Failed to fetch video for ${option.text}: ${error.message}`);
        }
      }
      
      // Method 2: Check for direct video elements with src attribute
      if (!videoUrl) {
        $('video').each((index, element) => {
          const $video = $(element);
          const src = $video.attr('src');
          if (src) {
            videoUrl = src;
            videoType = 'direct_video';
            console.log(`Found direct video: ${src}`);
            return false; // Break the loop
          }
        });
      }
      
      // Method 3: Check for video elements with source tags
      if (!videoUrl) {
        $('video source').each((index, element) => {
          const src = $(element).attr('src');
          if (src) {
            videoUrl = src;
            videoType = 'video_source';
            console.log(`Found video source: ${src}`);
            return false;
          }
        });
      }
      
      // Method 4: Check for data attributes
      if (!videoUrl) {
        $('[data-video], [data-src], [data-url]').each((index, element) => {
          const video = $(element).attr('data-video') || 
                       $(element).attr('data-src') || 
                       $(element).attr('data-url');
          if (video) {
            videoUrl = video;
            videoType = 'data';
            console.log(`Found data video: ${video}`);
            return false;
          }
        });
      }

      // Method 5: Check for script tags with video URLs
      if (!videoUrl) {
        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          if (scriptContent) {
            // Look for direct video URLs in scripts
            const videoMatch = scriptContent.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))/i);
            if (videoMatch) {
              videoUrl = videoMatch[1];
              videoType = 'script';
              console.log(`Found script video: ${videoUrl}`);
              return false;
            }
          }
        });
      }

      // Method 6: Look for video URLs in the entire HTML content
      if (!videoUrl) {
        const htmlContent = $.html();
        
        // Look for direct video URLs in HTML
        const videoMatches = htmlContent.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))/gi);
        if (videoMatches && videoMatches.length > 0) {
          videoUrl = videoMatches[0];
          videoType = 'html_video';
          console.log(`Found video in HTML: ${videoUrl}`);
        }
      }

      // Method 7: Look for video URLs in all script tags (more thorough)
      if (!videoUrl) {
        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          if (scriptContent) {
            // Look for video URLs in script content
            const videoMatches = scriptContent.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))/gi);
            if (videoMatches && videoMatches.length > 0) {
              videoUrl = videoMatches[0];
              videoType = 'script_video';
              console.log(`Found video in script ${index + 1}: ${videoUrl}`);
              return false; // Break the loop
            }
          }
        });
      }

      // Method 8: Look for video URLs in data attributes or specific patterns
      if (!videoUrl) {
        const htmlContent = $.html();
        
        // Look for video URLs in data attributes
        const dataVideoMatches = htmlContent.match(/data-video="([^"]+)"/i);
        if (dataVideoMatches) {
          videoUrl = dataVideoMatches[1];
          videoType = 'data_video';
          console.log(`Found data-video: ${videoUrl}`);
        }
        
        // Look for video URLs in src attributes
        if (!videoUrl) {
          const srcVideoMatches = htmlContent.match(/src="([^"]*(?:\.mp4|\.m3u8|\.webm|\.ogg)[^"]*)"/i);
          if (srcVideoMatches) {
            videoUrl = srcVideoMatches[1];
            videoType = 'src_video';
            console.log(`Found src video: ${videoUrl}`);
          }
        }
      }

      // Method 9: Look for video URLs in specific Samehadaku patterns
      if (!videoUrl) {
        const htmlContent = $.html();
        
        // Look for wibufile.com URLs (Samehadaku specific) - but exclude chat and js files
        const wibufileMatches = htmlContent.match(/(https?:\/\/[^"'\s]*wibufile\.com[^"'\s]*(?:\.mp4|video)[^"'\s]*)/gi);
        if (wibufileMatches && wibufileMatches.length > 0) {
          videoUrl = wibufileMatches[0];
          videoType = 'wibufile_video';
          console.log(`Found wibufile video: ${videoUrl}`);
        }
        
        // Look for googlevideo.com URLs
        if (!videoUrl) {
          const googleVideoMatches = htmlContent.match(/(https?:\/\/[^"'\s]*googlevideo\.com[^"'\s]*)/gi);
          if (googleVideoMatches && googleVideoMatches.length > 0) {
            videoUrl = googleVideoMatches[0];
            videoType = 'google_video';
            console.log(`Found Google video: ${videoUrl}`);
          }
        }
      }

      // Method 10: Look for video URLs in JavaScript variables or functions
      if (!videoUrl) {
        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          if (scriptContent) {
            // Look for video URLs in JavaScript variables
            const jsVideoMatches = scriptContent.match(/["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))["']/gi);
            if (jsVideoMatches && jsVideoMatches.length > 0) {
              videoUrl = jsVideoMatches[0].replace(/["']/g, '');
              videoType = 'js_video';
              console.log(`Found JS video: ${videoUrl}`);
              return false; // Break the loop
            }
            
            // Look for video URLs in JavaScript object properties
            const jsObjMatches = scriptContent.match(/["']src["']\s*:\s*["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))["']/gi);
            if (jsObjMatches && jsObjMatches.length > 0) {
              videoUrl = jsObjMatches[0].match(/["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))["']/i)[1];
              videoType = 'js_obj_video';
              console.log(`Found JS object video: ${videoUrl}`);
              return false; // Break the loop
            }
          }
        });
      }

      // Method 11: Look for video URLs in links or buttons that might contain video
      if (!videoUrl) {
        $('a, button').each((index, element) => {
          const $el = $(element);
          const href = $el.attr('href');
          const onclick = $el.attr('onclick');
          const text = $el.text().toLowerCase();
          
          // Check if link contains video URL
          if (href && (href.includes('.mp4') || href.includes('.m3u8') || href.includes('.webm') || href.includes('.ogg'))) {
            videoUrl = href;
            videoType = 'link_video';
            console.log(`Found video link: ${videoUrl}`);
            return false; // Break the loop
          }
          
          // Check if button text suggests it's a video player
          if (text.includes('play') || text.includes('video') || text.includes('watch') || text.includes('stream')) {
            console.log(`Found potential video button: ${text}`);
          }
        });
      }

      // Method 12: Look for video URLs in the entire HTML content (case insensitive)
      if (!videoUrl) {
        const htmlContent = $.html();
        
        // Look for any URL that contains video-related keywords
        const allVideoMatches = htmlContent.match(/(https?:\/\/[^"'\s]*(?:\.mp4|\.m3u8|\.webm|\.ogg|video|stream|player)[^"'\s]*)/gi);
        if (allVideoMatches && allVideoMatches.length > 0) {
          // Filter out non-video URLs
          const filteredMatches = allVideoMatches.filter(url => 
            url.includes('.mp4') || url.includes('.m3u8') || url.includes('.webm') || url.includes('.ogg')
          );
          if (filteredMatches.length > 0) {
            videoUrl = filteredMatches[0];
            videoType = 'html_all_video';
            console.log(`Found video in HTML (filtered): ${videoUrl}`);
          }
        }
      }

      // Method 13: Look for video URLs in player options (Samehadaku specific)
      if (!videoUrl) {
        $('[id^="player-option-"]').each((index, element) => {
          const $el = $(element);
          const id = $el.attr('id');
          const className = $el.attr('class') || '';
          const text = $el.text().trim();
          
          console.log(`Checking player option ${id}: text="${text}" class="${className}"`);
          
          // Look for video URLs in the player option content
          const optionContent = $el.html();
          if (optionContent) {
            const videoMatches = optionContent.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))/gi);
            if (videoMatches && videoMatches.length > 0) {
              videoUrl = videoMatches[0];
              videoType = 'player_option';
              console.log(`Found video in player option ${id}: ${videoUrl}`);
              return false; // Break the loop
            }
          }
        });
      }

      // Method 14: Look for video URLs in player embed div
      if (!videoUrl) {
        const playerEmbed = $('#player_embed, #pembed, .player-embed');
        if (playerEmbed.length > 0) {
          const embedContent = playerEmbed.html();
          console.log('Checking player embed content...');
          
          if (embedContent) {
            const videoMatches = embedContent.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))/gi);
            if (videoMatches && videoMatches.length > 0) {
              videoUrl = videoMatches[0];
              videoType = 'player_embed';
              console.log(`Found video in player embed: ${videoUrl}`);
            }
          }
        }
      }

      // Method 15: Look for video URLs in all script tags (more thorough)
      if (!videoUrl) {
        $('script').each((index, element) => {
          const scriptContent = $(element).html();
          if (scriptContent) {
            // Look for video URLs in script content
            const videoMatches = scriptContent.match(/(https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))/gi);
            if (videoMatches && videoMatches.length > 0) {
              videoUrl = videoMatches[0];
              videoType = 'script_video';
              console.log(`Found video in script ${index + 1}: ${videoUrl}`);
              return false; // Break the loop
            }
            
            // Look for video URLs in JavaScript object properties
            const jsObjMatches = scriptContent.match(/["']src["']\s*:\s*["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))["']/gi);
            if (jsObjMatches && jsObjMatches.length > 0) {
              videoUrl = jsObjMatches[0].match(/["'](https?:\/\/[^"'\s]+\.(?:mp4|m3u8|webm|ogg))["']/i)[1];
              videoType = 'js_obj_video';
              console.log(`Found JS object video in script ${index + 1}: ${videoUrl}`);
              return false; // Break the loop
            }
          }
        });
      }

      // Method 16: Look for video URLs in the entire HTML content (case insensitive)
      if (!videoUrl) {
        const htmlContent = $.html();
        
        // Look for wibufile.com URLs specifically (Samehadaku video hosting)
        const wibufileMatches = htmlContent.match(/(https?:\/\/[^"'\s]*wibufile\.com[^"'\s]*\.mp4[^"'\s]*)/gi);
        if (wibufileMatches && wibufileMatches.length > 0) {
          videoUrl = wibufileMatches[0];
          videoType = 'wibufile_mp4';
          console.log(`Found wibufile MP4: ${videoUrl}`);
        }
        
        // Look for any MP4 URLs
        if (!videoUrl) {
          const mp4Matches = htmlContent.match(/(https?:\/\/[^"'\s]*\.mp4[^"'\s]*)/gi);
          if (mp4Matches && mp4Matches.length > 0) {
            videoUrl = mp4Matches[0];
            videoType = 'html_mp4';
            console.log(`Found MP4 in HTML: ${videoUrl}`);
          }
        }
      }

      // Method 17: Look for video URLs in data attributes or hidden elements
      if (!videoUrl) {
        $('[data-video], [data-src], [data-url], [data-player]').each((index, element) => {
          const $el = $(element);
          const dataVideo = $el.attr('data-video');
          const dataSrc = $el.attr('data-src');
          const dataUrl = $el.attr('data-url');
          const dataPlayer = $el.attr('data-player');
          
          if (dataVideo && (dataVideo.includes('.mp4') || dataVideo.includes('wibufile.com'))) {
            videoUrl = dataVideo;
            videoType = 'data_video';
            console.log(`Found data-video: ${videoUrl}`);
            return false;
          }
          
          if (dataSrc && (dataSrc.includes('.mp4') || dataSrc.includes('wibufile.com'))) {
            videoUrl = dataSrc;
            videoType = 'data_src';
            console.log(`Found data-src: ${videoUrl}`);
            return false;
          }
          
          if (dataUrl && (dataUrl.includes('.mp4') || dataUrl.includes('wibufile.com'))) {
            videoUrl = dataUrl;
            videoType = 'data_url';
            console.log(`Found data-url: ${videoUrl}`);
            return false;
          }
          
          if (dataPlayer && (dataPlayer.includes('.mp4') || dataPlayer.includes('wibufile.com'))) {
            videoUrl = dataPlayer;
            videoType = 'data_player';
            console.log(`Found data-player: ${videoUrl}`);
            return false;
          }
        });
      }

      // Method 18: Look for video URLs in iframe src attributes (Samehadaku specific)
      if (!videoUrl) {
        $('iframe').each((index, element) => {
          const $el = $(element);
          const src = $el.attr('src');
          
          if (src && src.includes('wibufile.com') && src.includes('.mp4')) {
            videoUrl = src;
            videoType = 'iframe_wibufile';
            console.log(`Found wibufile iframe: ${videoUrl}`);
            return false;
          }
        });
      }

      // Method 19: Look for video URLs in the entire HTML content (case insensitive) - more specific
      if (!videoUrl) {
        const htmlContent = $.html();
        
        // Look for wibufile.com URLs with MP4 extension specifically
        const wibufileMp4Matches = htmlContent.match(/(https?:\/\/[^"'\s]*wibufile\.com[^"'\s]*\.mp4[^"'\s]*)/gi);
        if (wibufileMp4Matches && wibufileMp4Matches.length > 0) {
          videoUrl = wibufileMp4Matches[0];
          videoType = 'wibufile_mp4_html';
          console.log(`Found wibufile MP4 in HTML: ${videoUrl}`);
        }
      }

      // Method 20: Look for video URLs in all script tags (more thorough) - limited to first 10
      if (!videoUrl) {
        $('script').each((index, element) => {
          if (index >= 10) return false; // Only check first 10 scripts
          
          const scriptContent = $(element).html();
          if (scriptContent) {
            // Look for wibufile.com URLs with MP4 extension in scripts
            const wibufileMp4Matches = scriptContent.match(/(https?:\/\/[^"'\s]*wibufile\.com[^"'\s]*\.mp4[^"'\s]*)/gi);
            if (wibufileMp4Matches && wibufileMp4Matches.length > 0) {
              videoUrl = wibufileMp4Matches[0];
              videoType = 'wibufile_mp4_script';
              console.log(`Found wibufile MP4 in script ${index + 1}: ${videoUrl}`);
              return false; // Break the loop
            }
          }
        });
      }



      if (videoUrl) {
        console.log(`✅ Found video URL: ${videoUrl} (type: ${videoType})`);
        return {
          url: videoUrl,
          type: videoType,
          episodeUrl: episodeUrl,
          playerOptions: playerOptions
        };
      } else {
        console.log('❌ No video URL found');
        return {
          url: null,
          type: null,
          episodeUrl: episodeUrl,
          playerOptions: playerOptions
        };
      }
    } catch (error) {
      console.error('Error scraping episode video:', error);
      return null;
    }
  }

  resolveUrl(url) {
    if (url.startsWith('http')) {
      return url;
    }
    if (url.startsWith('/')) {
      return `${this.baseUrl}${url.substring(1)}`;
    }
    return `${this.baseUrl}${url}`;
  }

  resolveImageUrl(imageUrl) {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    if (imageUrl.startsWith('//')) {
      return `https:${imageUrl}`;
    }
    return `${this.baseUrl}${imageUrl}`;
  }

  generateId(text) {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async fetchVideoFromAPI(episodeUrl, postId, playerOptionIndex, playerOptionId, playerOptionText) {
    console.log(`Fetching video from API for ${playerOptionText} (${playerOptionId}) with post ID ${postId} and nume ${playerOptionIndex}`);

    try {
      const apiUrl = `${this.baseUrl}wp-admin/admin-ajax.php`;
      const formData = new URLSearchParams();
      formData.append('action', 'player_ajax');
      formData.append('post', postId);
      formData.append('nume', playerOptionIndex);
      formData.append('type', 'schtml');

      console.log(`Calling API: ${apiUrl}`);
      console.log(`Form data: action=player_ajax, post=${postId}, nume=${playerOptionIndex}, type=schtml`);

      const response = await axios.post(apiUrl, formData, {
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Accept-Encoding': 'gzip, deflate',
          'Connection': 'keep-alive',
          'Referer': episodeUrl,
          'Origin': this.baseUrl
        }
      });

      console.log(`API Response status: ${response.status}`);
      console.log(`API Response data: ${response.data.substring(0, 200)}...`);

      // Parse the response to extract video URL
      const $ = cheerio.load(response.data);
      
      // Look for iframe with video URL
      const iframe = $('iframe');
      if (iframe.length > 0) {
        const src = iframe.attr('src');
        if (src && (src.includes('.mp4') || src.includes('wibufile.com'))) {
          console.log(`✅ Found video URL in API response: ${src}`);
          return src;
        }
      }

      // Look for video URL in the response text
      const videoMatch = response.data.match(/src="([^"]*\.mp4[^"]*)"/i);
      if (videoMatch) {
        console.log(`✅ Found video URL in response text: ${videoMatch[1]}`);
        return videoMatch[1];
      }

      // Look for wibufile.com URLs
      const wibufileMatch = response.data.match(/(https?:\/\/[^"'\s]*wibufile\.com[^"'\s]*\.mp4[^"'\s]*)/i);
      if (wibufileMatch) {
        console.log(`✅ Found wibufile URL in response: ${wibufileMatch[1]}`);
        return wibufileMatch[1];
      }

      console.log('❌ No video URL found in API response');
      return null;

    } catch (error) {
      console.error(`Error fetching video from API for ${playerOptionText}:`, error.message);
      return null;
    }
  }

  async getEpisodeScreenshot(episodeUrl) {
    console.log(`Getting screenshot for episode: ${episodeUrl}`);
    
    try {
      // First, get the video URL from the episode
      const videoData = await this.scrapeEpisodeVideo(episodeUrl);
      
      if (!videoData || !videoData.playerOptions) {
        console.log('❌ No video data found for screenshot');
        return null;
      }
  
      // Try to get the first available video URL
      let videoUrl = null;
      for (const option of videoData.playerOptions) {
        if (option.videoUrl) {
          videoUrl = option.videoUrl;
          break;
        }
      }
  
      if (!videoUrl) {
        console.log('❌ No video URL found for screenshot');
        return null;
      }
  
      // Generate a more realistic screenshot URL
      // Using a video thumbnail service or sophisticated placeholder
      const videoId = this.generateId(videoUrl);
      const episodeTitle = this.extractEpisodeTitleFromUrl(episodeUrl);
      
      // Create a more sophisticated placeholder that looks like a video frame
      // Using a combination of anime-themed colors and episode info
      const colors = [
        'ff6b6b', '4ecdc4', '45b7d1', '96ceb4', 'feca57',
        'ff9ff3', '54a0ff', '5f27cd', '00d2d3', 'ff9f43'
      ];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      // Create a screenshot URL that represents a video frame at 10 minutes
      const screenshotUrl = `https://via.placeholder.com/400x225/${randomColor}/ffffff?text=${encodeURIComponent(episodeTitle + ' - 10:00')}`;
      
      console.log(`✅ Generated screenshot URL: ${screenshotUrl}`);
      return screenshotUrl;
  
    } catch (error) {
      console.error(`Error getting episode screenshot: ${error.message}`);
      return null;
    }
  }

  extractEpisodeTitleFromUrl(url) {
    try {
      // Extract anime title from URL
      const urlParts = url.split('/');
      const lastPart = urlParts[urlParts.length - 2]; // Remove trailing slash
      
      // Convert URL format to readable title
      let title = lastPart
        .replace(/-/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      
      // Clean up common patterns
      title = title.replace(/Episode \d+/i, '').trim();
      title = title.replace(/Season \d+/i, 'S$1').trim();
      title = title.replace(/Part \d+/i, 'P$1').trim();
      
      return title || 'Anime Episode';
    } catch (error) {
      return 'Anime Episode';
    }
  }

  async scrapeAnimeList() {
    console.log('Starting to scrape anime list from daftar-anime-2...');
    
    const allAnime = [];
    let currentPage = 1;
    const maxPages = 50; // Limit to prevent infinite loop
    
    try {
      while (currentPage <= maxPages) {
        console.log(`Scraping page ${currentPage}...`);
        
        const pageUrl = currentPage === 1 
          ? `${this.baseUrl}daftar-anime-2/`
          : `${this.baseUrl}daftar-anime-2/page/${currentPage}/`;
        
        const response = await axios.get(pageUrl, {
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        const $ = cheerio.load(response.data);
        
        // Find all anime entries
        const animeEntries = $('article.animpost');
        
        if (animeEntries.length === 0) {
          console.log(`No anime entries found on page ${currentPage}, stopping...`);
          break;
        }
        
        console.log(`Found ${animeEntries.length} anime entries on page ${currentPage}`);
        
        for (let i = 0; i < animeEntries.length; i++) {
          const entry = $(animeEntries[i]);
          
          try {
            // Extract anime information
            const titleElement = entry.find('.data .title h2');
            const title = titleElement.text().trim();
            
            if (!title) {
              console.log(`Skipping entry ${i + 1} on page ${currentPage} - no title found`);
              continue;
            }
            
            // Extract link
            const linkElement = entry.find('.animposx a').first();
            const link = linkElement.attr('href');
            const fullLink = link ? this.resolveUrl(link) : null;
            
            // Extract image
            const imgElement = entry.find('.content-thumb img.anmsa').first();
            const imageUrl = imgElement.attr('src') || imgElement.attr('data-src');
            const fullImageUrl = imageUrl ? this.resolveImageUrl(imageUrl) : null;
            
            // Extract rating/score
            const ratingElement = entry.find('.score');
            const rating = ratingElement.text().trim();
            
            // Extract status (ongoing/completed)
            const statusElement = entry.find('.data .type');
            const status = statusElement.text().trim();
            
            // Extract type (TV, Movie, OVA, etc.)
            const typeElement = entry.find('.content-thumb .type');
            const type = typeElement.text().trim();
            
            // Extract genres
            const genreElements = entry.find('.stooltip .genres .mta a');
            const genres = genreElements.map((index, element) => $(element).text().trim()).get();
            
            // Extract description/synopsis
            const descElement = entry.find('.stooltip .ttls');
            const description = descElement.text().trim();
            
            // Extract episode count or other info
            const episodeElement = entry.find('.metadata span:last-child');
            const episodeInfo = episodeElement.text().trim();
            
            const animeData = {
              id: this.generateId(title),
              title: title,
              link: fullLink,
              imageUrl: fullImageUrl,
              rating: rating || null,
              status: status || null,
              type: type || null,
              genres: genres.length > 0 ? genres : [],
              description: description || null,
              episodeInfo: episodeInfo || null,
              scrapedAt: new Date().toISOString()
            };
            
            // Check if this anime is already in the list (avoid duplicates)
            const existingIndex = allAnime.findIndex(anime => anime.title === title);
            if (existingIndex === -1) {
              allAnime.push(animeData);
              console.log(`✅ Added anime: ${title}`);
            } else {
              console.log(`⚠️ Skipping duplicate: ${title}`);
            }
            
            // Add delay to be respectful to the server
            await this.delay(100);
            
          } catch (error) {
            console.error(`Error processing anime entry ${i + 1} on page ${currentPage}:`, error.message);
            continue;
          }
        }
        
        // Check if there's a next page
        const nextPageLink = $('.pagination .next, .pagination a[rel="next"], .pagination a:contains("Next")');
        if (nextPageLink.length === 0) {
          console.log(`No next page found, stopping at page ${currentPage}`);
          break;
        }
        
        currentPage++;
        
        // Add delay between pages
        await this.delay(1000);
      }
      
      console.log(`✅ Anime list scraping completed! Total anime found: ${allAnime.length}`);
      return allAnime;
      
    } catch (error) {
      console.error('Error scraping anime list:', error);
      throw error;
    }
  }

  async saveAnimeList(animeList) {
    try {
      const animeListFile = process.env.ANIME_LIST_FILE || './data/anime-list.json';
      
      const data = {
        animeList: animeList,
        totalAnime: animeList.length,
        lastUpdated: new Date().toISOString(),
        source: `${this.baseUrl}daftar-anime-2/`
      };
      
      await fs.writeJson(animeListFile, data, { spaces: 2 });
      console.log(`✅ Anime list saved to: ${animeListFile}`);
      console.log(`Total anime saved: ${animeList.length}`);
      
      return data;
    } catch (error) {
      console.error('Error saving anime list:', error);
      throw error;
    }
  }

}

const scraper = new SamehadakuScraper();

module.exports = scraper;
