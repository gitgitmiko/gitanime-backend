# Deployment Guide untuk GitAnime Backend

## Deployment ke Render.com

### Langkah-langkah Deployment:

1. **Login ke Render.com**
   - Buka https://render.com
   - Login dengan akun GitHub Anda

2. **Create New Web Service**
   - Klik "New +" → "Web Service"
   - Connect repository GitHub: `gitgitmiko/gitanime-backend`
   - Pilih branch: `main`

3. **Konfigurasi Service**
   - **Name**: `gitanime-backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: `Free`

4. **Environment Variables**
   Tambahkan environment variables berikut:
   ```
   NODE_ENV=production
   PORT=10000
   ADMIN_PASSWORD=your_secure_password_here
   ```

5. **Advanced Settings**
   - **Health Check Path**: `/health`
   - **Auto-Deploy**: Enabled

6. **Deploy**
   - Klik "Create Web Service"
   - Tunggu proses build dan deployment selesai

### URL Endpoints Setelah Deployment:

- **Health Check**: `https://your-app-name.onrender.com/health`
- **API Base**: `https://your-app-name.onrender.com/api`
- **Anime List**: `https://your-app-name.onrender.com/api/anime`
- **Latest Updates**: `https://your-app-name.onrender.com/api/latest`

### Troubleshooting:

1. **Build Failed**
   - Pastikan semua dependencies ada di `package.json`
   - Cek log build di Render dashboard

2. **App Crashed**
   - Cek log runtime di Render dashboard
   - Pastikan environment variables sudah benar

3. **CORS Issues**
   - Update CORS configuration di `server.js` untuk domain frontend Anda

### Monitoring:

- Gunakan Render dashboard untuk monitoring
- Cek logs secara berkala
- Monitor health check endpoint

### Update Deployment:

- Setiap push ke branch `main` akan auto-deploy
- Atau manual deploy dari Render dashboard
