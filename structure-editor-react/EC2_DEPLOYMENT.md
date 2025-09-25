# EC2 Deployment Guide with PM2

This guide walks you through deploying your React Structure Editor app on an AWS EC2 instance using PM2.

## 🚀 EC2 Deployment Steps

### **1. Launch and Configure EC2 Instance**

#### Launch EC2 Instance:
- **AMI**: Ubuntu Server 22.04 LTS (Free Tier)
- **Instance Type**: t2.micro (Free Tier) or larger based on needs
- **Security Group**: Configure inbound rules:
  - SSH (Port 22) - Your IP
  - HTTP (Port 80) - Anywhere (0.0.0.0/0)
  - Custom TCP (Port 3000) - Anywhere (0.0.0.0/0) [if using port 3000]
- **Key Pair**: Create/select key pair for SSH access

#### Connect to EC2:
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### **2. Install Dependencies on EC2**

#### Update system packages:
```bash
sudo apt update
sudo apt upgrade -y
```

#### Install Node.js (v18+):
```bash
# Install Node.js via NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify installation
node --version
npm --version
```

#### Install PM2 globally:
```bash
sudo npm install -g pm2
```

#### Install Git:
```bash
sudo apt install git -y
```

### **3. Deploy Your Application**

#### Clone your repository:
```bash
# If using Git repository
git clone https://github.com/your-username/your-repo.git
cd your-repo/wings-insurance-data-builder/structure-editor-react

# OR upload your files via SCP
# scp -i your-key.pem -r ./structure-editor-react ubuntu@your-ec2-ip:~/
```

#### Install dependencies:
```bash
npm install
```

#### Build the application:
```bash
npm run build
```

### **4. Start with PM2**

#### Start the application:
```bash
# Using the npm script (recommended)
npm run pm2:start

# OR directly with PM2
pm2 serve dist 3000 --name structure-editor-react --spa
```

#### Verify it's running:
```bash
pm2 status
pm2 logs structure-editor-react
```

### **5. Configure PM2 for Production**

#### Save PM2 configuration:
```bash
pm2 save
```

#### Setup PM2 to start on boot:
```bash
pm2 startup
# Follow the instructions provided by the command
```

#### Enable automatic restart on system reboot:
```bash
sudo env PATH=$PATH:/usr/bin /usr/lib/node_modules/pm2/bin/pm2 startup systemd -u ubuntu --hp /home/ubuntu
```

### **6. Optional: Configure Nginx Reverse Proxy**

For production, it's recommended to use Nginx as a reverse proxy:

#### Install Nginx:
```bash
sudo apt install nginx -y
```

#### Create Nginx configuration:
```bash
sudo nano /etc/nginx/sites-available/structure-editor
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com your-ec2-public-ip;

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
}
```

#### Enable the site:
```bash
sudo ln -s /etc/nginx/sites-available/structure-editor /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## 🛠️ Management Commands on EC2

### **PM2 Commands:**
```bash
# Check status
pm2 status

# View logs
pm2 logs structure-editor-react

# Restart app
pm2 restart structure-editor-react

# Stop app  
pm2 stop structure-editor-react

# Delete app
pm2 delete structure-editor-react

# Monitor resources
pm2 monit
```

### **Application Updates:**
```bash
# Pull latest changes
git pull origin main

# Rebuild application
npm run build

# Restart with PM2
pm2 restart structure-editor-react
```

## 🔒 Security Considerations

### **Firewall Setup:**
```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH, HTTP, and your app port
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 3000  # Only if not using Nginx proxy

# Check status
sudo ufw status
```

### **SSL/HTTPS Setup (Optional):**
If you have a domain, you can set up SSL using Let's Encrypt:

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Auto-renewal (already configured)
sudo certbot renew --dry-run
```

## 📊 Monitoring

### **Check system resources:**
```bash
# System stats
htop
df -h      # Disk usage
free -h    # Memory usage

# PM2 monitoring
pm2 monit
```

### **Application logs:**
```bash
# PM2 logs
pm2 logs structure-editor-react --lines 100

# System logs
sudo journalctl -u nginx -f  # Nginx logs
```

## 🚨 Troubleshooting

### **Common Issues:**

1. **App won't start:**
   ```bash
   # Check if port is in use
   sudo netstat -tlnp | grep :3000
   
   # Check PM2 status
   pm2 status
   pm2 logs structure-editor-react
   ```

2. **Permission issues:**
   ```bash
   # Fix file permissions
   sudo chown -R ubuntu:ubuntu /home/ubuntu/your-app
   ```

3. **Memory issues:**
   ```bash
   # Check memory usage
   free -h
   
   # Restart PM2 if needed
   pm2 restart all
   ```

4. **Port 80 access (if needed):**
   ```bash
   # Allow Node.js to bind to port 80
   sudo setcap 'cap_net_bind_service=+ep' $(which node)
   ```

## 🎯 Final Checklist

- [ ] EC2 instance launched with proper security groups
- [ ] Node.js and PM2 installed
- [ ] Application code deployed
- [ ] Dependencies installed (`npm install`)
- [ ] Application built (`npm run build`)
- [ ] PM2 started successfully
- [ ] PM2 configured for auto-restart
- [ ] Nginx configured (optional)
- [ ] Firewall rules configured
- [ ] Application accessible via public IP/domain

Your React app should now be running on EC2 with PM2 at:
- **Direct access**: `http://your-ec2-public-ip:3000`
- **Via Nginx**: `http://your-ec2-public-ip` (port 80)
