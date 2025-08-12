# Scraping Semua Halaman Samehadaku

Dokumen ini menjelaskan cara menggunakan fitur scraping otomatis yang akan melanjutkan sampai semua halaman di Samehadaku habis.

## Fitur Baru

### 1. Scraping Otomatis Semua Halaman
- **Sebelumnya**: Hanya bisa scrape maksimal 10 halaman
- **Sekarang**: Bisa scrape sampai tidak ada lagi halaman yang ditemukan
- **Fungsi**: `scrapeAllPages()` - scraping komprehensif semua data

### 2. Fungsi yang Diperbarui
- `scrapeAnimeList()` - Sekarang bisa scrape sampai halaman terakhir
- `scrapeAnimeListBatch()` - Bisa scrape batch tanpa batas halaman
- `scrapeLatestEpisodesBatch()` - Bisa scrape episode sampai halaman terakhir

## Cara Penggunaan

### 1. Scraping Semua Halaman Sekaligus
```bash
node scrape-all-pages.js
```

### 2. Test Scraping Semua Halaman
```bash
node test-scrape-all-pages.js
```

### 3. Scraping Manual dengan Progress
```javascript
const scraper = require('./scraper');

// Scrape semua halaman anime list
const allAnime = await scraper.scrapeAnimeList();

// Scrape semua halaman latest episodes
const allEpisodes = await scraper.scrapeLatestEpisodesBatch();

// Scrape komprehensif (semua data)
const result = await scraper.scrapeAllPages();
```

## Fitur Otomatis

### Deteksi Halaman Terakhir
- Sistem akan otomatis mendeteksi ketika tidak ada lagi halaman
- Berhenti scraping ketika `animeEntries.length === 0`
- Update `maxPages` ke halaman terakhir yang ditemukan

### Progress Monitoring
- Log detail untuk setiap halaman
- Informasi jumlah anime/episode per halaman
- Waktu yang dibutuhkan untuk setiap fase

### Error Handling
- Continue ke halaman berikutnya jika ada error
- Retry mechanism untuk API calls
- Graceful fallback jika scraping gagal

## Output Files

### 1. Anime List
- **File**: `./data/anime-list.json`
- **Content**: Semua anime dari semua halaman
- **Format**: JSON dengan metadata lengkap

### 2. Latest Episodes
- **File**: `./data/latest-episodes.json`
- **Content**: Semua episode dari semua halaman
- **Format**: JSON dengan informasi episode lengkap

## Konfigurasi

### Environment Variables
```bash
SAMEHADAKU_URL=https://v1.samehadaku.how/
DATA_FILE=./data/anime-data.json
ANIME_LIST_FILE=./data/anime-list.json
LATEST_EPISODES_FILE=./data/latest-episodes.json
```

### Delay Settings
- **Antar halaman**: 2 detik (production)
- **Antar request**: 500ms (development)
- **Timeout**: 45 detik per request

## Monitoring dan Logs

### Log Format
```
=== Scraping page X/Y ===
URL: https://v1.samehadaku.how/daftar-anime-2/page/X/
Found X anime entries on page X
Added X new anime from page X
Moving to page X+1...
```

### Progress Indicators
- ✅ Halaman berhasil di-scrape
- ❌ Error pada halaman tertentu
- ⚠️ Duplikat data ditemukan
- 🔄 Retry mechanism aktif

## Troubleshooting

### 1. Jika Scraping Berhenti Terlalu Cepat
- Cek koneksi internet
- Cek apakah website Samehadaku bisa diakses
- Cek log untuk error messages

### 2. Jika Data Tidak Lengkap
- Jalankan ulang dengan `scrapeAllPages()`
- Cek file output untuk data yang sudah ada
- Monitor log untuk halaman yang gagal

### 3. Jika Timeout Terlalu Sering
- Increase timeout value di kode
- Kurangi delay antar halaman
- Cek performa server Samehadaku

## Performance Tips

### 1. Untuk Scraping Besar
- Jalankan di waktu off-peak
- Monitor memory usage
- Gunakan batch processing

### 2. Untuk Development
- Test dengan halaman terbatas dulu
- Gunakan delay yang lebih lama
- Monitor network requests

### 3. Untuk Production
- Schedule scraping di waktu tertentu
- Implement rate limiting
- Monitor error rates

## Contoh Output

```json
{
  "animeList": [
    {
      "id": "anime-title",
      "title": "Anime Title",
      "link": "https://...",
      "imageUrl": "https://...",
      "rating": "8.5",
      "status": "Ongoing",
      "type": "TV",
      "genres": ["Action", "Adventure"],
      "description": "Anime description...",
      "episodeInfo": "24 Episodes",
      "scrapedAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "totalAnime": 1500,
  "lastUpdated": "2024-01-01T00:00:00.000Z",
  "source": "https://v1.samehadaku.how/daftar-anime-2/"
}
```

## Kesimpulan

Dengan fitur baru ini, Anda bisa:
1. **Scrape semua halaman** tanpa batas manual
2. **Monitor progress** secara real-time
3. **Handle errors** dengan graceful fallback
4. **Save data lengkap** ke file terpisah
5. **Optimize performance** dengan delay yang sesuai

Fitur ini sangat berguna untuk:
- Data mining komprehensif
- Backup data lengkap
- Research dan analisis
- Development dan testing
