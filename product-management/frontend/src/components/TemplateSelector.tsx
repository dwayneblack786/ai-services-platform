/**
 * TemplateSelector Component (Phase 0.5)
 *
 * Displays product-specific templates (voice + chat) for users to select.
 * Users only see templates for products they're subscribed to.
 *
 * Flow: AssistantChannels → TemplateSelector → PromptEditor (pre-filled)
 */

import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import styled from '@emotion/styled';
import { IPromptVersion } from '../services/promptApi';
import TemplateCard from './TemplateCard';
import apiClient from '../services/apiClient';

// Styled Components
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  padding: 24px;
`;

const Header = styled.div`
  margin-bottom: 32px;
`;

const Title = styled.h1`
  font-size: 32px;
  font-weight: 600;
  color: #333;
  margin: 0 0 8px 0;
`;

const Subtitle = styled.div`
  font-size: 16px;
  color: #666;
  margin-bottom: 16px;
`;

const ProductInfo = styled.div`
  background: #f8f9fa;
  border-left: 4px solid #1976d2;
  padding: 12px 16px;
  border-radius: 6px;
  margin-bottom: 24px;
`;

const ProductName = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
`;

const ProductMeta = styled.div`
  font-size: 14px;
  color: #666;
`;

const TemplatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-top: 24px;
`;

const LoadingState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #666;
  font-size: 16px;
`;

const ErrorMessage = styled.div`
  background: #ffebee;
  color: #c62828;
  padding: 16px;
  border-radius: 6px;
  margin-bottom: 24px;
  font-size: 14px;
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #666;
  font-size: 16px;
`;

const BackButton = styled.button`
  padding: 8px 16px;
  background: transparent;
  color: #1976d2;
  border: 1px solid #1976d2;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: 16px;
  transition: all 0.2s;

  &:hover {
    background: #e3f2fd;
  }
`;

const Note = styled.div`
  margin-top: 32px;
  padding: 16px;
  background: #fff9e6;
  border-left: 4px solid #ffc107;
  border-radius: 6px;
  font-size: 14px;
  color: #666;
`;

interface TemplateSelectorProps {
  productId?: string;
}

interface Product {
  _id: string;
  name: string;
  category: string;
  industries: string[];
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ productId: propProductId }) => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Get productId from props or URL
  const productId = propProductId || searchParams.get('productId');
  const channelType = searchParams.get('channelType'); // Filter by channel if provided

  const [templates, setTemplates] = useState<IPromptVersion[]>([]);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (productId) {
      loadTemplatesAndProduct();
    } else {
      setError('No product ID provided');
      setLoading(false);
    }
  }, [productId]);

  const loadTemplatesAndProduct = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load templates for this product
      const templatesResponse = await apiClient.get(
        `/api/pms/prompts/templates/product/${productId}`
      );

      let fetchedTemplates = templatesResponse.data;

      // Filter by channel type if specified in URL
      if (channelType) {
        fetchedTemplates = fetchedTemplates.filter(
          (t: IPromptVersion) => t.channelType === channelType
        );
      }

      setTemplates(fetchedTemplates);

      // Load product info
      const productResponse = await apiClient.get(`/api/products/${productId}`);
      setProduct(productResponse.data);
    } catch (err: any) {
      console.error('Error loading templates:', err);
      setError(err.response?.data?.error || 'Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (template: IPromptVersion) => {
    // Navigate to PromptEditor with template pre-fill
    navigate(`/prompts/new?templateId=${template._id}&productId=${productId}&channelType=${template.channelType}`);
  };

  const handleBack = () => {
    navigate(-1); // Go back to previous page (AssistantChannels)
  };

  if (loading) {
    return (
      <Container>
        <LoadingState>Loading templates...</LoadingState>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <BackButton onClick={handleBack}>← Back</BackButton>
        <ErrorMessage>{error}</ErrorMessage>
      </Container>
    );
  }

  if (templates.length === 0) {
    return (
      <Container>
        <BackButton onClick={handleBack}>← Back</BackButton>
        <EmptyState>
          {channelType
            ? `No ${channelType} templates available for this product.`
            : 'No templates available for this product.'}
        </EmptyState>
      </Container>
    );
  }

  return (
    <Container>
      <BackButton onClick={handleBack}>← Back to Assistant Channels</BackButton>

      <Header>
        <Title>Select a Template</Title>
        <Subtitle>
          Choose a pre-configured template to get started quickly
        </Subtitle>

        {product && (
          <ProductInfo>
            <ProductName>{product.name}</ProductName>
            <ProductMeta>
              Category: {product.category}
              {product.industries && product.industries.length > 0 && (
                <> • Industry: {product.industries.join(', ')}</>
              )}
            </ProductMeta>
          </ProductInfo>
        )}
      </Header>

      <TemplatesGrid>
        {templates.map((template) => (
          <TemplateCard
            key={template._id}
            template={template}
            onSelect={handleTemplateSelect}
          />
        ))}
      </TemplatesGrid>

      <Note>
        💡 <strong>Note:</strong> Templates are pre-configured with industry best practices
        for {product?.industries?.[0] || 'your industry'}. You can customize all fields after
        selecting a template.
      </Note>
    </Container>
  );
};

export default TemplateSelector;
