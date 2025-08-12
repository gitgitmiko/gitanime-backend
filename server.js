const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const configManager = require('./configManager');
const axios = require('axios'); // Added axios for video proxy
const http = require('http');
const https = require('https');

// Production environment check
const isProduction = process.env.NODE_ENV === 'production';

// Data file path
const DATA_FILE = isProduction ? '/tmp/anime-data.json' : './data/anime-data.json';
const CONFIG_FILE = isProduction ? '/tmp/config.json' : './data/config.json';
const ANIME_LIST_FILE = isProduction ? '/tmp/anime-list.json' : './data/anime-list.json';
const LATEST_EPISODES_FILE = isProduction ? '/tmp/latest-episodes.json' : './data/latest-episodes.json';

// In-memory cache untuk meningkatkan performa
const memoryCache = {
  latestEpisodes: null,
  lastCacheUpdate: null,
  cacheExpiry: 5 * 60 * 1000, // 5 menit
  animeList: null,
  animeData: null
};

// Cache management functions
const getCachedData = (key) => {
  const cache = memoryCache[key];
  if (cache && memoryCache.lastCacheUpdate && 
      (Date.now() - memoryCache.lastCacheUpdate) < memoryCache.cacheExpiry) {
    return cache;
  }
  return null;
};

const setCachedData = (key, data) => {
  memoryCache[key] = data;
  memoryCache.lastCacheUpdate = Date.now();
};

const clearCache = () => {
  memoryCache.latestEpisodes = null;
  memoryCache.animeList = null;
  memoryCache.animeData = null;
  memoryCache.lastCacheUpdate = null;
};

// Set environment variables for scraper to use the same file paths
if (isProduction) {
  process.env.DATA_FILE = DATA_FILE;
  process.env.CONFIG_FILE = CONFIG_FILE;
  process.env.ANIME_LIST_FILE = ANIME_LIST_FILE;
  process.env.LATEST_EPISODES_FILE = LATEST_EPISODES_FILE;
}

// Import scraper after setting environment variables
const scraper = require('./scraper');

const app = express();
const PORT = process.env.PORT || 5000;

// Keep-alive axios instance for upstream video requests
const upstreamAxios = axios.create({
  timeout: 120000,
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 128 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 128 })
});

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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Range', 'Content-Range'],
  exposedHeaders: ['Content-Length', 'Content-Type', 'Accept-Ranges', 'Content-Range', 'ETag', 'Last-Modified'],
  preflightContinue: false,
  optionsSuccessStatus: 204,
  maxAge: 86400 // Cache preflight for 24 hours
};

// Middleware
app.use(cors(corsOptions));

// Handle preflight requests for all routes
app.options('*', cors(corsOptions));

// Additional CORS preflight handling for specific routes
app.options('/api/latest-episodes', cors(corsOptions));
app.options('/api/anime-list', cors(corsOptions));
app.options('/api/anime-data', cors(corsOptions));
app.options('/api/anime', cors(corsOptions));

// Cache management endpoint
app.post('/api/clear-cache', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    clearCache();
    console.log('Cache cleared successfully');
    
    res.json({ 
      success: true,
      message: 'Cache cleared successfully',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error clearing cache:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to clear cache' 
    });
  }
});

// Cache status endpoint
app.get('/api/cache-status', async (req, res) => {
  try {
    const cacheStatus = {
      latestEpisodes: {
        cached: !!memoryCache.latestEpisodes,
        lastUpdate: memoryCache.lastCacheUpdate,
        expiry: memoryCache.cacheExpiry,
        timeUntilExpiry: memoryCache.lastCacheUpdate ? 
          (memoryCache.cacheExpiry - (Date.now() - memoryCache.lastCacheUpdate)) : null
      },
      animeList: {
        cached: !!memoryCache.animeList,
        lastUpdate: memoryCache.lastCacheUpdate
      },
      animeData: {
        cached: !!memoryCache.animeData,
        lastUpdate: memoryCache.lastCacheUpdate
      }
    };
    
    res.json({
      success: true,
      data: cacheStatus
    });
  } catch (error) {
    console.error('Error getting cache status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get cache status' 
    });
  }
});

// Debug endpoint untuk memeriksa file path dan data
app.get('/api/debug-files', async (req, res) => {
  try {
    const debugInfo = {
      environment: process.env.NODE_ENV || 'development',
      filePaths: {
        DATA_FILE: process.env.DATA_FILE || './data/anime-data.json',
        CONFIG_FILE: process.env.CONFIG_FILE || './data/config.json',
        ANIME_LIST_FILE: process.env.ANIME_LIST_FILE || './data/anime-list.json',
        LATEST_EPISODES_FILE: process.env.LATEST_EPISODES_FILE || './data/latest-episodes.json'
      },
      serverPaths: {
        DATA_FILE: DATA_FILE,
        CONFIG_FILE: CONFIG_FILE,
        ANIME_LIST_FILE: ANIME_LIST_FILE,
        LATEST_EPISODES_FILE: LATEST_EPISODES_FILE
      },
      fileExists: {},
      fileSizes: {},
      cacheData: {
        latestEpisodes: memoryCache.latestEpisodes ? {
          totalEpisodes: memoryCache.latestEpisodes.latestEpisodes?.length || 0,
          lastUpdated: memoryCache.latestEpisodes.lastUpdated
        } : null,
        animeList: memoryCache.animeList ? {
          totalAnime: memoryCache.animeList.animeList?.length || 0,
          lastUpdated: memoryCache.animeList.lastUpdated
        } : null,
        animeData: memoryCache.animeData ? {
          totalAnime: memoryCache.animeData.anime?.length || 0,
          totalEpisodes: memoryCache.animeData.episodes?.length || 0,
          lastUpdated: memoryCache.animeData.lastUpdated
        } : null
      }
    };

    // Check if files exist and get sizes
    for (const [key, path] of Object.entries(debugInfo.filePaths)) {
      try {
        const exists = await fs.pathExists(path);
        debugInfo.fileExists[key] = exists;
        
        if (exists) {
          const stats = await fs.stat(path);
          debugInfo.fileSizes[key] = {
            size: stats.size,
            sizeInMB: (stats.size / 1024 / 1024).toFixed(2),
            modified: stats.mtime
          };
        } else {
          debugInfo.fileSizes[key] = null;
        }
      } catch (error) {
        debugInfo.fileExists[key] = false;
        debugInfo.fileSizes[key] = { error: error.message };
      }
    }

    res.json({
      success: true,
      data: debugInfo
    });
  } catch (error) {
    console.error('Error getting debug info:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to get debug info',
      error: error.message
    });
  }
});

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
    
    if (!fs.existsSync(LATEST_EPISODES_FILE)) {
      fs.writeJsonSync(LATEST_EPISODES_FILE, {
        latestEpisodes: [],
        totalEpisodes: 0,
        lastUpdated: new Date().toISOString(),
        source: 'https://v1.samehadaku.how/anime-terbaru/'
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

// Simple HLS proxy: rewrite playlist (.m3u8) to route segments (.ts/.m4s) via this proxy
app.get('/api/hls-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    if (!url) {
      return res.status(400).json({ success: false, message: 'Playlist URL is required' });
    }

    const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36';
    const resp = await upstreamAxios.get(url, { headers: { 'User-Agent': ua }, responseType: 'text', validateStatus: () => true });
    if (resp.status >= 400) {
      return res.status(resp.status).json({ success: false, message: 'Upstream error fetching playlist', status: resp.status });
    }

    const playlistText = typeof resp.data === 'string' ? resp.data : resp.data.toString('utf8');
    const baseUrl = new URL(url);
    const rewriteLine = (line) => {
      try {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return line; // comments or tags
        // Absolute URL
        let segmentUrl;
        if (/^https?:\/\//i.test(trimmed)) {
          segmentUrl = trimmed;
        } else if (trimmed.startsWith('/')) {
          segmentUrl = `${baseUrl.protocol}//${baseUrl.host}${trimmed}`;
        } else {
          const dir = url.replace(/[^\/]*$/, '');
          segmentUrl = new URL(trimmed, dir).toString();
        }
        return `${req.protocol}://${req.get('host')}/api/video-proxy?url=${encodeURIComponent(segmentUrl)}`;
      } catch {
        return line;
      }
    };

    const rewritten = playlistText.split(/\r?\n/).map(rewriteLine).join('\n');
    res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
    res.setHeader('Cache-Control', 'no-cache');
    return res.status(200).send(rewritten);
  } catch (err) {
    console.error('Error in HLS proxy:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to proxy HLS playlist' });
  }
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
    const { page = 1, limit = 20, search = '', forceRefresh = false } = req.query;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData('animeData');
      if (cachedData) {
        console.log('Serving anime data from cache');
        
        // Get all episodes from latestEpisodes array (this contains the actual episode data)
        let allEpisodes = cachedData.latestEpisodes || [];
        
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
        
        return res.json({
          anime: paginatedEpisodes,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(allEpisodes.length / limit),
            totalItems: allEpisodes.length,
            itemsPerPage: parseInt(limit)
          },
          fromCache: true
        });
      }
    }
    
    // If no cache or force refresh, read from file
    console.log('Reading anime data from file');
    const data = await fs.readJson(DATA_FILE);
    
    // Cache the data
    setCachedData('animeData', data);
    
    const { page: pageParam = 1, limit: limitParam = 20, search: searchParam = '' } = req.query;
    
    // Get all episodes from latestEpisodes array (this contains the actual episode data)
    let allEpisodes = data.latestEpisodes || [];
    
    // Filter only episodes that have releasedOn (not null)
    allEpisodes = allEpisodes.filter(episode => episode.releasedOn && episode.releasedOn !== null);
    
    // Search functionality
    if (searchParam) {
      allEpisodes = allEpisodes.filter(episode => 
        episode.title.toLowerCase().includes(searchParam.toLowerCase()) ||
        (episode.episodeTitle && episode.episodeTitle.toLowerCase().includes(searchParam.toLowerCase()))
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
    const startIndex = (pageParam - 1) * limitParam;
    const endIndex = startIndex + parseInt(limitParam);
    const paginatedEpisodes = allEpisodes.slice(startIndex, endIndex);
    
    res.json({
      anime: paginatedEpisodes,
      pagination: {
        currentPage: parseInt(pageParam),
        totalPages: Math.ceil(allEpisodes.length / limitParam),
        totalItems: allEpisodes.length,
        itemsPerPage: parseInt(limitParam)
      },
      fromCache: false
    });
  } catch (error) {
    console.error('Error fetching anime:', error);
    res.status(500).json({ error: 'Failed to fetch anime data' });
  }
});



// Manual scrape trigger (admin only) - Runs all three scraping processes
app.post('/api/scrape', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🚀 Starting comprehensive scraping process...');
    
    // Process 1: Main scraping (latest episodes and anime details)
    console.log('📺 Process 1/3: Running main scraping (latest episodes and anime details)...');
    await scraper.scrapeAll();
    console.log('✅ Process 1 completed: Main scraping finished');
    
    // Clear cache to ensure fresh data
    clearCache();
    console.log('🗑️ Cache cleared to ensure fresh data');
    
    // Process 2: Anime list scraping (full catalog)
    console.log('📋 Process 2/3: Running anime list scraping (full catalog)...');
    const animeList = await scraper.scrapeAnimeListBatch(1);
    console.log(`✅ Process 2 completed: Anime list scraping finished - ${animeList.length} anime found`);
    
    // Process 3: Latest episodes scraping (homepage episodes)
    console.log('🎬 Process 3/3: Running latest episodes scraping (homepage episodes)...');
    const latestEpisodes = await scraper.scrapeLatestEpisodesBatch(1);
    console.log(`✅ Process 3 completed: Latest episodes scraping finished - ${latestEpisodes.length} episodes found`);
    
    console.log('🎉 All scraping processes completed successfully!');
    
    const lastUpdated = new Date().toISOString();
    
    res.json({ 
      message: 'All scraping processes completed successfully',
      lastUpdated: lastUpdated,
      summary: {
        mainScraping: 'Completed',
        animeListScraping: `${animeList.length} anime found`,
        latestEpisodesScraping: `${latestEpisodes.length} episodes found`,
        totalProcesses: 3
      }
    });
  } catch (error) {
    console.error('❌ Error during comprehensive scraping:', error);
    res.status(500).json({ error: 'Failed to complete all scraping processes', details: error.message });
  }
});

// Manual scrape trigger for testing (no password required) - Runs all three scraping processes
app.post('/api/scrape-test', async (req, res) => {
  try {
    console.log('🚀 Manual comprehensive scraping triggered via /api/scrape-test');
    
    // Process 1: Main scraping (latest episodes and anime details)
    console.log('📺 Process 1/3: Running main scraping (latest episodes and anime details)...');
    await scraper.scrapeAll();
    console.log('✅ Process 1 completed: Main scraping finished');
    
    // Clear cache to ensure fresh data
    clearCache();
    console.log('🗑️ Cache cleared to ensure fresh data');
    
    // Process 2: Anime list scraping (full catalog)
    console.log('📋 Process 2/3: Running anime list scraping (full catalog)...');
  const animeList = await scraper.scrapeAnimeListBatch(1);
    console.log(`✅ Process 2 completed: Anime list scraping finished - ${animeList.length} anime found`);
    
    // Process 3: Latest episodes scraping (homepage episodes)
    console.log('🎬 Process 3/3: Running latest episodes scraping (homepage episodes)...');
  const latestEpisodes = await scraper.scrapeLatestEpisodesBatch(1);
    console.log(`✅ Process 3 completed: Latest episodes scraping finished - ${latestEpisodes.length} episodes found`);
    
    console.log('🎉 All scraping processes completed successfully!');
    
    const lastUpdated = new Date().toISOString();
    
    res.json({ 
      message: 'All scraping processes completed successfully',
      lastUpdated: lastUpdated,
      summary: {
        mainScraping: 'Completed',
        animeListScraping: `${animeList.length} anime found`,
        latestEpisodesScraping: `${latestEpisodes.length} episodes found`,
        totalProcesses: 3
      }
    });
  } catch (error) {
    console.error('❌ Error during comprehensive scraping:', error);
    res.status(500).json({ error: 'Failed to complete all scraping processes', details: error.message });
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

// Get anime list with pagination
app.get('/api/anime-list', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', forceRefresh = false } = req.query;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData('animeList');
      if (cachedData) {
        console.log('Serving anime list from cache');
        
        let filteredAnime = cachedData.animeList || [];
        
        // Search functionality
        if (search) {
          filteredAnime = filteredAnime.filter(anime => 
            anime.title.toLowerCase().includes(search.toLowerCase()) ||
            (anime.genre && anime.genre.toLowerCase().includes(search.toLowerCase()))
          );
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedAnime = filteredAnime.slice(startIndex, endIndex);
        
        return res.json({
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
              totalAnime: cachedData.totalAnime,
              lastUpdated: cachedData.lastUpdated,
              source: cachedData.source,
              fromCache: true
            }
          }
        });
      }
    }
    
    // If no cache or force refresh, read from file
    console.log('Reading anime list from file');
    const animeListFile = process.env.ANIME_LIST_FILE || './data/anime-list.json';
    
    let animeData;
    try {
      const exists = await fs.pathExists(animeListFile);
      if (!exists) {
        animeData = {
          animeList: [],
          totalAnime: 0,
          lastUpdated: new Date().toISOString(),
          source: 'https://v1.samehadaku.how/daftar-anime-2/'
        };
        await fs.writeJson(animeListFile, animeData, { spaces: 2 });
      } else {
        // Use readFile instead of readJson for better performance
        const fileContent = await fs.readFile(animeListFile, 'utf8');
        animeData = JSON.parse(fileContent);
      }
      
      // Cache the data
      setCachedData('animeList', animeData);
      
    } catch (e) {
      console.error('Error reading anime list file:', e);
      animeData = {
        animeList: [],
        totalAnime: 0,
        lastUpdated: new Date().toISOString(),
        source: 'https://v1.samehadaku.how/daftar-anime-2/'
      };
    }
    
    let filteredAnime = animeData.animeList || [];
    
    // Search functionality
    if (search) {
      filteredAnime = filteredAnime.filter(anime => 
        anime.title.toLowerCase().includes(search.toLowerCase()) ||
        (anime.genre && anime.genre.toLowerCase().includes(search.toLowerCase()))
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
          source: animeData.source,
          fromCache: false
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

// Get latest episodes with pagination (for homepage)
app.get('/api/latest-episodes', async (req, res) => {
  try {
    const { page = 1, limit = 20, search = '', forceRefresh = false } = req.query;
    
    // Check cache first (unless force refresh)
    if (!forceRefresh) {
      const cachedData = getCachedData('latestEpisodes');
      if (cachedData && cachedData.latestEpisodes && cachedData.latestEpisodes.length > 0) {
        console.log('Serving latest episodes from cache');
        
        let filteredEpisodes = cachedData.latestEpisodes || [];
        
        // Search functionality
        if (search) {
          filteredEpisodes = filteredEpisodes.filter(episode => 
            episode.title.toLowerCase().includes(search.toLowerCase()) ||
            (episode.postedBy && episode.postedBy.toLowerCase().includes(search.toLowerCase()))
          );
        }
        
        // Pagination
        const startIndex = (page - 1) * limit;
        const endIndex = startIndex + parseInt(limit);
        const paginatedEpisodes = filteredEpisodes.slice(startIndex, endIndex);
        
        return res.json({
          success: true,
          data: {
            episodes: paginatedEpisodes,
            pagination: {
              currentPage: parseInt(page),
              totalPages: Math.ceil(filteredEpisodes.length / limit),
              totalItems: filteredEpisodes.length,
              itemsPerPage: parseInt(limit)
            },
            summary: {
              totalEpisodes: cachedData.totalEpisodes,
              lastUpdated: cachedData.lastUpdated,
              source: cachedData.source,
              fromCache: true
            }
          }
        });
      }
    }
    
    // If no cache or force refresh, read from file
    console.log('Reading latest episodes from file');
    const latestEpisodesFile = process.env.LATEST_EPISODES_FILE || './data/latest-episodes.json';
    
    let episodesData;
    try {
      const exists = await fs.pathExists(latestEpisodesFile);
      if (!exists) {
        console.log(`File not found: ${latestEpisodesFile}`);
        
        // Try alternative paths for production
        const alternativePaths = [
          '/tmp/latest-episodes.json',
          './data/latest-episodes.json',
          './latest-episodes.json'
        ];
        
        let foundFile = null;
        for (const altPath of alternativePaths) {
          if (await fs.pathExists(altPath)) {
            foundFile = altPath;
            console.log(`Found alternative file: ${altPath}`);
            break;
          }
        }
        
        if (foundFile) {
          const fileContent = await fs.readFile(foundFile, 'utf8');
          episodesData = JSON.parse(fileContent);
          console.log(`Loaded from alternative path: ${foundFile}`);
        } else {
          console.log('No alternative files found, creating empty data');
          episodesData = {
            latestEpisodes: [],
            totalEpisodes: 0,
            lastUpdated: new Date().toISOString(),
            source: 'https://v1.samehadaku.how/anime-terbaru/'
          };
        }
      } else {
        // Use readFile instead of readJson for better performance
        const fileContent = await fs.readFile(latestEpisodesFile, 'utf8');
        episodesData = JSON.parse(fileContent);
        console.log(`Loaded from primary path: ${latestEpisodesFile}`);
      }
      
      // Validate data structure
      if (!episodesData.latestEpisodes || !Array.isArray(episodesData.latestEpisodes)) {
        console.log('Invalid data structure, resetting to empty');
        episodesData = {
          latestEpisodes: [],
          totalEpisodes: 0,
          lastUpdated: new Date().toISOString(),
          source: 'https://v1.samehadaku.how/anime-terbaru/'
        };
      }
      
      // Cache the data
      setCachedData('latestEpisodes', episodesData);
      
    } catch (e) {
      console.error('Error reading latest episodes file:', e);
      episodesData = {
        latestEpisodes: [],
        totalEpisodes: 0,
        lastUpdated: new Date().toISOString(),
        source: 'https://v1.samehadaku.how/anime-terbaru/'
      };
    }
    
    let filteredEpisodes = episodesData.latestEpisodes || [];
    
    // Search functionality
    if (search) {
      filteredEpisodes = filteredEpisodes.filter(episode => 
        episode.title.toLowerCase().includes(search.toLowerCase()) ||
        (episode.postedBy && episode.postedBy.toLowerCase().includes(search.toLowerCase()))
      );
    }
    
    // Pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + parseInt(limit);
    const paginatedEpisodes = filteredEpisodes.slice(startIndex, endIndex);
    
    res.json({
      success: true,
      data: {
        episodes: paginatedEpisodes,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(filteredEpisodes.length / limit),
          totalItems: filteredEpisodes.length,
          itemsPerPage: parseInt(limit)
        },
        summary: {
          totalEpisodes: episodesData.totalEpisodes,
          lastUpdated: episodesData.lastUpdated,
          source: episodesData.source,
          fromCache: false
        }
      }
    });
  } catch (error) {
    console.error('Error fetching latest episodes:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch latest episodes' 
    });
  }
});

// Manual latest episodes scraping trigger (admin only)
app.post('/api/scrape-latest-episodes', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('Manual latest episodes scraping triggered');
    // Use unlimited pages
    const latestEpisodes = await scraper.scrapeLatestEpisodesBatch(1);
    const result = await scraper.saveLatestEpisodes(latestEpisodes);
    
    // Clear cache to ensure fresh data
    clearCache();
    console.log('🗑️ Cache cleared to ensure fresh data');
    
    res.json({ 
      success: true,
      message: 'Latest episodes scraping completed successfully',
      data: {
        totalEpisodes: result.totalEpisodes,
        lastUpdated: result.lastUpdated,
        pagesScraped: '1-*'
      }
    });
  } catch (error) {
    console.error('Error during latest episodes scraping:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to scrape latest episodes' 
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
    // Use unlimited pages
    const animeList = await scraper.scrapeAnimeListBatch(1);
    const result = await scraper.saveAnimeList(animeList);
    
    // Clear cache to ensure fresh data
    clearCache();
    console.log('🗑️ Cache cleared to ensure fresh data');
    
    res.json({ 
      success: true,
      message: 'Anime list scraping completed successfully',
      data: {
        totalAnime: result.totalAnime,
        lastUpdated: result.lastUpdated,
        pagesScraped: '1-*'
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
    const { password, startPage = 1, endPage = null } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`Manual batch anime list scraping triggered: pages ${startPage}-${endPage}`);
    
    // Use batch scraping with specified range (if endPage null, will go until no more pages)
    const animeList = await scraper.scrapeAnimeListBatch(parseInt(startPage), endPage ? parseInt(endPage) : null);
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

// Test batch latest episodes scraping with specific page range (admin only)
app.post('/api/scrape-latest-episodes-batch', async (req, res) => {
  try {
    const { password, startPage = 1, endPage = null } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log(`Manual batch latest episodes scraping triggered: pages ${startPage}-${endPage}`);
    
    // Use batch scraping with specified range
    const latestEpisodes = await scraper.scrapeLatestEpisodesBatch(parseInt(startPage), endPage ? parseInt(endPage) : null);
    const result = await scraper.saveLatestEpisodes(latestEpisodes);
    
    // Clear cache to ensure fresh data
    clearCache();
    console.log('🗑️ Cache cleared to ensure fresh data');
    
    res.json({ 
      success: true,
      message: `Latest episodes batch scraping completed successfully for pages ${startPage}-${endPage}`,
      data: {
        totalEpisodes: result.totalEpisodes,
        lastUpdated: result.lastUpdated,
        pagesScraped: `${startPage}-${endPage}`
      }
    });
  } catch (error) {
    console.error('Error in batch latest episodes scraping:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to scrape latest episodes',
      details: error.message 
    });
  }
});

// Force refresh data endpoint (admin only)
app.post('/api/force-refresh', async (req, res) => {
  try {
    const { password } = req.body;
    
    if (password !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    
    console.log('🔄 Force refresh triggered - clearing cache and reloading data');
    
    // Clear cache first
    clearCache();
    
    // Force reload data from files
    const latestEpisodesFile = process.env.LATEST_EPISODES_FILE || './data/latest-episodes.json';
    const animeListFile = process.env.ANIME_LIST_FILE || './data/anime-list.json';
    const dataFile = process.env.DATA_FILE || './data/anime-data.json';
    
    let refreshResults = {
      latestEpisodes: null,
      animeList: null,
      animeData: null,
      errors: []
    };
    
    // Try to reload latest episodes
    try {
      if (await fs.pathExists(latestEpisodesFile)) {
        const fileContent = await fs.readFile(latestEpisodesFile, 'utf8');
        const data = JSON.parse(fileContent);
        setCachedData('latestEpisodes', data);
        refreshResults.latestEpisodes = {
          totalEpisodes: data.latestEpisodes?.length || 0,
          lastUpdated: data.lastUpdated,
          fileSize: (fileContent.length / 1024 / 1024).toFixed(2) + ' MB'
        };
        console.log(`✅ Latest episodes reloaded: ${data.latestEpisodes?.length || 0} episodes`);
      } else {
        refreshResults.errors.push(`Latest episodes file not found: ${latestEpisodesFile}`);
      }
    } catch (error) {
      refreshResults.errors.push(`Error reloading latest episodes: ${error.message}`);
    }
    
    // Try to reload anime list
    try {
      if (await fs.pathExists(animeListFile)) {
        const fileContent = await fs.readFile(animeListFile, 'utf8');
        const data = JSON.parse(fileContent);
        setCachedData('animeList', data);
        refreshResults.animeList = {
          totalAnime: data.animeList?.length || 0,
          lastUpdated: data.lastUpdated,
          fileSize: (fileContent.length / 1024 / 1024).toFixed(2) + ' MB'
        };
        console.log(`✅ Anime list reloaded: ${data.animeList?.length || 0} anime`);
      } else {
        refreshResults.errors.push(`Anime list file not found: ${animeListFile}`);
      }
    } catch (error) {
      refreshResults.errors.push(`Error reloading anime list: ${error.message}`);
    }
    
    // Try to reload anime data
    try {
      if (await fs.pathExists(dataFile)) {
        const fileContent = await fs.readFile(dataFile, 'utf8');
        const data = JSON.parse(fileContent);
        setCachedData('animeData', data);
        refreshResults.animeData = {
          totalAnime: data.anime?.length || 0,
          totalEpisodes: data.episodes?.length || 0,
          lastUpdated: data.lastUpdated,
          fileSize: (fileContent.length / 1024 / 1024).toFixed(2) + ' MB'
        };
        console.log(`✅ Anime data reloaded: ${data.anime?.length || 0} anime, ${data.episodes?.length || 0} episodes`);
      } else {
        refreshResults.errors.push(`Anime data file not found: ${dataFile}`);
      }
    } catch (error) {
      refreshResults.errors.push(`Error reloading anime data: ${error.message}`);
    }
    
    res.json({ 
      success: true,
      message: 'Force refresh completed',
      timestamp: new Date().toISOString(),
      results: refreshResults
    });
    
  } catch (error) {
    console.error('Error during force refresh:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to force refresh',
      error: error.message
    });
  }
});

// Video proxy endpoint to handle CORS issues
app.get('/api/video-proxy', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video URL is required' 
      });
    }

    console.log(`Proxying video request to: ${url}`);

    // Set CORS headers for video streaming
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Accept-Ranges, Content-Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Type, Accept-Ranges, Content-Range, ETag, Last-Modified');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    // COEP can break cross-origin media; better omit or relax for video
    // res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');

    // Handle HEAD requests for video metadata
    if (req.method === 'HEAD') {
      try {
        const headResponse = await upstreamAxios.head(url, {
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Range': req.headers.range || 'bytes=0-'
          }
        });

        // Forward selective headers for metadata probing
        const headersToForward = ['accept-ranges', 'content-length', 'content-type', 'etag', 'last-modified'];
        headersToForward.forEach(h => {
          if (headResponse.headers[h]) res.setHeader(h, headResponse.headers[h]);
        });

        res.status(200).end();
        return;
      } catch (error) {
        console.error('Error in HEAD request:', error.message);
        res.status(500).json({ 
          success: false, 
          message: 'Failed to fetch video metadata' 
        });
        return;
      }
    }

    // Handle GET requests for video streaming
    try {
      const upstreamHeaders = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Referer': 'https://v1.samehadaku.how/',
        'Accept-Encoding': 'identity'
      };
      if (req.headers.range) {
        upstreamHeaders['Range'] = req.headers.range;
      }

      const videoResponse = await upstreamAxios.get(url, {
        timeout: 30000,
        responseType: 'stream',
        headers: upstreamHeaders,
        validateStatus: () => true // allow 206/200/etc without throwing
      });

      // Forward critical headers selectively
      const headersToForward = [
        'accept-ranges',
        'content-length',
        'content-type',
        'content-range',
        'etag',
        'last-modified'
      ];
      headersToForward.forEach(h => {
        const v = videoResponse.headers[h];
        if (v) res.setHeader(h, v);
      });

      // Set content type for video
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'video/mp4');
      }

      // Caching hint untuk segmen/chunk berulang dan koneksi stabil
      res.setHeader('Cache-Control', 'public, max-age=3600, immutable');
      res.setHeader('Accept-Ranges', videoResponse.headers['accept-ranges'] || 'bytes');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no');

      // Mirror upstream status (200 atau 206) dan kirim header early
      res.status(videoResponse.status === 206 ? 206 : 200);
      res.setHeader('Vary', 'Range');
      if (typeof res.flushHeaders === 'function') {
        res.flushHeaders();
      }

      // Pipe with backpressure; handle client aborts
      videoResponse.data.on('error', (err) => {
        console.error('Upstream stream error:', err.message);
        if (!res.headersSent) {
          res.status(502).end();
        } else {
          res.end();
        }
      });
      req.on('close', () => {
        if (videoResponse.data.destroy) videoResponse.data.destroy();
      });
      videoResponse.data.pipe(res);

    } catch (error) {
      console.error('Error streaming video:', error.message);
      
      // If it's a CORS error, try to provide a more helpful response
      if (error.code === 'ECONNREFUSED' || error.message.includes('CORS')) {
        res.status(403).json({
          success: false,
          message: 'Video access blocked by CORS policy. Try using the proxy endpoint.',
          originalError: error.message
        });
      } else if (error.response) {
        // Forward upstream error status if present
        res.status(error.response.status).json({
          success: false,
          message: 'Failed to stream video from upstream',
          status: error.response.status
        });
      } else {
        res.status(500).json({
          success: false,
          message: 'Failed to stream video',
          originalError: error.message
        });
      }
    }

  } catch (error) {
    console.error('Error in video proxy:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error in video proxy' 
    });
  }
});

// Video info endpoint to get video metadata without streaming
app.get('/api/video-info', async (req, res) => {
  try {
    const { url } = req.query;
    
    if (!url) {
      return res.status(400).json({ 
        success: false, 
        message: 'Video URL is required' 
      });
    }

    console.log(`Getting video info for: ${url}`);

    try {
      const response = await upstreamAxios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://v1.samehadaku.how/'
        }
      });

      const videoInfo = {
        url: url,
        contentType: response.headers['content-type'] || 'video/mp4',
        contentLength: response.headers['content-length'],
        acceptRanges: response.headers['accept-ranges'],
        contentRange: response.headers['content-range'],
        lastModified: response.headers['last-modified'],
        etag: response.headers['etag'],
        accessible: true
      };

      res.json({
        success: true,
        data: videoInfo
      });

    } catch (error) {
      console.error('Error getting video info:', error.message);
      
      res.json({
        success: false,
        data: {
          url: url,
          accessible: false,
          error: error.message
        }
      });
    }

  } catch (error) {
    console.error('Error in video info endpoint:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error in video info endpoint' 
    });
  }
});

// Get processed video URL with proxy
app.get('/api/video-url', async (req, res) => {
  try {
    const { originalUrl } = req.query;
    
    if (!originalUrl) {
      return res.status(400).json({ 
        success: false, 
        message: 'Original video URL is required' 
      });
    }

    console.log(`Processing video URL: ${originalUrl}`);

    // Check if the video is accessible
    try {
      const videoInfoResponse = await upstreamAxios.head(originalUrl, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Referer': 'https://v1.samehadaku.how/'
        }
      });

      // If video is accessible, return proxy URL
      const proxyUrl = `${req.protocol}://${req.get('host')}/api/video-proxy?url=${encodeURIComponent(originalUrl)}`;
      
      res.json({
        success: true,
        data: {
          originalUrl: originalUrl,
          proxyUrl: proxyUrl,
          accessible: true,
          contentType: videoInfoResponse.headers['content-type'] || 'video/mp4',
          contentLength: videoInfoResponse.headers['content-length']
        }
      });

    } catch (error) {
      console.error('Video not accessible:', error.message);
      
      res.json({
        success: false,
        data: {
          originalUrl: originalUrl,
          accessible: false,
          error: error.message,
          message: 'Video may be blocked by CORS or not accessible'
        }
      });
    }

  } catch (error) {
    console.error('Error processing video URL:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Internal server error processing video URL' 
    });
  }
});

// Debug endpoint untuk mengecek status cron job
app.get('/api/cron-status', async (req, res) => {
  try {
    const now = new Date();
    const serverTime = {
      utc: now.toISOString(),
      local: now.toString(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      hours: now.getHours(),
      minutes: now.getMinutes(),
      seconds: now.getSeconds()
    };

    // Calculate next midnight
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const cronStatus = {
      serverTime: serverTime,
      nextMidnight: tomorrow.toISOString(),
      timeUntilNext: tomorrow.getTime() - now.getTime(),
      cronExpression: '0 0 * * *',
      isPastMidnight: now.getHours() >= 0 && now.getMinutes() >= 0
    };

    res.json({
      message: 'Cron job status',
      cronStatus: cronStatus,
      scraperInitialized: !!scraper,
      isScraping: scraper ? scraper.isScraping : false
    });
  } catch (error) {
    console.error('Error checking cron status:', error);
    res.status(500).json({ error: 'Failed to check cron status' });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`GitAnime API server running on port ${PORT}`);
  console.log(`