import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { tempCache } from '../services/cacheClient';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const error = searchParams.get('error');
  const [pendingTenantId, setPendingTenantId] = useState<string | null>(null);

  useEffect(() => {
    // Load tenant ID from cache (set before OAuth redirect)
    const loadAndProcess = async () => {
      const tenantId = await tempCache.get('pendingTenantId');
      setPendingTenantId(tenantId);

      if (error) {
        const tenantParam = tenantId ? `&tenantId=${encodeURIComponent(tenantId)}` : '';
        navigate(`/login?error=${error}${tenantParam}`);
        return;
      }
      
      if (user) {
        // Validate tenant ID matches
        if (tenantId && user.tenantId !== tenantId) {
          const tenantParam = tenantId ? `&tenantId=${encodeURIComponent(tenantId)}` : '';
          await tempCache.delete('pendingTenantId');
          navigate(`/login?error=tenant_mismatch${tenantParam}`);
          return;
        }
        
        // Clear pending tenant ID
        await tempCache.delete('pendingTenantId');
        
        // Check if user needs to complete company details
        if (!user.companyDetailsCompleted) {
          navigate(`/complete-company-details?tenantId=${user.tenantId}`);
        } else {
          navigate('/dashboard');
        }
      }
    };
    
    loadAndProcess();
  }, [user, error, navigate]);

  return (

    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      <div style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        textAlign: 'center'
      }}>
        <div style={{
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #667eea',
          borderRadius: '50%',
          width: '60px',
          height: '60px',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 20px'
        }}></div>
        <h2>Completing sign in...</h2>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    </div>
  );
};

export default OAuthCallback;
