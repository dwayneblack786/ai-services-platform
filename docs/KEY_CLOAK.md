⭐ STEP 1 — Create a Podman network
podman network create keycloak-net



⭐ STEP 2 — Run Postgres in that network
podman run -d --name keycloak-db \
  --network keycloak-net \
  -e POSTGRES_DB=keycloak \
  -e POSTGRES_USER=keycloak \
  -e POSTGRES_PASSWORD=keycloak \
  -p 5432:5432 \
  postgres:15


Verify it’s running:
podman logs keycloak-db


You should see:
database system is ready to accept connections



⭐ STEP 3 — Run Keycloak in the same network
Remove the --add-host (it breaks things).
Use:
podman run --name keycloak \
  --network keycloak-net \
  -p 9999:9999 \
  -e KC_BOOTSTRAP_ADMIN_USERNAME=admin \
  -e KC_BOOTSTRAP_ADMIN_PASSWORD=admin \
  -e KC_DB=postgres \
  -e KC_DB_URL=jdbc:postgresql://keycloak-db:5432/keycloak \
  -e KC_DB_USERNAME=keycloak \
  -e KC_DB_PASSWORD=keycloak \
  quay.io/keycloak/keycloak:latest \
  start-dev --http-port=9999


Why this works
- Both containers are in the same Podman network
- keycloak-db resolves to the Postgres container
- Keycloak can connect to Postgres normally

⭐ STEP 4 — Test Keycloak
Open:
http://localhost:9999


You should see the Keycloak welcome page.

⭐ STEP 5 — If you want persistence
Add a volume to Postgres:
-v keycloak-db-data:/var/lib/postgresql/data




