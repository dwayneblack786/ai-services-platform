import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { sessionCache } from '../services/cacheClient';

const Login = () => {
  const [searchParams] = useSearchParams();
  const [tenantId, setTenantId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(searchParams.get('error') || '');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tenantId.trim()) {
      setError('Please enter a tenant identifier');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Lookup tenant to get Keycloak realm
      const response = await fetch('http://localhost:5000/api/auth/tenant/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ identifier: tenantId.trim() })
      });

      if (!response.ok) {
        throw new Error('Tenant not found');
      }

      const data = await response.json();
      
      // Store tenant ID for future use (30 min TTL)
      await sessionCache.set('tenantId', data.tenantId, 1800);
      
      // Get and validate redirect URL
      let returnTo = searchParams.get('redirect') || '/dashboard';
      
      // Preserve query parameters and hash fragments
      if (returnTo && !returnTo.startsWith('http')) {
        // Already includes query params and hash from ProtectedRoute
        console.log('Redirecting to:', returnTo);
      } else if (returnTo?.startsWith('http')) {
        // Security: Don't allow external URLs
        console.warn('External redirect blocked:', returnTo);
        returnTo = '/dashboard';
      }
      
      // Redirect to tenant-specific Keycloak login
      window.location.href = `http://localhost:5000/api/auth/tenant/login?tenant=${data.tenantId}&returnTo=${encodeURIComponent(returnTo)}`;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to lookup tenant');
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      backgroundColor: '#f5f5f5'
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🔐</div>
        <h2 style={{ marginBottom: '10px', color: '#333' }}>Sign In</h2>
        <p style={{ color: '#666', marginBottom: '30px' }}>Enter your tenant identifier to continue</p>
        
        <form onSubmit={handleLogin}>
          <input
            type="text"
            placeholder="Tenant ID (e.g., acme-corp)"
            value={tenantId}
            onChange={(e) => setTenantId(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              marginBottom: '16px',
              boxSizing: 'border-box'
            }}
          />
          
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: loading ? '#999' : '#007bff',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Connecting...' : 'Continue'}
          </button>
        </form>

        {error && (
          <div style={{
            padding: '12px',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c33',
            marginTop: '20px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}

        <div style={{
          marginTop: '24px',
          paddingTop: '24px',
          borderTop: '1px solid #eee'
        }}>
          <p style={{ color: '#666', fontSize: '14px', marginBottom: '12px' }}>
            Don't have an account?
          </p>
          <Link
            to="/register/initiate"
            style={{
              display: 'inline-block',
              padding: '10px 24px',
              fontSize: '14px',
              fontWeight: '600',
              color: '#007bff',
              backgroundColor: 'transparent',
              border: '2px solid #007bff',
              borderRadius: '4px',
              textDecoration: 'none',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#007bff';
              e.currentTarget.style.color = 'white';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#007bff';
            }}
          >
            Sign Up for Free
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;