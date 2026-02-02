import { useState, useEffect } from 'react';
import apiClient from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import { useSearchParams } from 'react-router-dom';
import { User, UserRole } from '../types/shared';
import { styles } from '../../src/styles/Users.styles';

const Users = () => {
  const { hasRole, user } = useAuth();
  const [searchParams] = useSearchParams();
  const viewMode = searchParams.get('view') || 'tenant';
  const [users, setUsers] = useState<User[]>([]);
  const [tenants, setTenants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newTenantId, setNewTenantId] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState<UserRole | 'ALL'>('ALL');
  const [createUserData, setCreateUserData] = useState({
    email: '',
    name: '',
    password: '',
    role: UserRole.CLIENT,
    tenantId: user?.tenantId || ''
  });

  const isProjectAdmin = hasRole(UserRole.PROJECT_ADMIN);
  const isAdmin = hasRole(UserRole.ADMIN);
  const isAllView = viewMode === 'all' && isProjectAdmin;
  const canCreateUser = isAdmin || isProjectAdmin;

  useEffect(() => {
    fetchUsers();
    if (isProjectAdmin) {
      fetchTenants();
    }
  }, [viewMode]);

  const fetchUsers = async () => {
    try {
      let response;
      if (isAllView) {
        // Admin viewing all users
        response = await apiClient.get('/api/tenants/users/all');
      } else {
        // Tenant-specific view
        response = await apiClient.get(`/api/tenants/${user?.tenantId}/users`);
      }
      if (response.data.success) {
        setUsers(response.data.users);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await apiClient.get('/api/tenants');
      if (response.data.success) {
        setTenants(response.data.tenants);
      }
    } catch (err) {
      console.error('Failed to load tenants:', err);
    }
  };

  const handleTenantChange = async (userId: string) => {
    if (!newTenantId) return;

    try {
      const response = await apiClient.put(
        `/api/tenants/users/${userId}/tenant`,
        { tenantId: newTenantId }
      );

      if (response.data.success) {
        // Update local state
        setUsers(users.map(u => 
          u.id === userId ? { ...u, tenantId: newTenantId } : u
        ));
        setEditingUserId(null);
        setNewTenantId('');
      }
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update tenant');
    }
  };

  const handleCreateUser = async () => {
    // Validate form
    if (!createUserData.email || !createUserData.name || !createUserData.password) {
      alert('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(createUserData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    if (createUserData.password.length < 6) {
      alert('Password must be at least 6 characters');
      return;
    }

    try {
      // Use signup endpoint to create user
      const response = await apiClient.post(
        '/api/auth/signup',
        {
          email: createUserData.email,
          password: createUserData.password,
          name: createUserData.name,
          tenantId: createUserData.tenantId,
          role: createUserData.role,
          isNewCustomer: false
        },
        { withCredentials: true }
      );

      if (response.data.success) {
        alert('User created successfully! They will receive a verification email.');
        setShowCreateModal(false);
        setCreateUserData({
          email: '',
          name: '',
          password: '',
          role: UserRole.CLIENT,
          tenantId: user?.tenantId || ''
        });
        fetchUsers(); // Refresh the user list
      }
    } catch (err: any) {
      console.error('Error creating user:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.details || 'Failed to create user';
      alert(`Error: ${errorMessage}`);
    }
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

  // Filter users based on search and filter criteria
  const filteredUsers = users.filter(u => {
    const matchesSearch = !searchTerm || 
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = filterRole === 'ALL' || u.role === filterRole;
    return matchesSearch && matchesRole;
  });

  if (loading) {
    return (
      <div style={styles.container}>
        <p>Loading users...</p>
      </div>
    );
  }

  // Restrict view=all to PROJECT_ADMIN only
  if (viewMode === 'all' && !isProjectAdmin) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.title}>Access Denied</h1>
          <p style={styles.description}>
            You need project administrator privileges to view all users.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.headerContainer}>
          <div>
            <h1 style={styles.title}>
              {isAllView ? 'All Users (Project Admin View)' : 'My Tenant Users'}
            </h1>
            <p style={styles.description}>
              {isAllView 
                ? 'View and manage all users across all tenants. You can reassign users to different tenants.' 
                : `View users in your tenant${isProjectAdmin ? '. Switch to Settings > All Users to see all users.' : '.'}`
              }
            </p>
          </div>
          {canCreateUser && (
            <button 
              style={styles.createButton} 
              onClick={() => {
                setCreateUserData({
                  email: '',
                  name: '',
                  password: '',
                  role: UserRole.CLIENT,
                  tenantId: isAllView ? '' : (user?.tenantId || '')
                });
                setShowCreateModal(true);
              }}
            >
              <span style={styles.buttonIcon}>➕</span>
              Create New User
            </button>
          )}
        </div>

        {error && <p style={styles.error}>{error}</p>}

        {/* Search and Filter */}
        <div style={styles.searchFilterContainer}>
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={styles.searchInput}
          />
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value as UserRole | 'ALL')}
            style={styles.filterSelect}
          >
            <option value="ALL">All Roles</option>
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.PROJECT_ADMIN}>Project Admin</option>
            <option value={UserRole.ANALYST}>Analyst</option>
            <option value={UserRole.DEVELOPER}>Developer</option>
            <option value={UserRole.CLIENT}>Client</option>
          </select>
        </div>

        {/* Create User Modal */}
        {showCreateModal && (
          <div style={styles.modalOverlay}>
            <div style={styles.modal}>
              <h2 style={styles.modalTitle}>Create New User</h2>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Email *</label>
                <input
                  type="email"
                  value={createUserData.email}
                  onChange={(e) => setCreateUserData({...createUserData, email: e.target.value})}
                  style={styles.input}
                  placeholder="user@example.com"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Name *</label>
                <input
                  type="text"
                  value={createUserData.name}
                  onChange={(e) => setCreateUserData({...createUserData, name: e.target.value})}
                  style={styles.input}
                  placeholder="John Doe"
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Password * (min 6 characters)</label>
                <input
                  type="password"
                  value={createUserData.password}
                  onChange={(e) => setCreateUserData({...createUserData, password: e.target.value})}
                  style={styles.input}
                  placeholder="••••••"
                  minLength={6}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Role *</label>
                <select
                  value={createUserData.role}
                  onChange={(e) => setCreateUserData({...createUserData, role: e.target.value as UserRole})}
                  style={styles.select}
                >
                  <option value={UserRole.CLIENT}>Client</option>
                  <option value={UserRole.DEVELOPER}>Developer</option>
                  <option value={UserRole.ANALYST}>Analyst</option>
                  <option value={UserRole.ADMIN}>Admin</option>
                  {(isAllView || createUserData.role === UserRole.PROJECT_ADMIN) && (
                    <option value={UserRole.PROJECT_ADMIN}>Project Admin</option>
                  )}
                </select>
              </div>

              {isAllView && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tenant ID *</label>
                  <select
                    value={createUserData.tenantId}
                    onChange={(e) => setCreateUserData({...createUserData, tenantId: e.target.value})}
                    style={styles.select}
                  >
                    <option value="">Select Tenant</option>
                    {tenants.map(tenant => (
                      <option key={tenant.tenantId} value={tenant.tenantId}>
                        {tenant.tenantId} ({tenant.users.length} users)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {!isAllView && (
                <div style={styles.formGroup}>
                  <label style={styles.label}>Tenant ID</label>
                  <input
                    type="text"
                    value={createUserData.tenantId}
                    style={{...styles.input, backgroundColor: '#f5f5f5'}}
                    disabled
                  />
                </div>
              )}

              <div style={styles.modalActions}>
                <button onClick={handleCreateUser} style={styles.saveButton}>
                  Create User
                </button>
                <button 
                  onClick={() => {
                    setShowCreateModal(false);
                    setCreateUserData({
                      email: '',
                      name: '',
                      password: '',
                      role: UserRole.CLIENT,
                      tenantId: user?.tenantId || ''
                    });
                  }} 
                  style={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr style={styles.tableHeader}>
                <th style={styles.th}>Name</th>
                <th style={styles.th}>Email</th>
                <th style={styles.th}>Role</th>
                <th style={styles.th}>Tenant ID</th>
                <th style={styles.th}>Auth Provider</th>
                {isAllView && <th style={styles.th}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr><td colSpan={isAllView ? 6 : 5} style={{...styles.td, textAlign: 'center', padding: '2rem'}}>
                  No users found matching your search criteria.
                </td></tr>
              ) : (
                filteredUsers.map(user => (
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
                  <td style={styles.td}>
                    {editingUserId === user.id ? (
                      <select
                        value={newTenantId}
                        onChange={(e) => setNewTenantId(e.target.value)}
                        style={styles.select}
                      >
                        <option value="">Select Tenant</option>
                        {tenants.map(tenant => (
                          <option key={tenant.tenantId} value={tenant.tenantId}>
                            {tenant.tenantId} ({tenant.users.length} users)
                          </option>
                        ))}
                      </select>
                    ) : (
                      <code style={styles.tenantCode}>{user.tenantId}</code>
                    )}
                  </td>
                  <td style={styles.td}>{user.authProvider || 'N/A'}</td>
                  {isAllView && (
                    <td style={styles.td}>
                      {editingUserId === user.id ? (
                        <div style={styles.actionButtons}>
                          <button
                            onClick={() => handleTenantChange(user.id)}
                            style={styles.saveButton}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => {
                              setEditingUserId(null);
                              setNewTenantId('');
                            }}
                            style={styles.cancelButton}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingUserId(user.id);
                            setNewTenantId(user.tenantId);
                          }}
                          style={styles.editButton}
                        >
                          Change Tenant
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {users.length === 0 && (
          <p style={styles.noData}>No users found</p>
        )}
      </div>
    </div>
  );
};

export default Users;
