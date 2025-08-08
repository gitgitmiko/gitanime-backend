const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const scraper = require('./scraper');
const configManager = require('./configManager');

const app = express();
const PORT = process.env.PORT || 5000;

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    const allowedOrigins = [
      'http://localhost:3000',
      'https://frontend-pgb3obd5u-gitgitmikos-projects.vercel.app',
      'https://frontend-9kei8umgj-gitgitmikos-projects.vercel.app',
      'https://frontend-mbs1npfxy-gitgitmikos-projects.vercel.app',
      'https://frontend-n5wtkjkwg-gitgitmikos-projects.vercel.app',
      'https://frontend-nqidldty7-gitgitmikos-projects.vercel.app',
      'https://frontend-9fw7o7cci-gitgitmikos-projects.vercel.app',
      'https://frontend-n4ejxee5v-gitgitmikos-projects.vercel.app',
      'https://frontend-1vo932eb9-gitgitmikos-projects.vercel.app',
      'https://frontend-alpha-nine-27.vercel.app'
    ];
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
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

// Additional CORS headers for all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin);
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});
app.use(express.json());
app.use(express.static('public'));

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';

// Data file path
const DATA_FILE = isProduction ? '/tmp/anime-data.json' : './data/anime-data.json';
const CONFIG_FILE = isProduction ? '/tmp/config.json' : './data/config.json';

// Initialize data files for production
if (isProduction) {
  try {
    // Create default data structure if files don't exist
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeJsonSync(DATA_FILE, {
        anime: [],
        episodes: [],
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
  } catch (error) {
    console.error('Error initializing production data files:', error);
  }
}

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'GitAnime API is running' });
});

// Get all anime
app.get('/api/anime', async (req, res) => {
  try {
    const data = await fs.readJson(DATA_FILE);
    const { page = 1, limit = 20, search = '' } = req.query;
    
    // Get all episodes from episodes array
    let allEpisodes = data.episodes || [];
    
    // Search functionality
    if (search) {
      allEpisodes = allEpisodes.filter(episode => 
        episode.title.toLowerCase().includes(search.toLowerCase())
      );
    }
    
    // Sort by createdAt descending (newest first)
    allEpisodes.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
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
    const animeList = data.anime || [];
    
    // Create a map of all episodes for quick lookup
    const episodeMap = new Map();
    data.anime.forEach(item => {
      if (item.episodeNumber) {
        // This is an episode
        const key = `${item.title}-${item.episodeNumber}`;
        episodeMap.set(key, item);
      }
    });
    
    // Process each anime to get latest episode info
    const latestAnime = animeList.filter(anime => !anime.episodeNumber).map(anime => {
      const latestEpisodeKey = `${anime.title}-${anime.latestEpisode}`;
      const latestEpisode = episodeMap.get(latestEpisodeKey);
      
      // Construct direct link to latest episode
      const latestEpisodeLink = `https://v1.samehadaku.how/${anime.id}-episode-${anime.latestEpisode}/`;
      
      return {
        id: anime.id,
        title: anime.title,
        totalEpisodes: anime.totalEpisodes,
        latestEpisode: anime.latestEpisode,
        postedBy: latestEpisode ? latestEpisode.postedBy : null,
        releasedOn: latestEpisode ? latestEpisode.releasedOn : null,
        latestEpisodeLink: latestEpisodeLink,
        createdAt: anime.createdAt
      };
    });
    
    res.json({ latest: latestAnime });
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

// Start server
app.listen(PORT, () => {
  console.log(`GitAnime API server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

// Export for Vercel
module.exports = app;

// Initialize scraping on startup
scraper.initialize();
