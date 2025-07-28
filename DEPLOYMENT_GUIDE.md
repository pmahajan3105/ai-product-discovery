# 🚀 FeedbackHub Production Deployment Guide

This guide provides complete instructions for deploying FeedbackHub to production with Docker, monitoring, and CI/CD.

## 📋 Prerequisites

### System Requirements
- **Server**: Ubuntu 20.04+ or CentOS 8+ (minimum 4GB RAM, 2 CPU cores, 50GB storage)
- **Docker**: Version 20.10+
- **Docker Compose**: Version 2.0+
- **Domain**: Configured DNS pointing to your server
- **SSL Certificates**: Let's Encrypt or commercial certificates

### Required Services
- **PostgreSQL 15+** (managed service recommended)
- **Redis 7+** (managed service recommended)
- **Email Service** (Resend, SendGrid, or similar)
- **SuperTokens** (managed service)

## 🔧 Server Setup

### 1. Initial Server Configuration

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose-plugin

# Create application directory
sudo mkdir -p /opt/feedbackhub
sudo chown $USER:$USER /opt/feedbackhub
```

### 2. Firewall Configuration

```bash
# Configure UFW firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw --force enable
```

## 🌐 Domain & SSL Setup

### 1. DNS Configuration
Point your domains to your server IP:
```
A record: app.aiproductdiscovery.com → YOUR_SERVER_IP
A record: api.aiproductdiscovery.com → YOUR_SERVER_IP
```

### 2. SSL Certificates (Let's Encrypt)

```bash
# Install Certbot
sudo apt install certbot

# Get certificates
sudo certbot certonly --standalone -d app.aiproductdiscovery.com
sudo certbot certonly --standalone -d api.aiproductdiscovery.com

# Copy certificates to nginx directory
sudo mkdir -p /opt/feedbackhub/nginx/ssl
sudo cp /etc/letsencrypt/live/app.aiproductdiscovery.com/fullchain.pem /opt/feedbackhub/nginx/ssl/app.aiproductdiscovery.com.crt
sudo cp /etc/letsencrypt/live/app.aiproductdiscovery.com/privkey.pem /opt/feedbackhub/nginx/ssl/app.aiproductdiscovery.com.key
sudo cp /etc/letsencrypt/live/api.aiproductdiscovery.com/fullchain.pem /opt/feedbackhub/nginx/ssl/api.aiproductdiscovery.com.crt
sudo cp /etc/letsencrypt/live/api.aiproductdiscovery.com/privkey.pem /opt/feedbackhub/nginx/ssl/api.aiproductdiscovery.com.key

# Set correct permissions
sudo chown -R $USER:$USER /opt/feedbackhub/nginx/ssl
sudo chmod 600 /opt/feedbackhub/nginx/ssl/*.key
```

## 📁 Application Deployment

### 1. Clone Repository

```bash
cd /opt/feedbackhub
git clone https://github.com/yourusername/feedbackhub.git .
```

### 2. Environment Configuration

```bash
# Copy production environment template
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

**Required Environment Variables:**
```bash
# Database (use managed PostgreSQL service)
DATABASE_URL=postgresql://user:password@your-db-host:5432/feedbackhub_prod

# Redis (use managed Redis service)
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password

# Authentication
SUPERTOKENS_CONNECTION_URI=https://your-supertokens-instance
SUPERTOKENS_API_KEY=your-supertokens-api-key
GOOGLE_CLIENT_ID=your-google-oauth-client-id
GOOGLE_CLIENT_SECRET=your-google-oauth-client-secret

# Security (generate with: openssl rand -hex 32)
JWT_SECRET=your-secure-jwt-secret
API_SECRET_KEY=your-api-secret
WEBHOOK_SECRET=your-webhook-secret

# AI Services
OPENAI_API_KEY=your-openai-api-key

# Email Service
SMTP_PASSWORD=your-email-service-api-key

# Database password for Docker
DB_PASSWORD=your-postgres-password
REDIS_PASSWORD=your-redis-password
```

### 3. Run Deployment

```bash
# Make deployment script executable
chmod +x scripts/deploy.sh

# Run deployment with monitoring
./scripts/deploy.sh --monitoring
```

The deployment script will:
- ✅ Check prerequisites
- 🗄️ Create database backup
- 🏗️ Build Docker images
- 🚀 Deploy services
- 🏥 Run health checks
- 📊 Setup monitoring

## 🔄 CI/CD Setup (GitHub Actions)

### 1. Repository Secrets
Add these secrets to your GitHub repository:

```
SERVER_HOST=your-server-ip
SERVER_USER=your-server-username
SSH_PRIVATE_KEY=your-private-ssh-key

DATABASE_URL=postgresql://...
REDIS_HOST=your-redis-host
REDIS_PASSWORD=your-redis-password
SUPERTOKENS_CONNECTION_URI=https://...
SUPERTOKENS_API_KEY=your-key
GOOGLE_CLIENT_ID=your-id
GOOGLE_CLIENT_SECRET=your-secret
JWT_SECRET=your-jwt-secret
API_SECRET_KEY=your-api-secret
OPENAI_API_KEY=your-openai-key
SMTP_PASSWORD=your-email-key
DB_PASSWORD=your-db-password

SLACK_WEBHOOK_URL=https://hooks.slack.com/... (optional)
```

### 2. Deployment Workflow
The GitHub Actions workflow automatically:
- Runs tests on every PR
- Builds and pushes Docker images
- Deploys to staging on PR
- Deploys to production on main branch push

## 📊 Monitoring & Logging

### Access Monitoring Services

- **Grafana Dashboard**: http://your-server:3030
  - Default login: admin/admin (change immediately)
  - Pre-configured dashboards for application metrics

- **Prometheus**: http://your-server:9090
  - Metrics collection and alerting

### Log Management

```bash
# View application logs
docker-compose logs -f api
docker-compose logs -f web

# View nginx logs
docker-compose logs -f nginx

# Application log files
tail -f /opt/feedbackhub/volumes/api_logs/application.log
```

## 🔄 Maintenance Tasks

### Daily Tasks
```bash
# Check service health
docker-compose ps

# View resource usage
docker stats

# Check disk space
df -h
```

### Weekly Tasks
```bash
# Update SSL certificates (automated with cron)
sudo certbot renew --quiet

# Clean up old Docker images
docker system prune -f

# Check security updates
sudo apt list --upgradable
```

### Monthly Tasks
```bash
# Review application logs
# Update dependencies
# Performance monitoring review
# Security audit
```

## 🆘 Troubleshooting

### Service Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Check system resources
free -h
df -h

# Restart services
docker-compose restart [service-name]
```

### Database Issues
```bash
# Check database connectivity
docker-compose exec postgres pg_isready -U feedbackhub

# View database logs
docker-compose logs postgres

# Connect to database
docker-compose exec postgres psql -U feedbackhub -d feedbackhub_prod
```

### SSL Certificate Issues
```bash
# Test certificate validity
openssl x509 -in /opt/feedbackhub/nginx/ssl/app.feedbackhub.com.crt -text -noout

# Renew certificates
sudo certbot renew

# Check nginx configuration
docker-compose exec nginx nginx -t
```

### Performance Issues
```bash
# Monitor resource usage
htop
docker stats

# Check application metrics
curl http://localhost:9090/metrics

# Review slow queries
# Check database indexes
```

## 🔐 Security Checklist

### Server Security
- [ ] SSH key-only authentication
- [ ] Firewall configured (UFW)
- [ ] Regular security updates
- [ ] Non-root user for application
- [ ] Log monitoring setup

### Application Security
- [ ] All secrets in environment variables
- [ ] SSL/TLS certificates installed
- [ ] Security headers configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation implemented

### Database Security
- [ ] Database encryption at rest
- [ ] Secure connection strings
- [ ] Regular backups
- [ ] Access controls configured
- [ ] Query monitoring

## 📞 Support

### Getting Help
1. Check application logs first
2. Review this deployment guide
3. Check GitHub Issues
4. Contact support team

### Emergency Procedures
1. **Service Down**: Run health checks, restart services
2. **Database Issues**: Check backups, contact DBA
3. **Security Breach**: Rotate secrets, check logs
4. **Performance Issues**: Check metrics, scale resources

---

**📝 Note**: This guide assumes a single-server deployment. For high-availability production, consider:
- Load balancer setup
- Multi-server configuration
- Database clustering
- Redis clustering
- CDN integration
- Advanced monitoring