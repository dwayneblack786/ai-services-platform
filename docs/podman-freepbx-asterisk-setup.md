📄 Podman + FreePBX + Asterisk Setup Guide (Markdown Document)
You can copy/paste everything below into a file named:
podman-freepbx-asterisk-setup.md



# Podman + FreePBX + Asterisk Setup Guide
A complete guide for running FreePBX + Asterisk inside Podman (rootless mode), including networking, database setup, GUI access, and troubleshooting.

---

## 📌 Overview
This document explains how to deploy:

- **Podman** (rootless)
- **MariaDB** (as the FreePBX backend)
- **FreePBX + Asterisk** (using the tiredofit/freepbx container)
- **Non‑privileged port mappings** (no rootful Podman required)

This setup is ideal for:
- Local development
- AI voice assistant integration (ARI)
- SIP/RTP testing
- Reproducible environments

---

## 📦 Requirements
- Windows 11 with **Podman Desktop** installed  
- Podman machine initialized (rootless mode is fine)
- Internet access to pull container images

---

## 🛠 Step 1 — Create a Podman Network
FreePBX and MariaDB must be on the same network.

```bash
podman network create freepbx-net



🛢 Step 2 — Start MariaDB Container
FreePBX requires a database.
This creates a dedicated MariaDB instance.
podman run -d \
  --name freepbx-db \
  --network freepbx-net \
  -e MYSQL_ROOT_PASSWORD=changeme \
  -e MYSQL_DATABASE=asterisk \
  -e MYSQL_USER=asterisk \
  -e MYSQL_PASSWORD=asterisk \
  mariadb:10.5



📞 Step 3 — Start FreePBX + Asterisk Container
Rootless Podman cannot bind to privileged ports (<1024), so we map port 80 → 8081.
podman run -d \
  --name freepbx \
  --network freepbx-net \
  -p 8081:80 \
  -p 5060:5060/udp \
  -p 5060:5060/tcp \
  -p 8088:8088 \
  -p 10000-20000:10000-20000/udp \
  -e DB_HOST=freepbx-db \
  -e DB_NAME=asterisk \
  -e DB_USER=asterisk \
  -e DB_PASS=asterisk \
  tiredofit/freepbx



🌐 Step 4 — Access the FreePBX GUI
FreePBX takes 3–5 minutes to initialize.
Watch logs:
podman logs -f freepbx


When ready, open:
http://localhost:8081



🔐 Step 5 — Fixing Missing Admin Login (ampusers Empty)
Sometimes the tiredofit/freepbx image fails to create the admin user.
Check the table:
SELECT * FROM ampusers;


If empty, manually create the admin user:
INSERT INTO ampusers (username, password_sha1, sections)
VALUES ('admin', SHA1('newpassword'), 'all');


Then log in with:
- Username: admin
- Password: newpassword

🔧 Step 6 — Enable ARI (Asterisk REST Interface)
Inside the FreePBX GUI:
- Go to Settings → Asterisk REST Interface
- Enable ARI
- Set:
- Bind Address: 0.0.0.0
- Port: 8088
- Username: va
- Password: myaripass
- Apply Config
Your ARI endpoint becomes:
http://localhost:8088/ari



📟 Step 7 — Create AI Dialplan Context
Edit:
/etc/asterisk/extensions_custom.conf


Add:
[ai-assistant]
exten => 2000,1,NoOp(Starting AI Call)
 same => n,Answer()
 same => n,Stasis(va)
 same => n,Hangup()


Reload:
fwconsole reload



🩺 Troubleshooting Guide
❗ FreePBX GUI shows login instead of setup wizard
This is normal for tiredofit/freepbx.
It auto-installs FreePBX and skips the wizard.
Fix: manually create admin user (see above).

❗ ampusers table is empty
Cause: admin user creation failed during bootstrap.
Fix:
INSERT INTO ampusers (username, password_sha1, sections)
VALUES ('admin', SHA1('newpassword'), 'all');



❗ Port 80 cannot bind
Rootless Podman cannot bind privileged ports.
Fix: map to a higher port:
-p 8081:80



❗ FreePBX stuck initializing
Check logs:
podman logs -f freepbx


Common causes:
- MariaDB not reachable
- Wrong DB credentials
- Network not created

❗ ARI returns 401 Unauthorized
Check:
- /etc/asterisk/ari.conf
- FreePBX ARI settings
- Correct username/password

❗ SIP phone cannot register
Check:
- PJSIP extension exists
- Port 5060 is mapped
- Firewall rules (Windows Defender)

✅ Summary
You now have a fully working:
- Podman-based FreePBX deployment
- Asterisk with ARI enabled
- SIP/RTP support
- Rootless, non-privileged port setup
- Troubleshooting steps for common issues
This environment is ideal for integrating your AI voice assistant pipeline (Whisper → LLM → XTTS → ARI).

 
