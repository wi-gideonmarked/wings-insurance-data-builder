# PM2 Deployment Guide for Structure Editor React App

This guide explains how to deploy your React + Vite application using PM2.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **PM2** installed globally: `npm install -g pm2`
3. **Dependencies** installed: `npm install`

## Configuration Files

- **`ecosystem.config.js`**: PM2 configuration file
- **`package.json`**: Updated with PM2 scripts
- **`vite.config.ts`**: Optimized build configuration

## Deployment Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Application
```bash
npm run build
```

### 3. Start with PM2
```bash
# Option 1: Use the start script (builds and starts)
npm start

# Option 2: Start PM2 directly
npm run pm2:start
```

## PM2 Management Commands

```bash
# Start the application
npm run pm2:start

# Stop the application
npm run pm2:stop

# Restart the application
npm run pm2:restart

# Delete the application from PM2
npm run pm2:delete

# View logs
npm run pm2:logs

# View PM2 status
pm2 status

# View detailed info
pm2 show structure-editor-react
```

## Application Details

- **Application Name**: `structure-editor-react`
- **Port**: 80
- **Serve Path**: `./dist` (built files)
- **Mode**: Single Page Application (SPA)
- **Log Files**: 
  - Error logs: `./logs/err.log`
  - Output logs: `./logs/out.log`
  - Combined logs: `./logs/combined.log`

## Monitoring

```bash
# Real-time monitoring
pm2 monit

# Web-based monitoring (optional)
pm2 web
```

## Auto-restart on System Boot

```bash
# Save PM2 configuration
pm2 save

# Generate startup script
pm2 startup

# Follow the instructions provided by the startup command
```

## Production Optimizations

The Vite build configuration includes:

- **Code splitting**: Vendor and MUI libraries are chunked separately
- **Minification**: Using Terser for optimal compression
- **Asset optimization**: Optimized asset directory structure
- **No source maps**: Disabled for production builds

## Troubleshooting

### Application Won't Start
1. Check if port 80 is available: `netstat -an | grep 80`
2. Verify build directory exists: `ls -la dist/`
3. Check PM2 logs: `npm run pm2:logs`

### Performance Issues
1. Monitor memory usage: `pm2 monit`
2. Check system resources: `htop` or `top`
3. Review application logs for errors

### File Permissions
Ensure PM2 has proper permissions:
```bash
sudo chown -R $USER:$USER ./logs
chmod 755 ./logs
```

## Environment Variables

You can set environment variables in `ecosystem.config.js`:

```javascript
env: {
  NODE_ENV: 'production',
  PORT: 80,
  // Add custom environment variables here
}
```

## SSL/HTTPS Setup

For HTTPS, consider using a reverse proxy like Nginx:

```nginx
server {
    listen 443 ssl;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
