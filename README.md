# GitAnime Backend

Backend API untuk platform streaming anime GitAnime dengan fitur scraping otomatis dari Samehadaku.

## Fitur

- ✅ Scraping otomatis episode terbaru dari Samehadaku
- ✅ Scraping katalog anime lengkap dengan pagination
- ✅ **NEW**: Scraping episode terbaru dengan pagination untuk halaman depan
- ✅ Auto-refresh data setiap 24 jam
- ✅ CORS support untuk frontend
- ✅ Health check endpoint
- ✅ Admin endpoints untuk manual scraping

## API Endpoints

### Core Endpoints
- `GET /api/latest` - Get latest episodes grouped by anime
- `GET /api/anime` - Get newly released anime episodes (filtered by releasedOn)
- `GET /api/anime-list` - Get full anime catalog with pagination
- `GET /api/latest-episodes` - Get latest episodes for homepage with pagination
- `GET /api/anime-detail?url=<anime_url>` - Get detailed anime information
- `GET /api/episode-detail?url=<episode_url>` - Get detailed episode information

### Video Streaming Endpoints (CORS Solution)
- `GET /api/video-proxy?url=<video_url>` - Proxy video streaming to bypass CORS
- `GET /api/video-info?url=<video_url>` - Get video metadata without streaming
- `GET /api/video-url?originalUrl=<video_url>` - Get processed video URL with proxy

### Admin Endpoints (Require ADMIN_PASSWORD)
- `POST /api/scrape` - Manual trigger for main scraping
- `POST /api/scrape-anime-list` - Manual trigger for anime list scraping
- `POST /api/scrape-anime-list-batch` - Manual batch scraping with page range
- `POST /api/scrape-latest-episodes` - Manual trigger for latest episodes scraping
- `POST /api/scrape-latest-episodes-batch` - Manual batch latest episodes scraping

### Debug/Test Endpoints
- `GET /health` - Health check endpoint
- `GET /api/debug` - Debug data file status
- `GET /api/raw-data` - Get raw data file content
- `GET /api/scrape-test` - Test scraping without password

## Video Streaming Solution

Untuk mengatasi masalah CORS saat memutar video dari `wibufile.com` atau provider video lainnya, backend menyediakan sistem proxy:

### Cara Penggunaan:

1. **Gunakan endpoint proxy untuk video:**
   ```
   GET /api/video-proxy?url=https://api.wibufile.com/embed/bf0c0d08-1829-43e5-bfba-1f8292f8278c
   ```

2. **Cek aksesibilitas video:**
   ```
   GET /api/video-info?url=https://api.wibufile.com/embed/bf0c0d08-1829-43e5-bfba-1f8292f8278c
   ```

3. **Dapatkan URL proxy yang sudah diproses:**
   ```
   GET /api/video-url?originalUrl=https://api.wibufile.com/embed/bf0c0d08-1829-43e5-bfba-1f8292f8278c
   ```

### Fitur Proxy:
- ✅ Mengatasi masalah CORS
- ✅ Support video streaming dengan range requests
- ✅ Forward headers dari server video asli
- ✅ Error handling yang informatif
- ✅ Timeout protection

## Scraping Schedule

- **12:00 AM**: Scraping episode terbaru (existing)
- **1:00 AM**: Scraping katalog anime (existing)  
- **2:00 AM**: Scraping episode terbaru untuk homepage (**NEW**)

## Environment Variables

```env
NODE_ENV=production
PORT=5000
ADMIN_PASSWORD=your_admin_password
SAMEHADAKU_URL=https://v1.samehadaku.how/
```

## Data Files

- `anime-data.json` - Data episode terbaru dan anime
- `anime-list.json` - Katalog anime lengkap
- **NEW**: `latest-episodes.json` - Episode terbaru untuk homepage dengan pagination

## Deployment

### Render.com
- Build Command: `npm run build`
- Start Command: `npm start`
- Environment: Node.js 18+

### Local Development
```bash
npm install
npm start
```

## CORS Origins

Frontend domains yang diizinkan:
- `http://localhost:3000`
- `http://localhost:3001` 
- `http://localhost:5173`
- `https://gitanime-web.vercel.app`
- `https://gitanime-backend.onrender.com`
- Dan domain Vercel lainnya

## Struktur Data

### Latest Episodes (Homepage)
```json
{
  "latestEpisodes": [
    {
      "id": "anime-title-episode-number",
      "title": "Anime Title",
      "episodeNumber": "1",
      "link": "https://v1.samehadaku.how/anime/anime-title/",
      "postedBy": "Uploader",
      "releasedOn": "2 days yang lalu",
      "animeId": "anime-title",
      "image": "https://cdn.myanimelist.net/images/anime/...",
      "episodeScreenshot": "https://cdn.myanimelist.net/images/anime/...",
      "createdAt": "2025-08-08T14:47:15.145Z",
      "pageNumber": 1
    }
  ],
  "totalEpisodes": 160,
  "lastUpdated": "2025-08-08T14:47:15.151Z",
  "source": "https://v1.samehadaku.how/anime-terbaru/"
}
```

## License

MIT License
