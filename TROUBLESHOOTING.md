# Troubleshooting GitAnime Backend API

## Masalah yang Sering Ditemui

### 1. API Loading Sangat Lambat

**Gejala:**
- Response time API > 10 detik
- Loading spinner berputar lama
- Timeout error

**Penyebab:**
- File reading langsung dari disk setiap request
- Tidak ada caching mechanism
- File system operations di cloud environment lambat

**Solusi yang Telah Diimplementasikan:**
- ✅ In-memory caching dengan expiry 5 menit
- ✅ Optimized file reading menggunakan `fs.readFile` + `JSON.parse`
- ✅ Cache invalidation otomatis saat scraping selesai

**Cara Menggunakan:**
```bash
# Check cache status
GET /api/cache-status

# Force refresh data (bypass cache)
GET /api/latest-episodes?forceRefresh=true

# Clear cache manual (admin only)
POST /api/clear-cache
Body: { "password": "your_admin_password" }
```

### 2. CORS Preflight Missing Error

**Gejala:**
- Error: "CORS preflight missing"
- Request blocked oleh browser
- Preflight OPTIONS request gagal

**Penyebab:**
- CORS configuration tidak lengkap
- Preflight handling tidak proper
- Domain tidak diizinkan

**Solusi yang Telah Diimplementasikan:**
- ✅ CORS configuration lengkap dengan semua method dan header
- ✅ Preflight handling untuk semua route
- ✅ Specific preflight handling untuk route utama
- ✅ Domain whitelist yang lengkap

**Domain yang Diizinkan:**
```javascript
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001', 
  'http://localhost:5173',
  'https://gitanime-web.vercel.app',
  'https://frontend-*.vercel.app',
  'https://gitanime-backend.onrender.com'
];
```

### 3. Performance Optimization

**Cache Strategy:**
- **Cache Expiry:** 5 menit
- **Cache Keys:** latestEpisodes, animeList, animeData
- **Auto Invalidation:** Setiap scraping selesai
- **Memory Usage:** Minimal (hanya data yang diperlukan)

**File Reading Optimization:**
- Gunakan `fs.readFile` + `JSON.parse` daripada `fs.readJson`
- Async/await untuk non-blocking operations
- Error handling yang robust

**Response Time Target:**
- **Cached Response:** < 100ms
- **File Read Response:** < 500ms
- **Search + Pagination:** < 200ms

## Monitoring dan Debugging

### 1. Check API Health
```bash
GET /health
GET /api/health
```

### 2. Check Cache Status
```bash
GET /api/cache-status
```

### 3. Check Cron Job Status
```bash
GET /api/cron-status
```

### 4. Force Refresh Data
```bash
# Bypass cache untuk data terbaru
GET /api/latest-episodes?forceRefresh=true&page=1&limit=20
GET /api/anime-list?forceRefresh=true&page=1&limit=20
GET /api/anime?forceRefresh=true&page=1&limit=20
```

## Environment Variables

**Wajib:**
```bash
NODE_ENV=production
ADMIN_PASSWORD=your_secure_password
```

**Opsional:**
```bash
PORT=5000
CACHE_EXPIRY=300000
SAMEHADAKU_URL=https://v1.samehadaku.how/
```

## Deployment Checklist

### Render.com
- [ ] Set `NODE_ENV=production`
- [ ] Set `ADMIN_PASSWORD` yang aman
- [ ] Restart service setelah update environment variables
- [ ] Monitor logs untuk error

### Vercel
- [ ] Set environment variables di dashboard
- [ ] Deploy dengan build command yang benar
- [ ] Check function logs untuk error

## Performance Metrics

**Target Response Time:**
- Health Check: < 50ms
- Cached API: < 100ms  
- File Read API: < 500ms
- Search + Filter: < 200ms

**Cache Hit Rate Target:**
- > 80% untuk request yang sama dalam 5 menit
- Auto refresh setiap scraping selesai

## Troubleshooting Commands

### 1. Test API Response
```bash
# Test latest episodes
curl "https://gitanime-backend.onrender.com/api/latest-episodes?page=1&limit=20"

# Test with CORS headers
curl -H "Origin: https://gitanime-web.vercel.app" \
     "https://gitanime-backend.onrender.com/api/latest-episodes?page=1&limit=20"
```

### 2. Test Cache
```bash
# First request (should be slow)
time curl "https://gitanime-backend.onrender.com/api/latest-episodes?page=1&limit=20"

# Second request (should be fast - cached)
time curl "https://gitanime-backend.onrender.com/api/latest-episodes?page=1&limit=20"

# Force refresh (bypass cache)
time curl "https://gitanime-backend.onrender.com/api/latest-episodes?page=1&limit=20&forceRefresh=true"
```

### 3. Monitor Logs
```bash
# Check Render.com logs
# Check Vercel function logs
# Monitor response time patterns
```

## Common Issues & Solutions

### Issue: Cache tidak berfungsi
**Solution:** 
- Check `/api/cache-status`
- Restart service
- Clear cache manual

### Issue: CORS masih error
**Solution:**
- Check domain di whitelist
- Restart service
- Verify preflight handling

### Issue: API masih lambat
**Solution:**
- Check cache hit rate
- Monitor file size
- Optimize data structure

## Support

Jika masih mengalami masalah:
1. Check logs di Render.com/Vercel dashboard
2. Test dengan endpoint `/api/cache-status`
3. Verify environment variables
4. Restart service
5. Contact developer dengan error details
