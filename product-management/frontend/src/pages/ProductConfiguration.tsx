import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../services/apiClient';
import { styles } from '../styles/Products.styles';
import { Product } from '../types';
import VirtualAssistantConfig from './VirtualAssistantConfig';
import IdpConfig from './IdpConfig';
import ComputerVisionConfig from './ComputerVisionConfig';

const ProductConfiguration = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchProduct();
  }, [productId]);

  const fetchProduct = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/products/${productId}`);
      if (response.data.success) {
        setProduct(response.data.product);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch product');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p>Loading configuration...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <p style={{ color: 'red' }}>{error || 'Product not found'}</p>
          <button
            onClick={() => navigate('/products')}
            style={{
              marginTop: '16px',
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#2196F3',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: 'bold'
            }}
          >
            Back to Products
          </button>
        </div>
      </div>
    );
  }

  // Route to the appropriate configuration page based on product category
  switch (product.category) {
    case 'Virtual Assistant':
      return <VirtualAssistantConfig />;
    case 'IDP':
      return <IdpConfig />;
    case 'Computer Vision':
      return <ComputerVisionConfig />;
    default:
      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <p style={{ color: '#ff9800' }}>Configuration page for "{product.category}" is not yet available.</p>
            <button
              onClick={() => navigate('/products')}
              style={{
                marginTop: '16px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: '#2196F3',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              Back to Products
            </button>
          </div>
        </div>
      );
  }
};

export default ProductConfiguration;
