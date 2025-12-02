# Production Deployment Guide

## Pre-deployment Checklist

### 1. SSL Certificates
```bash
# Create SSL directories
mkdir -p ssl/certs ssl/private

# Option A: Let's Encrypt (recommended)
# Install certbot and generate certificates
# Place fullchain.pem in ssl/certs/
# Place privkey.pem in ssl/private/

# Option B: Self-signed (for testing only)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/private/privkey.pem \
  -out ssl/certs/fullchain.pem
```

### 2. Environment Configuration
```bash
# Create .env file from example
cp .env.example .env

# Edit .env and set secure values:
nano .env
```

Required values:
- `MONGO_ROOT_USER` - MongoDB admin username
- `MONGO_ROOT_PASSWORD` - Strong password WITHOUT special URI chars (@:/?#[]%&+=)
  - Generate with: `openssl rand -base64 32 | tr -d '/+=' | head -c 32`
- `JWT_SECRET` - Generate with: `openssl rand -base64 32`
- `API_KEY` - Secure API key

### 3. Application Configuration
```bash
# Edit config/production.json
nano config/production.json
```

Update:
- `secret` - Same as JWT_SECRET or separate secure value
- `api_key` - Same as API_KEY from .env
- Verify all URLs match your domain

### 4. Basic Auth for Admin
```bash
# Regenerate .htpasswd with secure password
htpasswd -c .htpasswd admin
```

### 5. Create Backup Directory
```bash
mkdir -p backups
```

## Deployment

### Build and Start
```bash
# Build images
docker compose -f docker-compose.production.yml build

# Start services
docker compose -f docker-compose.production.yml up -d

# Check logs
docker compose -f docker-compose.production.yml logs -f
```

### Verify Deployment
```bash
# Check service health
docker compose -f docker-compose.production.yml ps

# Test endpoints
curl -k https://homebrewery.sene-verse.com/
```

## Maintenance

### View Logs
```bash
docker compose -f docker-compose.production.yml logs -f homebrewery
```

### Backup MongoDB
```bash
docker compose -f docker-compose.production.yml exec mongodb \
  mongodump --username $MONGO_ROOT_USER --password $MONGO_ROOT_PASSWORD \
  --authenticationDatabase admin --db homebrewery --out /backups/$(date +%Y%m%d)
```

### Restore MongoDB
```bash
docker compose -f docker-compose.production.yml exec mongodb \
  mongorestore --username $MONGO_ROOT_USER --password $MONGO_ROOT_PASSWORD \
  --authenticationDatabase admin --db homebrewery /backups/YYYYMMDD/homebrewery
```

### Update Application
```bash
# Pull latest code
git pull

# Rebuild and restart
docker compose -f docker-compose.production.yml build
docker compose -f docker-compose.production.yml up -d
```

### Stop Services
```bash
docker compose -f docker-compose.production.yml down
```

## Monitoring

### Check Resource Usage
```bash
docker stats
```

### Check Service Health
```bash
# MongoDB
docker compose -f docker-compose.production.yml exec mongodb \
  mongosh -u $MONGO_ROOT_USER -p $MONGO_ROOT_PASSWORD --authenticationDatabase admin \
  --eval "db.adminCommand('ping')"

# Application
curl -k https://homebrewery.sene-verse.com/
```

## Troubleshooting

### Services won't start
```bash
# Check logs
docker compose -f docker-compose.production.yml logs

# Verify network exists
docker network ls | grep sene-network
```

### MongoDB connection issues
- Verify MONGODB_URI format
- Check credentials match .env file
- Ensure MongoDB is healthy: `docker compose -f docker-compose.production.yml ps`

### SSL issues
- Verify certificate paths in nginx.production.conf
- Check certificate files exist and have correct permissions
- Review nginx logs: `docker compose -f docker-compose.production.yml logs nginx`
