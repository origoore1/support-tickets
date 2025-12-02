# Lindgren-X v2 Deployment Setup

This document describes the production deployment configuration for automatic service management and crash recovery.

## Overview

The system is configured with:
- **PostgreSQL** auto-start via init.d
- **PM2** process manager for Node.js with automatic crash recovery
- **Dual init systems** (systemd + init.d) for maximum compatibility

## Components Configured

### 1. PostgreSQL Database

**Status:** ✅ Configured for auto-start

- **Service:** PostgreSQL 16
- **Port:** 5432
- **Init script:** `/etc/init.d/postgresql`
- **Auto-start:** Enabled via rc*.d symlinks (runlevels 2-5)

**Management Commands:**
```bash
/etc/init.d/postgresql start     # Start PostgreSQL
/etc/init.d/postgresql stop      # Stop PostgreSQL
/etc/init.d/postgresql restart   # Restart PostgreSQL
/etc/init.d/postgresql status    # Check status
```

### 2. PM2 Process Manager

**Status:** ✅ Installed and configured

- **Version:** 6.0.14
- **Application:** lindgren-x-v2
- **Script:** `/home/user/support-tickets/lindgren-x-v2.js`
- **Configuration:** `/home/user/support-tickets/ecosystem.config.js`

**Features Enabled:**
- ✅ Automatic restart on crashes
- ✅ Memory limit monitoring (1GB)
- ✅ Exponential backoff for restart delays
- ✅ Maximum 10 restarts before giving up
- ✅ Minimum uptime requirement (10s)
- ✅ Automatic resurrection on system boot

**Management Commands:**
```bash
# Using PM2 directly
pm2 list                         # List all processes
pm2 info lindgren-x-v2          # Detailed info
pm2 logs lindgren-x-v2          # View logs
pm2 restart lindgren-x-v2       # Restart application
pm2 stop lindgren-x-v2          # Stop application
pm2 start ecosystem.config.js   # Start with config
pm2 save                        # Save process list

# Using init.d script
/etc/init.d/pm2-lindgren start   # Start PM2 apps
/etc/init.d/pm2-lindgren stop    # Stop PM2 apps
/etc/init.d/pm2-lindgren restart # Restart PM2 apps
/etc/init.d/pm2-lindgren status  # View status
/etc/init.d/pm2-lindgren save    # Save state
```

### 3. Auto-Start Configuration

**Boot Sequence:**
1. PostgreSQL starts first (dependency)
2. PM2 resurrects saved applications
3. Lindgren-X application becomes available

**Init Systems Configured:**
- **init.d:** `/etc/init.d/pm2-lindgren` (S01 priority)
- **systemd:** `/etc/systemd/system/pm2-undefined.service` (fallback)

**Verification:**
```bash
# Check boot configuration
ls -la /etc/rc*.d/ | grep -E 'postgresql|pm2'

# Verify services
/etc/init.d/postgresql status
/etc/init.d/pm2-lindgren status
```

## Crash Recovery

### Automatic Restart Configuration

The application is configured with aggressive crash recovery:

```javascript
{
  autorestart: true,              // Enable auto-restart
  max_restarts: 10,               // Max restart attempts
  min_uptime: '10s',              // Must stay up 10s
  restart_delay: 4000,            // 4s base delay
  exp_backoff_restart_delay: 100  // Exponential backoff
}
```

### Testing Crash Recovery

To verify automatic restart functionality:

```bash
# Find the process ID
pm2 list

# Kill the process (replace PID with actual value)
kill -9 <PID>

# Check that PM2 automatically restarted it
sleep 2
pm2 list
```

**Expected Result:** The restart counter (↺) increments, uptime resets, and status remains "online".

## Logs

**PM2 Logs:**
- Error log: `/home/user/support-tickets/logs/pm2-error.log`
- Output log: `/home/user/support-tickets/logs/pm2-out.log`

**PostgreSQL Logs:**
- `/var/log/postgresql/postgresql-16-main.log`

**View Logs:**
```bash
# PM2 logs (live tail)
pm2 logs lindgren-x-v2

# PM2 logs (last 100 lines)
pm2 logs lindgren-x-v2 --lines 100

# PostgreSQL logs
tail -f /var/log/postgresql/postgresql-16-main.log
```

## Configuration Files

### Key Files Created/Modified:

1. **PM2 Ecosystem Config:** `/home/user/support-tickets/ecosystem.config.js`
   - Application configuration
   - Resource limits
   - Restart policies

2. **PM2 Init Script:** `/etc/init.d/pm2-lindgren`
   - Boot integration
   - Service management

3. **PM2 Systemd Service:** `/etc/systemd/system/pm2-undefined.service`
   - Systemd integration (fallback)

4. **Logs Directory:** `/home/user/support-tickets/logs/`
   - PM2 output and error logs

## Troubleshooting

### Application Won't Start

```bash
# Check PostgreSQL is running
/etc/init.d/postgresql status

# Start if needed
/etc/init.d/postgresql start

# Check PM2 status
pm2 list

# View logs for errors
pm2 logs lindgren-x-v2 --err --lines 50
```

### Auto-Restart Not Working

```bash
# Verify ecosystem config
cat /home/user/support-tickets/ecosystem.config.js

# Check PM2 is managing the app
pm2 info lindgren-x-v2

# Verify autorestart is enabled (should show 'true')
pm2 describe lindgren-x-v2 | grep autorestart
```

### Service Not Starting on Boot

```bash
# Verify init.d symlinks exist
ls -la /etc/rc2.d/ | grep -E 'postgresql|pm2'

# Ensure PM2 process list is saved
pm2 save

# Check init.d script is executable
ls -la /etc/init.d/pm2-lindgren
```

## System Status

**Current Status:**
- ✅ PostgreSQL: Running (port 5432)
- ✅ PM2: Running (daemon active)
- ✅ Lindgren-X: Online via PM2
- ✅ Auto-start: Configured for both services
- ✅ Crash recovery: Tested and working

**Quick Status Check:**
```bash
# One-line status check
/etc/init.d/postgresql status && pm2 list
```

## Maintenance

### Updating the Application

```bash
# Make code changes, then:
pm2 restart lindgren-x-v2

# Or reload with zero-downtime (if supported)
pm2 reload lindgren-x-v2
```

### Saving PM2 Configuration

After making changes to PM2 apps:
```bash
pm2 save
```

This ensures the configuration persists across reboots.

## Security Notes

- Application runs as **root** user (consider running as dedicated user in production)
- Logs are stored locally (consider log rotation)
- No authentication configured for PM2 web interface (not exposed)

---

**Setup Date:** 2025-12-02
**PM2 Version:** 6.0.14
**Node.js Version:** 22.21.1
**PostgreSQL Version:** 16
