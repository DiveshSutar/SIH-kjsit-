# Deployment Guide

## Overview

This guide covers deployment options for the HealthFirst Connect hospital management system, including the Portia Insurance Approval System. The application can be deployed in various environments from development to production.

## Prerequisites

### System Requirements
- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Memory**: Minimum 2GB RAM (4GB recommended for production)
- **Storage**: 5GB available space
- **Network**: HTTPS support for production deployments

### Required Services
- **Google AI API**: Gemini API key for AI functionality
- **Firebase**: Authentication and real-time database
- **SendGrid** (Optional): Email notification service
- **Qdrant** (Optional): Vector database for medical report analysis

## Environment Configuration

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Required - Google AI
GOOGLE_API_KEY=your_google_gemini_api_key
GEMINI_API_KEY=your_google_gemini_api_key  # Alternative name

# Required - Firebase Authentication
FIREBASE_API_KEY=your_firebase_api_key
FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_STORAGE_BUCKET=your_project.appspot.com
FIREBASE_MESSAGING_SENDER_ID=123456789
FIREBASE_APP_ID=1:123456789:web:abcdef123456

# Optional - Medical Report Analysis
OPENAI_API_KEY=your_openai_api_key
QDRANT_URL=http://localhost:6333

# Optional - Email Notifications
SENDGRID_API_KEY=your_sendgrid_api_key
FROM_EMAIL=noreply@yourhospital.com

# Optional - Application Settings
NODE_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Firebase Setup

1. **Create Firebase Project**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize project
   firebase init
   ```

2. **Enable Authentication**
   - Go to Firebase Console → Authentication
   - Enable Email/Password provider
   - Configure authorized domains

3. **Configure Firestore** (if using database features)
   - Enable Firestore Database
   - Set security rules
   - Create initial collections

### Google AI API Setup

1. **Get API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/)
   - Create new API key
   - Set usage quotas and restrictions

2. **Configure Quotas**
   - Set appropriate rate limits
   - Monitor usage in Google Cloud Console
   - Set up billing alerts

## Deployment Options

### 1. Vercel Deployment (Recommended)

Vercel provides the easiest deployment for Next.js applications.

#### Automatic Deployment
1. **Connect Repository**
   ```bash
   # Install Vercel CLI (optional)
   npm install -g vercel
   
   # Deploy
   vercel
   ```

2. **Configure Environment Variables**
   - Go to Vercel Dashboard → Project Settings → Environment Variables
   - Add all required environment variables
   - Ensure production values are set

3. **Domain Configuration**
   - Add custom domain in Vercel dashboard
   - Configure DNS records
   - Enable HTTPS (automatic with Vercel)

#### Manual Deployment
```bash
# Build for production
npm run build

# Deploy to Vercel
vercel --prod
```

### 2. Netlify Deployment

#### Via Git Integration
1. **Connect Repository**
   - Link GitHub repository to Netlify
   - Configure build settings:
     - Build command: `npm run build`
     - Publish directory: `.next`

2. **Environment Variables**
   - Add variables in Netlify dashboard
   - Ensure all required keys are present

#### Manual Deployment
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Build and deploy
npm run build
netlify deploy --prod --dir=.next
```

### 3. Docker Deployment

#### Dockerfile
```dockerfile
# Multi-stage build for optimization
FROM node:18-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# Add non-root user for security
RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

# Copy built application
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

# Set proper permissions
USER nextjs

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

#### Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - GOOGLE_API_KEY=${GOOGLE_API_KEY}
      - FIREBASE_API_KEY=${FIREBASE_API_KEY}
      # Add other environment variables
    depends_on:
      - qdrant
    restart: unless-stopped

  qdrant:
    image: qdrant/qdrant:latest
    ports:
      - "6333:6333"
      - "6334:6334"
    volumes:
      - qdrant_data:/qdrant/storage
    restart: unless-stopped

volumes:
  qdrant_data:
```

#### Deployment Commands
```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f app

# Update deployment
docker-compose pull && docker-compose up -d
```

### 4. Traditional VPS/Server Deployment

#### Server Setup (Ubuntu/Debian)
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install nginx
```

#### Application Deployment
```bash
# Clone repository
git clone https://github.com/wanidhruva/Portia-hospital.git
cd Portia-hospital

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'healthfirst-connect',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js
pm2 startup
pm2 save
```

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name yourdomain.com;
    
    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    # SSL Configuration
    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
    
    # Proxy to Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Static files caching
    location /_next/static {
        proxy_pass http://localhost:3000;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
}
```

## Database Setup (Optional)

### Qdrant Vector Database

#### Docker Installation
```bash
# Run Qdrant container
docker run -d \
  --name qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v $(pwd)/qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest
```

#### Cloud Deployment
```bash
# Qdrant Cloud setup
curl -X POST 'https://cloud.qdrant.io/clusters' \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_API_KEY' \
  -d '{
    "name": "healthfirst-connect",
    "region": "us-east-1"
  }'
```

### PostgreSQL (Future Database Option)
```bash
# Install PostgreSQL
sudo apt install postgresql postgresql-contrib

# Create database and user
sudo -u postgres psql
CREATE DATABASE healthfirst_connect;
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE healthfirst_connect TO app_user;
```

## Monitoring and Logging

### Application Monitoring

#### PM2 Monitoring
```bash
# Monitor processes
pm2 monit

# View logs
pm2 logs healthfirst-connect

# Restart application
pm2 restart healthfirst-connect
```

#### Log Configuration
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'healthfirst-connect',
    script: 'npm',
    args: 'start',
    log_file: '/var/log/healthfirst/combined.log',
    out_file: '/var/log/healthfirst/out.log',
    error_file: '/var/log/healthfirst/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
}
```

### Health Checks

#### API Health Check Endpoint
```typescript
// pages/api/health.ts
export default function handler(req, res) {
  const health = {
    uptime: process.uptime(),
    message: 'OK',
    timestamp: Date.now(),
    checks: {
      database: 'OK', // Add actual database check
      ai_service: 'OK', // Add AI service check
      external_apis: 'OK'
    }
  };
  
  res.status(200).json(health);
}
```

#### External Monitoring
```bash
# Uptime monitoring with curl
curl -f https://yourdomain.com/api/health || exit 1

# Automated monitoring script
#!/bin/bash
HEALTH_URL="https://yourdomain.com/api/health"
if ! curl -f $HEALTH_URL > /dev/null 2>&1; then
  echo "Health check failed!" | mail -s "Site Down" admin@yourdomain.com
fi
```

## Security Configuration

### SSL/TLS Setup

#### Let's Encrypt (Free SSL)
```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d yourdomain.com

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Firewall Configuration
```bash
# UFW setup
sudo ufw allow ssh
sudo ufw allow 'Nginx Full'
sudo ufw enable

# Fail2ban for SSH protection
sudo apt install fail2ban
sudo systemctl enable fail2ban
```

### Security Headers
```javascript
// next.config.ts
const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on'
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload'
  },
  {
    key: 'X-XSS-Protection',
    value: '1; mode=block'
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN'
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff'
  }
];

module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}
```

## Performance Optimization

### Caching Strategy

#### Redis Setup (Optional)
```bash
# Install Redis
sudo apt install redis-server

# Configure Redis
sudo systemctl enable redis-server
```

#### Next.js Cache Configuration
```javascript
// next.config.ts
module.exports = {
  experimental: {
    serverComponentsExternalPackages: ['sharp'],
  },
  images: {
    domains: ['yourdomain.com'],
    formats: ['image/webp', 'image/avif'],
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Cache static assets
        {
          source: '/_next/static/:path*',
          destination: '/_next/static/:path*',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ],
    }
  },
}
```

### CDN Configuration

#### Cloudflare Setup
1. **Add Domain to Cloudflare**
   - Update nameservers
   - Enable proxy for main domain

2. **Configure Caching Rules**
   - Cache static assets (JS, CSS, images)
   - Bypass cache for API routes
   - Enable Brotli compression

3. **Security Settings**
   - Enable Web Application Firewall (WAF)
   - Configure rate limiting
   - Enable DDoS protection

## Backup Strategy

### Application Backup
```bash
#!/bin/bash
# backup-app.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/healthfirst"
APP_DIR="/var/www/healthfirst-connect"

# Create backup directory
mkdir -p $BACKUP_DIR

# Backup application files
tar -czf $BACKUP_DIR/app_$DATE.tar.gz -C $APP_DIR .

# Backup environment configuration
cp $APP_DIR/.env.local $BACKUP_DIR/env_$DATE.backup

# Clean old backups (keep 30 days)
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete
```

### Database Backup (when applicable)
```bash
#!/bin/bash
# backup-db.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/database"

# Backup PostgreSQL
pg_dump -h localhost -U app_user healthfirst_connect > $BACKUP_DIR/db_$DATE.sql

# Backup Qdrant
curl -X POST "http://localhost:6333/collections/medical_reports/snapshots"
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   ```bash
   # Clear Next.js cache
   rm -rf .next
   
   # Clear npm cache
   npm cache clean --force
   
   # Reinstall dependencies
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Environment Variable Issues**
   ```bash
   # Check environment variables
   printenv | grep -E "(GOOGLE|FIREBASE|NEXT)"
   
   # Validate .env.local format
   cat .env.local | grep -v "^#" | grep "="
   ```

3. **Port Conflicts**
   ```bash
   # Check port usage
   sudo netstat -tulpn | grep :3000
   
   # Kill process using port
   sudo fuser -k 3000/tcp
   ```

4. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in certificate.crt -text -noout
   
   # Test SSL configuration
   curl -I https://yourdomain.com
   ```

### Log Analysis
```bash
# Application logs
tail -f /var/log/healthfirst/combined.log

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# System logs
journalctl -u nginx -f
journalctl -u pm2-root -f
```

## Scaling Considerations

### Horizontal Scaling
- Load balancer configuration (Nginx, HAProxy)
- Session store (Redis) for stateful components
- Database connection pooling
- CDN for static asset distribution

### Vertical Scaling
- Monitor CPU and memory usage
- Optimize Node.js heap size
- Database query optimization
- AI API request batching

This deployment guide provides comprehensive instructions for deploying the HealthFirst Connect system in various environments. Choose the deployment method that best fits your infrastructure requirements and technical expertise.
