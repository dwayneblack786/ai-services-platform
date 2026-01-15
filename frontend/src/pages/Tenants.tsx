import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/shared';
import { styles } from '../styles/Tenants.styles';
import { Tenant } from '../types';

const Tenants = () => {
  const { hasRole } = useAuth();
  const isProjectAdmin = hasRole(UserRole.PROJECT_ADMIN);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTenant, setExpandedTenant] = useState<string | null>(null);

  useEffect(() => {
    if (isProjectAdmin) {
      fetchTenants();
    } else {
      setError('PROJECT_ADMIN access required');
      setLoading(false);
    }
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await apiClient.get('/api/tenants');
      if (response.data.success) {
        setTenants(response.data.tenants);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load tenants');
    } finally {
      setLoading(false);
    }
  };

  const toggleTenant = (tenantId: string) => {
    setExpandedTenant(expandedTenant === tenantId ? null : tenantId);
  };

  const getRoleBadgeColor = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN: return '#dc3545';
      case UserRole.PROJECT_ADMIN: return '#e83e8c';
      case UserRole.ANALYST: return '#17a2b8';
      case UserRole.DEVELOPER: return '#28a745';
      case UserRole.CLIENT: return '#ffc107';
      default: return '#6c757d';
    }
  };

  if (!isProjectAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Access Denied</h1>
          <p style={styles.description}>
            You need PROJECT_ADMIN privileges to view tenant management.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading tenants...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Tenant Management</h1>
        <p style={styles.description}>
          View all tenants and their associated users. Click on a tenant to expand and see user details.
        </p>

        {error && <p style={styles.error}>{error}</p>}

        <div style={styles.tenantsContainer}>
          {tenants.map(tenant => (
            <div key={tenant.tenantId} style={styles.tenantCard}>
              <div 
                style={styles.tenantHeader}
                onClick={() => toggleTenant(tenant.tenantId)}
              >
                <div style={styles.tenantInfo}>
                  <h3 style={styles.tenantId}>
                    <span style={styles.tenantIcon}>🏢</span>
                    {tenant.tenantId}
                  </h3>
                  <span style={styles.userCount}>
                    {tenant.users.length} {tenant.users.length === 1 ? 'user' : 'users'}
                  </span>
                </div>
                <span style={styles.expandIcon}>
                  {expandedTenant === tenant.tenantId ? '▼' : '▶'}
                </span>
              </div>

              {expandedTenant === tenant.tenantId && (
                <div style={styles.usersSection}>
                  {tenant.users.length === 0 ? (
                    <p style={styles.noUsers}>No users in this tenant</p>
                  ) : (
                    <table style={styles.userTable}>
                      <thead>
                        <tr style={styles.tableHeader}>
                          <th style={styles.th}>Name</th>
                          <th style={styles.th}>Email</th>
                          <th style={styles.th}>Role</th>
                          <th style={styles.th}>Provider</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tenant.users.map(user => (
                          <tr key={user.id} style={styles.tableRow}>
                            <td style={styles.td}>{user.name}</td>
                            <td style={styles.td}>{user.email}</td>
                            <td style={styles.td}>
                              <span style={{
                                ...styles.roleBadge,
                                backgroundColor: getRoleBadgeColor(user.role)
                              }}>
                                {user.role}
                              </span>
                            </td>
                            <td style={styles.td}>{user.authProvider || 'N/A'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {tenants.length === 0 && (
          <p style={styles.noData}>No tenants found</p>
        )}

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>💡 About Tenants</h3>
          <ul style={styles.infoList}>
            <li>Each user is assigned to a tenant for data isolation</li>
            <li>Users can only see data from their own tenant (except PROJECT_ADMIN)</li>
            <li>Only PROJECT_ADMIN users can view all tenants and reassign users via the Users page</li>
            <li>New users get a unique tenant ID during signup by default</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Tenants;
