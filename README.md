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

### Health Check
- `GET /health` - Status kesehatan API
- `GET /api/health` - Status kesehatan API (alternatif)

### Episode Terbaru
- `GET /api/latest` - Episode terbaru (dikelompokkan per anime)
- `GET /api/anime` - Anime dengan episode terbaru (filtered by releasedOn)
- **NEW**: `GET /api/latest-episodes` - Episode terbaru dengan pagination untuk halaman depan
  - Query params: `page`, `limit`, `search`, `forceRefresh`
  - Scrapes dari: `https://v1.samehadaku.how/anime-terbaru/` (pages 1-10)

### Katalog Anime
- `GET /api/anime-list` - Katalog anime lengkap dengan pagination
  - Query params: `page`, `limit`, `search`, `forceRefresh`
  - Scrapes dari: `https://v1.samehadaku.how/daftar-anime-2/` (pages 1-10)

### Detail Anime
- `GET /api/anime-detail?url=<anime_url>` - Detail anime atau episode
- `GET /api/episode-video?url=<episode_url>` - Video player data

### Admin Endpoints (memerlukan password)
- `POST /api/scrape` - Manual scraping episode terbaru
- `POST /api/scrape-anime-list` - Manual scraping katalog anime
- **NEW**: `POST /api/scrape-latest-episodes` - Manual scraping episode terbaru untuk homepage
- `POST /api/scrape-anime-list-batch` - Batch scraping katalog anime dengan range halaman
- **NEW**: `POST /api/scrape-latest-episodes-batch` - Batch scraping episode terbaru dengan range halaman

### Debug Endpoints
- `GET /api/debug` - Status file data
- `GET /api/raw-data` - Raw data content
- `GET /api/scrape-test` - Test scraping tanpa password

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
