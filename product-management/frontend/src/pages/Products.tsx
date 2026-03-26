import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles } from '../../src/styles/Products.styles';
import { useAuth } from '../context/AuthContext';
import { getApiUrl } from '../config/api';
import ProductForm from '../components/ProductForm';
import { Product, UserProduct } from '../types';
import { getProductImage } from '../theme/images';
import { realEstateTheme } from '../theme/realEstateTheme';

const Products = () => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [userProducts, setUserProducts] = useState<UserProduct[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const categories = ['All', 'Virtual Assistant', 'IDP', 'Computer Vision'];

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    const handleClickOutside = () => {
      if (openMenuId) {
        setOpenMenuId(null);
      }
    };
    
    window.addEventListener('resize', handleResize);
    document.addEventListener('click', handleClickOutside);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('click', handleClickOutside);
    };
  }, [openMenuId]);

  useEffect(() => {
    fetchProducts();
    if (user) {
      fetchUserProducts();
      fetchSubscriptions();
    }
  }, [user]);

  useEffect(() => {
    let filtered = products;
    
    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }
    
    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(p => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    setFilteredProducts(filtered);
  }, [selectedCategory, searchTerm, products]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(getApiUrl('api/products'));
      if (response.data.success) {
        setProducts(response.data.products);
        setFilteredProducts(response.data.products);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserProducts = async () => {
    try {
      const response = await apiClient.get(getApiUrl('api/user-products'));
      if (response.data.success) {
        setUserProducts(response.data.userProducts);
      }
    } catch (err: any) {
      console.error('Failed to fetch user products:', err);
    }
  };

  const fetchSubscriptions = async () => {
    try {
      const response = await apiClient.get(getApiUrl('api/subscriptions'));
      if (response.data.success) {
        setSubscriptions(response.data.subscriptions);
      }
    } catch (err: any) {
      console.error('Failed to fetch subscriptions:', err);
    }
  };

  const hasProduct = (productId: string) => {
    // Check if user has active subscription OR user-product access
    const hasSubscription = subscriptions.some(
      sub => sub.productId === productId && (sub.status === 'active' || sub.status === 'trial')
    );
    const hasUserProduct = userProducts.some(up => up.productId === productId);
    return hasSubscription || hasUserProduct;
  };

  const handleProductClick = (productId: string) => {
    if (hasProduct(productId)) {
      navigate(`/products/${productId}/configure`);
    } else {
      navigate(`/products/${productId}/explore`);
    }
  };

  const handleAddProduct = () => {
    setShowAddModal(true);
  };

  const handleEditProduct = (product: Product) => {
    setSelectedProduct(product);
    setShowEditModal(true);
    setOpenMenuId(null);
  };

  const handleToggleStatus = async (product: Product) => {
    try {
      const newStatus = product.status === 'active' ? 'beta' : 'active';
      await apiClient.put(
        getApiUrl(`api/products/${product._id}`),
        { ...product, status: newStatus }
      );
      alert(`Product ${newStatus === 'active' ? 'enabled' : 'disabled'} successfully`);
      fetchProducts();
      setOpenMenuId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to update product status');
    }
  };

  const handleRetireProduct = async (product: Product) => {
    if (!confirm(`Are you sure you want to retire "${product.name}"? This will set its status to coming-soon.`)) {
      return;
    }
    try {
      await apiClient.put(
        getApiUrl(`api/products/${product._id}`),
        { ...product, status: 'coming-soon' }
      );
      alert('Product retired successfully');
      fetchProducts();
      setOpenMenuId(null);
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to retire product');
    }
  };

  if (loading) {
    return (
      <div style={isMobile ? styles.containerMobile : styles.container}>
        <div style={styles.loadingCard}>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={isMobile ? styles.containerMobile : styles.container}>
        <div style={styles.loadingCard}>
          <p style={styles.errorText}>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={isMobile ? styles.containerMobile : styles.container}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <h1 style={isMobile ? styles.titleMobile : styles.title}>AI Services Catalog</h1>
        {isAdmin() && (
          <button
            onClick={handleAddProduct}
            style={{
              padding: '12px 24px',
              backgroundColor: '#4CAF50',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '1rem',
              fontWeight: '600',
              cursor: 'pointer',
              minHeight: '44px',
              transition: 'all 0.3s ease'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#45a049'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4CAF50'}
          >
            + Add New Product
          </button>
        )}
      </div>
      
      {/* Search Input */}
      <div style={styles.searchContainer}>
        <input
          type="text"
          placeholder="Search products by name, description, or tags..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>
      
      <div style={styles.categoryContainer}>
        {categories.map(category => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={selectedCategory === category ? styles.categoryButtonActive : styles.categoryButton}
          >
            {category}
          </button>
        ))}
      </div>

      {filteredProducts.length === 0 ? (
        <div style={styles.loadingCard}>
          <p>No products found matching your criteria.</p>
        </div>
      ) : (
        <div style={isMobile ? styles.productsGridMobile : styles.productsGrid}>
        {filteredProducts.map(product => {
          const productImage = getProductImage(product.subCategory || '', product.category || '');
          return (
          <div 
            key={product._id} 
            style={{
              ...styles.card,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.15)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
            }}
          >
            {/* Product Image */}
            <div style={{
              width: '100%',
              height: '200px',
              overflow: 'hidden',
              position: 'relative',
            }}>
              <img 
                src={productImage}
                alt={product.name}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              <div style={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                height: '50%',
                background: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
              }} />
              
              {/* Status Badge Overlay */}
              <div style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
              }}>
                <span style={{
                  ...styles.statusBadge,
                  background: product.status === 'active' ? '#4CAF50' : product.status === 'beta' ? '#FFA726' : '#9E9E9E',
                }}>
                  {product.status}
                </span>
              </div>
            </div>

            {/* Card Content */}
            <div style={{ padding: '1.5rem' }}>
              <div style={styles.cardHeader}>
                <div>
                  <h2 style={isMobile ? styles.cardTitleMobile : styles.cardTitle}>{product.name}</h2>
                  <p style={styles.cardSubtitle}>
                    {product.category}{product.subCategory && ` - ${product.subCategory}`}
                  </p>
                </div>
                {isAdmin() && (
                  <div style={{ position: 'relative' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === product._id ? null : (product._id || null));
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        fontSize: '1.5rem',
                        cursor: 'pointer',
                        padding: '4px 8px',
                        color: '#666',
                        minHeight: '44px',
                        minWidth: '44px'
                      }}
                    >
                      ⋮
                    </button>
                    {openMenuId === product._id && (
                      <div
                        style={{
                          position: 'absolute',
                          right: 0,
                          top: '100%',
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          minWidth: '180px',
                          overflow: 'hidden'
                        }}
                      >
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditProduct(product);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            background: 'white',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            minHeight: '44px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          ✏️ Edit Product
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleStatus(product);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            background: 'white',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            minHeight: '44px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          {product.status === 'active' ? '⏸️ Disable' : '▶️ Enable'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRetireProduct(product);
                          }}
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            border: 'none',
                            background: 'white',
                            textAlign: 'left',
                            cursor: 'pointer',
                            fontSize: '0.95rem',
                            color: '#d32f2f',
                            minHeight: '44px'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#ffebee'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                        >
                          🗄️ Retire Product
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            
            <p style={styles.description}>
              {product.description}
            </p>
            
            <div style={styles.featuresSection}>
              <strong style={styles.featuresTitle}>Key Features:</strong>
              {product.features.map((feature, index) => (
                <div key={index} style={styles.feature}>
                  • {feature}
                </div>
              ))}
            </div>
            
            <div style={styles.pricingBox}>
              <div style={styles.pricingLabel}>Pricing</div>
              <div style={styles.pricingValue}>
                {product.pricing.model}
                {product.pricing.tiers && product.pricing.tiers.length > 0 && (
                  <span> - Starting at ${Math.min(...product.pricing.tiers.map(t => t.price))}/mo</span>
                )}
              </div>
            </div>
            
            {product.industries && product.industries.length > 0 && (
              <div style={styles.industriesContainer}>
                {product.industries.map((industry, index) => (
                  <span key={index} style={styles.industryTag}>
                    {industry}
                  </span>
                ))}
              </div>
            )}
            
            <div style={styles.tagsContainer}>
              {product.tags.map((tag, index) => (
                <span key={index} style={styles.tag}>
                  {tag}
                </span>
              ))}
            </div>

            {(product._id && hasProduct(product._id)) ? (
              <button
                onClick={() => product._id && handleProductClick(product._id)}
                style={styles.viewButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#1976D2'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#2196F3'}
              >
                View Details
              </button>
            ) : (
              <button
                onClick={() => product._id && handleProductClick(product._id)}
                style={styles.signupButton}
                onMouseEnter={(e) => e.currentTarget.style.background = '#45a049'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#4CAF50'}
              >
                Explore
              </button>
            )}
            </div>
          </div>
        );})}
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {(showAddModal || showEditModal) && (
        <ProductForm
          product={showEditModal ? selectedProduct : null}
          onClose={() => {
            setShowAddModal(false);
            setShowEditModal(false);
            setSelectedProduct(null);
          }}
          onSuccess={() => {
            fetchProducts();
          }}
        />
      )}
    </div>
  );
};

export default Products;
