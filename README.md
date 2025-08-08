# GitAnime Backend

Backend API untuk aplikasi GitAnime yang menyediakan data anime dan fitur scraping.

## Fitur

- API untuk data anime
- Scraping otomatis setiap 6 jam
- Admin panel untuk manajemen
- CORS support untuk frontend

## Deployment

Deploy di Render.com sebagai Web Service dengan Node.js.

### Environment Variables

- `NODE_ENV`: production
- `ADMIN_PASSWORD`: Password untuk admin panel
- `PORT`: 10000

### Build & Start Commands

- Build: `npm install`
- Start: `npm start`

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/latest` - Data anime terbaru
- `GET /api/anime` - Semua data anime
- `PUT /api/config` - Update konfigurasi
- `POST /api/scrape` - Trigger scraping manual
