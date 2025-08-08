const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const configManager = require('./configManager');

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';

// Data file path
const DATA_FILE = isProduction ? '/tmp/anime-data.json' : './data/anime-data.json';
const CONFIG_FILE = isProduction ? '/tmp/config.json' : './data/config.json';
const ANIME_LIST_FILE = isProduction ? '/tmp/anime-list.json' : './data/anime-list.json';

// Set environment variables for scraper to use the same file paths
if (isProduction) {
  process.env.DATA_FILE = DATA_FILE;
  process.env.CONFIG_FILE = CONFIG_FILE;
  process.env.ANIME_LIST_FILE = ANIME_LIST_FILE;
}

// Import scraper after setting environment variables
const scraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:5173',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
      'http://127.0.0.1:5173',
      'https://frontend-pgb3obd5u-gitgitmikos-projects.vercel.app',
      'https://frontend-9kei8umgj-gitgitmikos-projects.vercel.app',
      'https://frontend-mbs1npfxy-gitgitmikos-projects.vercel.app',
      'https://frontend-n5wtkjkwg-gitgitmikos-projects.vercel.app',
      'https://frontend-nqidldty7-gitgitmikos-projects.vercel.app',
      'https://frontend-9fw7o7cci-gitgitmikos-projects.vercel.app',
      'https://frontend-n4ejxee5v-gitgitmikos-projects.vercel.app',
      'https://frontend-1vo932eb9-gitgitmikos-projects.vercel.app',
      'https://frontend-alpha-nine-27.vercel.app',
      // Tambahkan domain Render.com untuk development
      'https://gitanime-backend.onrender.com',
      'https://gitanime-backend-dev.onrender.com',
      // Tambahkan domain frontend utama
      'https://gitanime-web.vercel.app'
    ];
    
    // Log origin untuk debugging
    console.log('CORS request from origin:', origin);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Untuk sementara, izinkan semua origin di development
      if (process.env.NODE_ENV !== 'production') {
        console.log('Development mode: Allowing origin:', origin);
        callback(null, true);
      } else {
        console.log('Production mode: Blocking origin:', origin);
        callback(new Error('Not allowed by CORS'));
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Content-Length', 'Content-Type'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight for 24 hours
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(express.static('public'));

// Initialize data files for production
if (isProduction) {
  try {
    // Create default data structure if files don't exist
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeJsonSync(DATA_FILE, {
        anime: [],
        episodes: [],
        latestEpisodes: [],
        lastUpdated: new Date().toISOString(),
        totalAnime: 0,
        totalEpisodes: 0
      });
    }
    
    if (!fs.existsSync(CONFIG_FILE)) {
      fs.writeJsonSync(CONFIG_FILE, {
        sourceUrl: 'https://v1.samehadaku.how/',
        scrapingInterval: '0 * * * *',
        autoScraping: true
      });
    }
    
    if (!fs.existsSync(ANIME_LIST_FILE)) {
      fs.writeJsonSync(ANIME_LIST_FILE, {
        animeList: [],
        totalAnime: 0,
        lastUpdated: new Date().toISOString(),
        source: 'https://v1.samehadaku.how/daftar-anime-2/'
      });
    }
  } catch (error) {
    console.error('Error initializing production data files:', error);
  }
}

// Routes
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'GitAnime API is running' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'GitAnime API is running' });
});

// Debug endpoint to check data file status
app.get('/api/debug', async (req, res) => {
  try {
    const dataExists = await fs.pathExists(DATA_FILE);
    let dataInfo = { exists: dataExists };
    
    if (dataExists) {
      const data = await fs.readJson(DATA_FILE);
      dataInfo = {
        exists: true,
        filePath: DATA_FILE,
        lastUpdated: data.lastUpdated,
        totalAnime: data.totalAnime,
        totalEpisodes: data.totalEpisodes,
        latestEpisodesCount: (data.latestEpisodes || []).length,
        animeCount: (data.anime || []).length,
        episodesCount: (data.episodes || []).length
      };
    }
    
    res.json({
      status: 'OK',
      environment: process.env.NODE_ENV || 'development',
      dataFile: DATA_FILE,
      dataInfo: dataInfo
    });
  } catch (error) {
    console.error('Error in debug endpoint:', error);
    res.status(500).json({ error: 'Failed to get debug info' });
  }
});

// Raw data endpoint for debugging
app.get('/api/raw-data', async (req, res) => {
  try {
    const dataExists = await fs.pathExists(DATA_FILE);
    
    if (!dataExists) {
      return res.json({ error: 'Data file does not exist' });
    }
    
    const data = await fs.readJson(DATA_FILE);
    res.json({
      status: 'OK',
      filePath: DATA_FILE,
      data: data
    });
  } catch (error) {
    console.error('Error in raw data endpoint:', error);
    res.status(500).json({ error: 'Failed to get raw data' });
  }
});

// Get all anime
app.get('/api/anime', async (req, res) => {
  try {
    const data = await fs.readJson(DATA_FILE);
    const { page = 1, limit = 20, search = '' } = req.query;
    
    // Get all episodes from latestEpisodes array (this contains the actual episode data)
    let allEpisodes = data.latestEpisodes || [];
    
    // Filter only episodes that have releasedOn (not null)
    allEpisodes = allEpisodes.filter(episode => episode.releasedOn && episode.releasedOn !== null);
    
    // Search functionality
    if (search) {
      allEpisodes = allEpisodes.filter(episode => 
        episode.title.toLowerCase().includes(search.toLowerCase()) ||
        (episode.episodeTitle && episode.episodeTitle.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Sort by releasedOn descending (newest first)
    // Convert "X days yang lalu" to actual date for sorting
    allEpisodes.sort((a, b) => {
      const getDaysAgo = (releasedOn) => {
        if (!releasedOn) return 0;
        const match = releasedOn.match(/(\d+)\s+days?\s+yang\s+lalu/i);
        return match ? parseInt(match[1]) : 0;
      };
      
      const daysA = getDaysAgo(a.releasedOn);
      const daysB = getDaysAgo(b.releasedOn);
      
      return daysA - daysB; // Ascending order (0 days ago first, then 1 day ago, etc.)
    });
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedEpisodes = allEpisodes.slice(startIndex, endIndex);
    
    res.json({
      anime: paginatedEpisodes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(allEpisodes.length / limit),
        totalItems: allEpisodes.length,
        itemsPerPage: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching anime:', error);
    res.status(500).json({ error: 'Failed to fetch anime data' });
  }
});



// Manual scrape trigger (admin only)
app.post('/api/scrape', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    await scraper.scrapeAll();
    res.json({ message: 'Scraping completed successfully' });
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'Failed to scrape data' });
  }
});

// Manual scrape trigger for testing (no password required)
app.post('/api/scrape-test', async (req, res) => {
  try {
    console.log('Manual scrape triggered via /api/scrape-test');
    await scraper.scrapeAll();
    res.json({ message: 'Scraping completed successfully' });
  } catch (error) {
    console.error('Error during scraping:', error);
    res.status(500).json({ error: 'Failed to scrape data' });
  }
});

// Get configuration
app.get('/api/config', async (req, res) => {
  try {
    const config = await configManager.getConfig();
    res.json(config);
  } catch (error) {
    console.error('Error fetching config:', error);
    res.status(500).json({ error: 'Failed to fetch configuration' });
  }
});

// Update configuration (admin only)
app.put('/api/config', async (req, res) => {
  try {
    const { password, testAuth, ...configData } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    // If this is just a test authentication, return success
    if (testAuth) {
      return res.json({ message: 'Authentication successful' });
    }
    
    await configManager.updateConfig(configData);
    res.json({ message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Error updating config:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

// Get latest updates
app.get('/api/latest', async (req, res) => {
  try {
    const data = await fs.readJson(DATA_FILE);
    const latestEpisodes = data.latestEpisodes || [];
    
    // Group episodes by anime title
    const animeGroups = {};
    
    latestEpisodes.forEach(episode => {
      const animeTitle = episode.title;
      
      if (!animeGroups[animeTitle]) {
        animeGroups[animeTitle] = {
          title: animeTitle,
          totalEpisodes: 0,
          episodes: [],
          latestEpisode: null,
          imageUrl: episode.imageUrl || null,
          animeUrl: episode.animeUrl || null
        };
      }
      
      animeGroups[animeTitle].totalEpisodes++;
      animeGroups[animeTitle].episodes.push({
        id: episode.id,
        episodeNumber: episode.episodeNumber,
        episodeTitle: episode.episodeTitle,
        postedBy: episode.postedBy,
        releasedOn: episode.releasedOn,
        episodeUrl: episode.episodeUrl,
        createdAt: episode.createdAt
      });
      
      // Update latest episode if this one is newer
      if (!animeGroups[animeTitle].latestEpisode || 
          new Date(episode.createdAt) > new Date(animeGroups[animeTitle].latestEpisode.createdAt)) {
        animeGroups[animeTitle].latestEpisode = {
          id: episode.id,
          episodeNumber: episode.episodeNumber,
          episodeTitle: episode.episodeTitle,
          postedBy: episode.postedBy,
          releasedOn: episode.releasedOn,
          episodeUrl: episode.episodeUrl,
          createdAt: episode.createdAt
        };
      }
    });
    
    // Convert to array and sort by latest episode date
    const animeList = Object.values(animeGroups)
      .sort((a, b) => {
        if (!a.latestEpisode || !b.latestEpisode) return 0;
        return new Date(b.latestEpisode.createdAt) - new Date(a.latestEpisode.createdAt);
      });
    
    // Create summary information
    const summary = {
      totalAnime: animeList.length,
      totalEpisodes: latestEpisodes.length,
      animeList: animeList.map(anime => ({
        title: anime.title,
        totalEpisodes: anime.totalEpisodes,
        latestEpisode: anime.latestEpisode,
        imageUrl: anime.imageUrl,
        animeUrl: anime.animeUrl
      }))
    };
    
    res.json({ 
      latest: animeList,
      summary: summary
    });
  } catch (error) {
    console.error('Error fetching latest:', error);
    res.status(500).json({ error: 'Failed to fetch latest episodes' });
  }
});

// Get anime detail by URL
app.get('/api/anime-detail', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL parameter is required' 
      });
    }
    
    const animeDetail = await scraper.scrapeAnimeDetail(url);
    
    if (!animeDetail) {
      return res.status(404).json({ 
        success: false, 
        message: 'Anime not found or failed to scrape' 
      });
    }
    
    res.json({
      success: true,
      data: animeDetail
    });
  } catch (error) {
    console.error('Error fetching anime detail:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch anime detail' 
    });
  }
});

// Get anime list (full catalog)
app.get('/api/anime-list', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', forceRefresh = false } = req.query;
    const animeListFile = process.env.ANIME_LIST_FILE || './data/anime-list.json';
    
    // Check if we should force refresh or if file doesn't exist
    let shouldScrape = forceRefresh === 'true';
    
    if (!shouldScrape) {
      try {
        const exists = await fs.pathExists(animeListFile);
        if (!exists) {
          shouldScrape = true;
        } else {
          // Check if file is older than 24 hours
          const stats = await fs.stat(animeListFile);
          const hoursSinceUpdate = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60);
          if (hoursSinceUpdate > 24) {
            shouldScrape = true;
          }
        }
      } catch (error) {
        shouldScrape = true;
      }
    }
    
    let animeData;
    
    if (shouldScrape) {
      console.log('Scraping fresh anime list...');
      // Use batch scraping for better production performance
      const animeList = await scraper.scrapeAnimeListBatch(1, 10);
      animeData = await scraper.saveAnimeList(animeList);
    } else {
      console.log('Loading existing anime list...');
      animeData = await fs.readJson(animeListFile);
    }
    
    let filteredAnime = animeData.animeList || [];
    
    // Search functionality
    if (search) {
      filteredAnime = filteredAnime.filter(anime => 
        anime.title.toLowerCase().includes(search.toLowerCase()) ||
        (anime.description && anime.description.toLowerCase().includes(search.toLowerCase())) ||
        (anime.genres && anime.genres.some(genre => genre.toLowerCase().includes(search.toLowerCase())))
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedAnime = filteredAnime.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        anime: paginatedAnime,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredAnime.length / limit),
          totalItems: filteredAnime.length,
          itemsPerPage: parseInt(limit)
        },
        summary: {
          totalAnime: animeData.totalAnime,
          lastUpdated: animeData.lastUpdated,
          source: animeData.source
        }
      }
    });
  } catch (error) {
    console.error('Error fetching anime list:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch anime list' 
    });
  }
});

// Manual anime list scraping trigger (admin only)
app.post('/api/scrape-anime-list', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('Manual anime list scraping triggered');
    // Use batch scraping for better production performance
    const animeList = await scraper.scrapeAnimeListBatch(1, 10);
    const result = await scraper.saveAnimeList(animeList);
    
    res.json({ 
      success: true,
      message: 'Anime list scraping completed successfully',
      data: {
        totalAnime: result.totalAnime,
        lastUpdated: result.lastUpdated,
        pagesScraped: '1-10'
      }
    });
  } catch (error) {
    console.error('Error during anime list scraping:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to scrape anime list' 
    });
  }
});

// Get episode video by URL
app.get('/api/episode-video', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'URL parameter is required' 
      });
    }
    
    const videoData = await scraper.scrapeEpisodeVideo(url);
    
    if (!videoData) {
      return res.status(404).json({ 
        success: false, 
        message: 'Video not found or failed to scrape' 
      });
    }
    
    res.json({
      success: true,
      data: videoData
    });
  } catch (error) {
    console.error('Error fetching episode video:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch episode video' 
    });
  }
});

// Test batch scraping with specific page range (admin only)
app.post('/api/scrape-anime-list-batch', async (req, res) => {
  try {
    const { password, startPage = 1, endPage = 10 } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`Manual batch anime list scraping triggered: pages ${startPage}-${endPage}`);
    
    // Use batch scraping with specified range
    const animeList = await scraper.scrapeAnimeListBatch(parseInt(startPage), parseInt(endPage));
    const result = await scraper.saveAnimeList(animeList);
    
    res.json({ 
      success: true,
      message: `Anime list batch scraping completed successfully for pages ${startPage}-${endPage}`,
      data: {
        totalAnime: result.totalAnime,
        lastUpdated: result.lastUpdated,
        pagesScraped: `${startPage}-${endPage}`
      }
    });
  } catch (error) {
    console.error('Error in batch anime list scraping:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to scrape anime list',
      details: error.message 
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`GitAnime API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

// Export for Vercel
module.exports = app;

// Initialize scraping in all environments
// Auto-scraping will run daily at midnight (12 AM)
console.log(`${process.env.NODE_ENV || 'development'} mode: Initializing scraper...`);
scraper.initialize();
