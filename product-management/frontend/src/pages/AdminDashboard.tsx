import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { Alert } from '../components/Alert';
import { useAuth } from '../context/AuthContext';
import apiClient from '../services/apiClient';

interface Tenant {
  tenantId: string;
  companyName: string;
  createdAt: string;
}

interface DashboardStats {
  overview: {
    totalUsers: number;
    totalTenants: number;
    totalRegistrations: number;
    activeRegistrations: number;
    completedRegistrations: number;
    failedRegistrations: number;
    completionRate: number;
  };
  trends: {
    registrations: {
      last24Hours: number;
      last7Days: number;
      last30Days: number;
    };
    users: {
      last24Hours: number;
      last7Days: number;
      last30Days: number;
    };
  };
  activity?: {
    totalLogins: number;
    uniqueUsersToday: number;
    loginTrend: {
      last24Hours: number;
      last7Days: number;
      last30Days: number;
    };
    recentLogins: Array<{
      userEmail: string;
      timestamp: string;
      ipAddress?: string;
    }>;
  };
  recentActivity: Array<{
    sessionId: string;
    email: string;
    currentStep: string;
    createdAt: string;
    metadata?: any;
  }>;
}

interface UserActivity {
  _id: string;
  userId: string;
  userEmail: string;
  tenantId: string;
  eventType: string;
  eventName: string;
  timestamp: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: any;
}

interface LoginStats {
  byTenant: Array<{
    tenantId: string;
    loginCount: number;
  }>;
  trend: Array<{
    date: string;
    count: number;
  }>;
  topUsers: Array<{
    userId: string;
    userEmail: string;
    loginCount: number;
    lastLogin: string;
  }>;
}

interface UserDetail {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenantId: string;
  role: string;
  lastLogin?: string;
  loginCount: number;
  lastActivity?: {
    eventType: string;
    timestamp: string;
  };
}

interface Registration {
  sessionId: string;
  email: string;
  phoneNumber?: string;
  currentStep: string;
  createdAt: string;
  metadata?: {
    firstName?: string;
    lastName?: string;
    companyName?: string;
  };
}

const styles = {
  container: {
    padding: '24px',
    maxWidth: '1400px',
    margin: '0 auto',
  } as React.CSSProperties,
  header: {
    marginBottom: '32px',
  } as React.CSSProperties,
  title: {
    fontSize: '2rem',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '8px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '1rem',
    color: '#666',
  } as React.CSSProperties,
  filters: {
    display: 'flex',
    gap: '16px',
    marginBottom: '24px',
    alignItems: 'center',
  } as React.CSSProperties,
  filterLabel: {
    fontSize: '0.9rem',
    fontWeight: 'bold' as const,
    color: '#666',
    marginRight: '8px',
  } as React.CSSProperties,
  select: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: '1px solid #e0e0e0',
    fontSize: '0.95rem',
    background: 'white',
    color: '#333',
    cursor: 'pointer',
    minWidth: '250px',
  } as React.CSSProperties,
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '20px',
    marginBottom: '32px',
  } as React.CSSProperties,
  statCard: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
  statLabel: {
    fontSize: '0.9rem',
    color: '#666',
    marginBottom: '8px',
  } as React.CSSProperties,
  statValue: {
    fontSize: '2rem',
    fontWeight: 'bold' as const,
    color: '#667eea',
  } as React.CSSProperties,
  statTrend: {
    fontSize: '0.85rem',
    color: '#4CAF50',
    marginTop: '4px',
  } as React.CSSProperties,
  section: {
    background: 'white',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '1.3rem',
    fontWeight: 'bold' as const,
    color: '#333',
    marginBottom: '20px',
  } as React.CSSProperties,
  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
  } as React.CSSProperties,
  th: {
    textAlign: 'left' as const,
    padding: '12px',
    borderBottom: '2px solid #e0e0e0',
    color: '#666',
    fontWeight: 'bold' as const,
    fontSize: '0.9rem',
  } as React.CSSProperties,
  td: {
    padding: '12px',
    borderBottom: '1px solid #f0f0f0',
    fontSize: '0.9rem',
    color: '#333',
  } as React.CSSProperties,
  badge: (status: string) => ({
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    fontSize: '0.75rem',
    fontWeight: 'bold' as const,
    background: 
      status === 'complete' ? '#e8f5e9' :
      status === 'provisioning' ? '#fff3cd' :
      status === 'submitted' ? '#e3f2fd' :
      '#f5f5f5',
    color:
      status === 'complete' ? '#2E7D32' :
      status === 'provisioning' ? '#856404' :
      status === 'submitted' ? '#1565c0' :
      '#666',
  }),
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: '2px solid #e0e0e0',
  } as React.CSSProperties,
  tab: (active: boolean) => ({
    padding: '12px 24px',
    cursor: 'pointer',
    border: 'none',
    background: 'none',
    fontSize: '1rem',
    fontWeight: active ? 'bold' as const : 'normal' as const,
    color: active ? '#667eea' : '#666',
    borderBottom: active ? '3px solid #667eea' : 'none',
    marginBottom: '-2px',
  }),
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '8px',
    marginTop: '24px',
  } as React.CSSProperties,
  pageButton: (active: boolean) => ({
    padding: '8px 16px',
    cursor: 'pointer',
    border: '1px solid #e0e0e0',
    background: active ? '#667eea' : 'white',
    color: active ? 'white' : '#333',
    borderRadius: '6px',
    fontSize: '0.9rem',
  }),
};

export const AdminDashboard: React.FC = () => {
  const { user, hasAnyRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Check if user is project admin (can filter by tenant)
  const isProjectAdmin = hasAnyRole('PROJECT_ADMIN');
  
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [userActivities, setUserActivities] = useState<UserActivity[]>([]);
  const [loginStats, setLoginStats] = useState<LoginStats | null>(null);
  const [userDetails, setUserDetails] = useState<UserDetail[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Get tab from URL or default to 'overview'
  const tabFromUrl = searchParams.get('tab') as 'overview' | 'registrations' | 'activity' | 'users' | null;
  const [activeTab, setActiveTab] = useState<'overview' | 'registrations' | 'activity' | 'users'>(tabFromUrl || 'overview');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Update URL when tab changes
  const handleTabChange = (tab: 'overview' | 'registrations' | 'activity' | 'users') => {
    setActiveTab(tab);
    setPage(1);
    setSearchParams({ tab });
  };

  // Load tenants for dropdown (only for project admins)
  useEffect(() => {
    if (isProjectAdmin) {
      loadTenants();
    }
  }, [isProjectAdmin]);

  // Sync activeTab with URL
  useEffect(() => {
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [tabFromUrl]);

  // Load data when activeTab, page, or selectedTenant changes
  useEffect(() => {
    if (activeTab === 'overview') {
      loadStats();
    } else if (activeTab === 'registrations') {
      loadRegistrations();
    } else if (activeTab === 'activity') {
      loadUserActivities();
      loadLoginStats();
    } else if (activeTab === 'users') {
      loadUserDetails();
    }
  }, [activeTab, page, selectedTenant]);

  const loadTenants = async () => {
    try {
      const response = await apiClient.get('/api/admin/tenants');
      if (response.data.success) {
        setTenants(response.data.data.tenants);
      }
    } catch (err: any) {
      console.error('Failed to load tenants:', err);
    }
  };

  const loadStats = async () => {
    try {
      const params: any = {};
      if (selectedTenant) params.tenantId = selectedTenant;
      const response = await apiClient.get('/api/admin/stats', { params });
      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err: any) {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (selectedTenant) params.tenantId = selectedTenant;
      const response = await apiClient.get(`/api/admin/registrations`, { params });
      if (response.data.success) {
        setRegistrations(response.data.data.registrations);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (err: any) {
      setError('Failed to load registrations');
    } finally {
      setLoading(false);
    }
  };

  const loadUserActivities = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (selectedTenant) params.tenantId = selectedTenant;
      const response = await apiClient.get(`/api/admin/activity/users`, { params });
      if (response.data.success) {
        setUserActivities(response.data.data.activities);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (err: any) {
      setError('Failed to load user activities');
    } finally {
      setLoading(false);
    }
  };

  const loadLoginStats = async () => {
    try {
      const params: any = {};
      if (selectedTenant) params.tenantId = selectedTenant;
      const response = await apiClient.get('/api/admin/activity/logins', { params });
      if (response.data.success) {
        setLoginStats(response.data.data);
      }
    } catch (err: any) {
      console.error('Failed to load login stats:', err);
    }
  };

  const loadUserDetails = async () => {
    try {
      setLoading(true);
      const params: any = { page, limit: 20 };
      if (selectedTenant) params.tenantId = selectedTenant;
      const response = await apiClient.get(`/api/admin/users/details`, { params });
      if (response.data.success) {
        setUserDetails(response.data.data.users);
        setTotalPages(response.data.data.pagination.pages);
      }
    } catch (err: any) {
      setError('Failed to load user details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  if (loading && !stats) {
    return <LoadingSpinner message="Loading dashboard..." fullScreen />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Admin Dashboard</h1>
        <p style={styles.subtitle}>Monitor registrations and system health</p>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Tenant Filter (only for project admins) */}
      {isProjectAdmin && tenants.length > 0 && (
        <div style={styles.filters}>
          <span style={styles.filterLabel}>Filter by Tenant:</span>
          <select
            style={styles.select}
            value={selectedTenant}
            onChange={(e) => {
              setSelectedTenant(e.target.value);
              setPage(1);
            }}
          >
            <option value="">All Tenants</option>
            {tenants.map((tenant) => (
              <option key={tenant.tenantId} value={tenant.tenantId}>
                {tenant.companyName} ({tenant.tenantId.substring(0, 8)}...)
              </option>
            ))}
          </select>
        </div>
      )}

      <div style={styles.tabs}>
        <button
          style={styles.tab(activeTab === 'overview')}
          onClick={() => handleTabChange('overview')}
        >
          Overview
        </button>
        <button
          style={styles.tab(activeTab === 'registrations')}
          onClick={() => handleTabChange('registrations')}
        >
          Registrations
        </button>
        <button
          style={styles.tab(activeTab === 'activity')}
          onClick={() => handleTabChange('activity')}
        >
          User Activity
        </button>
        <button
          style={styles.tab(activeTab === 'users')}
          onClick={() => handleTabChange('users')}
        >
          Users
        </button>
      </div>

      {activeTab === 'overview' && stats && (
        <>
          {/* Stats Grid */}
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Users</div>
              <div style={styles.statValue}>{stats.overview.totalUsers}</div>
              <div style={styles.statTrend}>
                +{stats.trends?.users?.last7Days || 0} this week
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Total Tenants</div>
              <div style={styles.statValue}>{stats.overview.totalTenants}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Active Registrations</div>
              <div style={styles.statValue}>{stats.overview.activeRegistrations}</div>
              <div style={styles.statTrend}>
                +{stats.trends?.registrations?.last24Hours || 0} today
              </div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Completed</div>
              <div style={styles.statValue}>{stats.overview.completedRegistrations}</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Completion Rate</div>
              <div style={styles.statValue}>{stats.overview.completionRate}%</div>
            </div>

            <div style={styles.statCard}>
              <div style={styles.statLabel}>Failed</div>
              <div style={styles.statValue}>{stats.overview.failedRegistrations}</div>
            </div>
          </div>

          {/* Activity Metrics */}
          {stats.activity && (
            <>
              <h2 style={{...styles.sectionTitle, marginTop: '32px', marginBottom: '20px'}}>
                User Activity Metrics
              </h2>
              <div style={styles.statsGrid}>
                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Total Logins</div>
                  <div style={styles.statValue}>{stats.activity.totalLogins}</div>
                  <div style={styles.statTrend}>
                    +{stats.activity.loginTrend?.last24Hours || 0} today
                  </div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Unique Users Today</div>
                  <div style={styles.statValue}>{stats.activity.uniqueUsersToday}</div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Logins This Week</div>
                  <div style={styles.statValue}>{stats.activity.loginTrend?.last7Days || 0}</div>
                </div>

                <div style={styles.statCard}>
                  <div style={styles.statLabel}>Logins This Month</div>
                  <div style={styles.statValue}>{stats.activity.loginTrend?.last30Days || 0}</div>
                </div>
              </div>

              {/* Recent Logins */}
              {stats.activity.recentLogins && stats.activity.recentLogins.length > 0 && (
                <div style={styles.section}>
                  <h2 style={styles.sectionTitle}>Recent Logins</h2>
                  <table style={styles.table}>
                    <thead>
                      <tr>
                        <th style={styles.th}>User</th>
                        <th style={styles.th}>Timestamp</th>
                        <th style={styles.th}>IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(stats.activity.recentLogins || []).map((login, idx) => (
                        <tr key={idx}>
                          <td style={styles.td}>{login.userEmail}</td>
                          <td style={styles.td}>{formatDate(login.timestamp)}</td>
                          <td style={styles.td}>{login.ipAddress || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}

          {/* Recent Activity */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>Recent Registration Activity</h2>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Email</th>
                  <th style={styles.th}>Company</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Created</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recentActivity || []).map((activity) => (
                  <tr key={activity.sessionId}>
                    <td style={styles.td}>{activity.email}</td>
                    <td style={styles.td}>
                      {activity.metadata?.companyName || '-'}
                    </td>
                    <td style={styles.td}>
                      <span style={styles.badge(activity.currentStep)}>
                        {activity.currentStep}
                      </span>
                    </td>
                    <td style={styles.td}>{formatDate(activity.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {activeTab === 'registrations' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>All Registrations</h2>
          {loading ? (
            <LoadingSpinner message="Loading registrations..." />
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Session ID</th>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Phone</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Company</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {(registrations || []).map((reg) => (
                    <tr key={reg.sessionId}>
                      <td style={styles.td}>
                        <code style={{ fontSize: '0.85rem' }}>
                          {reg.sessionId.substring(0, 8)}...
                        </code>
                      </td>
                      <td style={styles.td}>{reg.email}</td>
                      <td style={styles.td}>{reg.phoneNumber || '-'}</td>
                      <td style={styles.td}>
                        {reg.metadata?.firstName && reg.metadata?.lastName
                          ? `${reg.metadata.firstName} ${reg.metadata.lastName}`
                          : '-'}
                      </td>
                      <td style={styles.td}>{reg.metadata?.companyName || '-'}</td>
                      <td style={styles.td}>
                        <span style={styles.badge(reg.currentStep)}>
                          {reg.currentStep}
                        </span>
                      </td>
                      <td style={styles.td}>{formatDate(reg.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={styles.pagination}>
                <button
                  style={styles.pageButton(false)}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      style={styles.pageButton(page === pageNum)}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  style={styles.pageButton(false)}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* User Activity Tab */}
      {activeTab === 'activity' && (
        <>
          {/* Login Statistics */}
          {loginStats && (
            <>
              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Top Users by Login Count</h2>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Login Count</th>
                      <th style={styles.th}>Last Login</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loginStats?.topUsers || []).map((user) => (
                      <tr key={user.userId}>
                        <td style={styles.td}>{user.userEmail}</td>
                        <td style={styles.td}>{user.loginCount}</td>
                        <td style={styles.td}>{formatDate(user.lastLogin)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div style={styles.section}>
                <h2 style={styles.sectionTitle}>Login Trend (Last 7 Days)</h2>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Date</th>
                      <th style={styles.th}>Login Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(loginStats?.trend || []).map((day) => (
                      <tr key={day.date}>
                        <td style={styles.td}>{new Date(day.date).toLocaleDateString()}</td>
                        <td style={styles.td}>{day.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {/* Activity Log */}
          <div style={styles.section}>
            <h2 style={styles.sectionTitle}>User Activity Log</h2>
            {loading ? (
              <LoadingSpinner message="Loading activities..." />
            ) : (
              <>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>User</th>
                      <th style={styles.th}>Event</th>
                      <th style={styles.th}>Timestamp</th>
                      <th style={styles.th}>IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(userActivities || []).map((activity) => (
                      <tr key={activity._id}>
                        <td style={styles.td}>{activity.userEmail}</td>
                        <td style={styles.td}>
                          <span style={styles.badge(activity.eventType)}>
                            {activity.eventName}
                          </span>
                        </td>
                        <td style={styles.td}>{formatDate(activity.timestamp)}</td>
                        <td style={styles.td}>{activity.ipAddress || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* Pagination */}
                <div style={styles.pagination}>
                  <button
                    style={styles.pageButton(false)}
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        style={styles.pageButton(page === pageNum)}
                        onClick={() => setPage(pageNum)}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    style={styles.pageButton(false)}
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </button>
                </div>
              </>
            )}
          </div>
        </>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>User Details</h2>
          {loading ? (
            <LoadingSpinner message="Loading users..." />
          ) : (
            <>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Email</th>
                    <th style={styles.th}>Name</th>
                    <th style={styles.th}>Role</th>
                    <th style={styles.th}>Tenant ID</th>
                    <th style={styles.th}>Login Count</th>
                    <th style={styles.th}>Last Login</th>
                    <th style={styles.th}>Last Activity</th>
                  </tr>
                </thead>
                <tbody>
                  {(userDetails || []).map((user) => (
                    <tr key={user._id}>
                      <td style={styles.td}>{user.email}</td>
                      <td style={styles.td}>
                        {user.firstName && user.lastName
                          ? `${user.firstName} ${user.lastName}`
                          : '-'}
                      </td>
                      <td style={styles.td}>
                        <span style={styles.badge(user.role)}>
                          {user.role}
                        </span>
                      </td>
                      <td style={styles.td}>
                        <code style={{ fontSize: '0.85rem' }}>
                          {user.tenantId.substring(0, 8)}...
                        </code>
                      </td>
                      <td style={styles.td}>{user.loginCount}</td>
                      <td style={styles.td}>
                        {user.lastLogin ? formatDate(user.lastLogin) : 'Never'}
                      </td>
                      <td style={styles.td}>
                        {user.lastActivity ? (
                          <div>
                            <div style={{fontSize: '0.85rem', color: '#666'}}>
                              {user.lastActivity.eventType}
                            </div>
                            <div style={{fontSize: '0.75rem', color: '#999'}}>
                              {formatDate(user.lastActivity.timestamp)}
                            </div>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div style={styles.pagination}>
                <button
                  style={styles.pageButton(false)}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      style={styles.pageButton(page === pageNum)}
                      onClick={() => setPage(pageNum)}
                    >
                      {pageNum}
                    </button>
                  );
                })}
                <button
                  style={styles.pageButton(false)}
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                >
                  Next
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
