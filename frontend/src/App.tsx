import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import OAuthCallback from './pages/OAuthCallback';
import CompleteCompanyDetails from './pages/CompleteCompanyDetails';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Products from './pages/Products';
import ProductSignup from './pages/ProductSignup';
import ProductExplore from './pages/ProductExplore';
import ProductConfiguration from './pages/ProductConfiguration';
import VirtualAssistantConfig from './pages/VirtualAssistantConfig';
import IdpConfig from './pages/IdpConfig';
import ComputerVisionConfig from './pages/ComputerVisionConfig';
import Subscriptions from './pages/Subscriptions';
import Payment from './pages/Payment';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Tenants from './pages/Tenants';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
// import dotEnv from  'dotenv';
// dotEnv.config();

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/home" element={<Layout><Home /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/complete-company-details" element={<CompleteCompanyDetails />} />
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Layout>
                  <Dashboard />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/users"
            element={
              <ProtectedRoute>
                <Layout>
                  <Users />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products"
            element={
              <Layout>
                <Products />
              </Layout>
            }
          />
          <Route
            path="/products/:productId/explore"
            element={
              <Layout>
                <ProductExplore />
              </Layout>
            }
          />
          <Route
            path="/products/:productId/signup"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProductSignup />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/products/:productId/configure"
            element={
              <ProtectedRoute>
                <Layout>
                  <ProductConfiguration />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/subscriptions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Subscriptions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <Layout>
                  <Payment />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/transactions"
            element={
              <ProtectedRoute>
                <Layout>
                  <Transactions />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Layout>
                  <Reports />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/tenants"
            element={
              <ProtectedRoute>
                <Layout>
                  <Tenants />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

// Component to handle root redirect based on auth status
const HomeRedirect = () => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh' 
      }}>
        Loading...
      </div>
    );
  }
  
  return <Navigate to={user ? "/dashboard" : "/home"} replace />;
};

export default App;
