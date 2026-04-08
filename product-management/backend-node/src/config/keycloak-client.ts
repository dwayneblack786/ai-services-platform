import {
  KeycloakOIDCClient,
  createKeycloakClient,
  getKeycloakClient,
  type KeycloakConfig,
  type PKCEChallenge,
  type TokenResponse,
  type UserInfo
} from '../lib/keycloak-client';

// Backward-compatible export surface. Canonical implementation lives in src/lib/keycloak-client.ts.
export {
  KeycloakOIDCClient,
  createKeycloakClient,
  getKeycloakClient,
  type KeycloakConfig,
  type PKCEChallenge,
  type TokenResponse,
  type UserInfo
};

export default getKeycloakClient();
