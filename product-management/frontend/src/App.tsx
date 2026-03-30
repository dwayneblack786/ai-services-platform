import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import VerifyEmail from './pages/VerifyEmail';
import OAuthCallback from './pages/OAuthCallback';
import CompleteCompanyDetails from './pages/CompleteCompanyDetails';
import { InitiateRegistration } from './pages/InitiateRegistration';
import { VerifyPhone } from './pages/VerifyPhone';
import { SetupAccount } from './pages/SetupAccount';
import { SetupCompany } from './pages/SetupCompany';
import { ReviewSubmit } from './pages/ReviewSubmit';
import { RegistrationStatusPage } from './pages/RegistrationStatus';
import AdminDashboard from './pages/AdminDashboard';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Products from './pages/Products';
import ProductSignup from './pages/ProductSignup';
import ProductExplore from './pages/ProductExplore';
import ProductConfiguration from './pages/ProductConfiguration';
import VirtualAssistantConfig from './pages/VirtualAssistantConfig';
import IdpConfig from './pages/IdpConfig';
import ComputerVisionConfig from './pages/ComputerVisionConfig';
import ListingLift from './pages/ListingLift';
import ListingEditor from './pages/ListingEditor';
import ListingPipeline from './pages/ListingPipeline';
import ListingAnalysis from './pages/ListingAnalysis';
import ProductSubscriptionGate from './components/ProductSubscriptionGate';
import VoiceDemo from './pages/VoiceDemo';
import Subscriptions from './pages/Subscriptions';
import Payment from './pages/Payment';
import Transactions from './pages/Transactions';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import Tenants from './pages/Tenants';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import Layout from './components/Layout';
import PromptManagement from './pages/PromptManagement';
import PromptEditor from './pages/PromptEditor';
import TemplateSelector from './components/TemplateSelector';
import TenantPrompts from './pages/TenantPrompts';
// import dotEnv from  'dotenv';
// dotEnv.config();

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <Routes>
          <Route path="/home" element={<Layout><Home /></Layout>} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/oauth-callback" element={<OAuthCallback />} />
          <Route path="/complete-company-details" element={<CompleteCompanyDetails />} />
          
          {/* New Self-Service Registration Flow */}
          <Route path="/register/initiate" element={<InitiateRegistration />} />
          <Route path="/register/verify-phone" element={<VerifyPhone />} />
          <Route path="/register/setup-account" element={<SetupAccount />} />
          <Route path="/register/setup-company" element={<SetupCompany />} />
          <Route path="/register/review" element={<ReviewSubmit />} />
          <Route path="/register/status/:registrationId" element={<RegistrationStatusPage />} />
          
          {/* Admin Dashboard - ADMIN and PROJECT_ADMIN only */}
          <Route
            path="/admin"
            element={
              <RoleProtectedRoute allowedRoles={['ADMIN', 'PROJECT_ADMIN']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </RoleProtectedRoute>
            }
          />
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
            path="/products/:productId/configure/:tab"
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
          {/* Prompt Management System (PMS) Routes */}
          <Route
            path="/prompts"
            element={
              <ProtectedRoute>
                <Layout>
                  <PromptManagement />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompts/templates"
            element={
              <ProtectedRoute>
                <Layout>
                  <TemplateSelector />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompts/new"
            element={
              <ProtectedRoute>
                <Layout>
                  <PromptEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/prompts/edit/:id"
            element={
              <ProtectedRoute>
                <Layout>
                  <PromptEditor />
                </Layout>
              </ProtectedRoute>
            }
          />
          {/* Tenant Prompts - Standalone full-page route */}
          <Route
            path="/tenant-prompts"
            element={
              <ProtectedRoute>
                <Layout>
                  <TenantPrompts />
                </Layout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/voice-demo"
            element={
              <VoiceDemo />
            }
          />
          {/* ListingLift product routes — subscription-gated */}
          <Route path="/listinglift" element={<ProtectedRoute><Layout><ProductSubscriptionGate productSlug="listing-lift"><ListingLift /></ProductSubscriptionGate></Layout></ProtectedRoute>} />
          <Route path="/listinglift/new" element={<ProtectedRoute><Layout><ProductSubscriptionGate productSlug="listing-lift"><ListingEditor /></ProductSubscriptionGate></Layout></ProtectedRoute>} />
          <Route path="/listinglift/:id" element={<ProtectedRoute><Layout><ProductSubscriptionGate productSlug="listing-lift"><ListingAnalysis /></ProductSubscriptionGate></Layout></ProtectedRoute>} />
          <Route path="/listinglift/:id/pipeline" element={<ProtectedRoute><Layout><ProductSubscriptionGate productSlug="listing-lift"><ListingPipeline /></ProductSubscriptionGate></Layout></ProtectedRoute>} />

          <Route path="/" element={<HomeRedirect />} />
        </Routes>
      </Router>
    </AuthProvider>
    </ErrorBoundary>
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
