# Deploy dan Restart GitAnime Backend

## 🚀 Langkah-langkah Deploy

### 1. Commit dan Push Changes
```bash
# Commit semua perubahan
git add .
git commit -m "feat: implement performance optimization and CORS fixes

- Add in-memory caching for API responses
- Optimize file reading performance
- Fix CORS preflight handling
- Add cache management endpoints
- Improve response time from 10s+ to <100ms"

# Push ke repository
git push origin main
```

### 2. Deploy ke Render.com
```bash
# Render.com akan otomatis deploy dari git push
# Pastikan environment variables sudah diset:

NODE_ENV=production
ADMIN_PASSWORD=your_secure_password_here
```

### 3. Restart Service (Jika Perlu)
```bash
# Di Render.com dashboard:
# 1. Buka project GitAnime Backend
# 2. Klik "Manual Deploy" -> "Deploy latest commit"
# 3. Tunggu deployment selesai
# 4. Service akan otomatis restart
```

## 🔧 Verifikasi Deployment

### 1. Check Service Health
```bash
# Test health endpoint
curl https://gitanime-backend.onrender.com/health

# Expected response:
# {"status":"OK","message":"GitAnime API is running"}
```

### 2. Test Cache Status
```bash
# Check cache status
curl https://gitanime-backend.onrender.com/api/cache-status

# Expected response:
# {"success":true,"data":{"latestEpisodes":{...},"animeList":{...},"animeData":{...}}}
```

### 3. Test API Performance
```bash
# Run performance test script
node test-api-performance.js

# Expected results:
# - First request: ~500ms (from file)
# - Second request: ~50ms (from cache)
# - CORS working properly
```

## 📊 Monitoring Post-Deployment

### 1. Check Logs
```bash
# Di Render.com dashboard:
# 1. Buka project
# 2. Klik tab "Logs"
# 3. Monitor untuk error atau warning
# 4. Look for cache messages:
#    - "Serving latest episodes from cache"
#    - "Reading latest episodes from file"
#    - "Cache cleared to ensure fresh data"
```

### 2. Performance Metrics
```bash
# Target response times:
# - Health Check: < 50ms
# - Cached API: < 100ms
# - File Read API: < 500ms
# - Search + Filter: < 200ms
```

### 3. Cache Hit Rate
```bash
# Monitor cache effectiveness:
# - Check /api/cache-status
# - Look for "fromCache: true" in responses
# - Verify cache expiry (5 minutes)
```

## 🧪 Testing Checklist

### ✅ Basic Functionality
- [ ] Health endpoint responds
- [ ] All API endpoints accessible
- [ ] CORS headers present
- [ ] No 500 errors

### ✅ Performance
- [ ] First request < 1 second
- [ ] Cached request < 100ms
- [ ] Cache working properly
- [ ] Response time improved

### ✅ CORS
- [ ] Preflight requests work
- [ ] Origin headers accepted
- [ ] No CORS errors in browser
- [ ] Frontend can access API

### ✅ Cache Management
- [ ] Cache status endpoint works
- [ ] Cache clearing works (admin)
- [ ] Auto cache invalidation
- [ ] Cache expiry working

## 🚨 Troubleshooting

### Issue: Service tidak start
**Solution:**
1. Check logs di Render.com
2. Verify environment variables
3. Check package.json dependencies
4. Restart service manual

### Issue: Cache tidak berfungsi
**Solution:**
1. Check `/api/cache-status`
2. Verify memory usage
3. Restart service
4. Check for errors in logs

### Issue: CORS masih error
**Solution:**
1. Verify CORS configuration
2. Check domain whitelist
3. Restart service
4. Test preflight requests

### Issue: API masih lambat
**Solution:**
1. Check cache hit rate
2. Monitor file reading
3. Verify optimization applied
4. Check for blocking operations

## 📈 Expected Improvements

### Before Optimization:
- **Response Time:** 10+ seconds
- **File Reading:** Every request
- **Memory Usage:** Low (no cache)
- **CORS:** Basic configuration

### After Optimization:
- **Response Time:** < 100ms (cached), < 500ms (file)
- **File Reading:** Only when cache expires
- **Memory Usage:** Moderate (with cache)
- **CORS:** Full preflight support

## 🔄 Maintenance

### Daily:
- Monitor cache hit rate
- Check response times
- Verify CORS working

### Weekly:
- Review cache performance
- Check memory usage
- Monitor error rates

### Monthly:
- Optimize cache expiry
- Review CORS configuration
- Performance analysis

## 📞 Support

Jika ada masalah setelah deployment:
1. Check logs di Render.com
2. Run `test-api-performance.js`
3. Verify environment variables
4. Contact developer dengan error details
