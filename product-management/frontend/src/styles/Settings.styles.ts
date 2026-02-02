import React from 'react';

export const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '2rem',
    marginLeft: '60px',
    transition: 'margin-left 0.3s',
  } as React.CSSProperties,
  containerMobile: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    marginLeft: '0',
    transition: 'margin-left 0.3s',
  } as React.CSSProperties,
  card: {
    backgroundColor: 'white',
    padding: '3rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    maxWidth: '1000px',
    margin: '0 auto',
  } as React.CSSProperties,
  cardMobile: {
    backgroundColor: 'white',
    padding: '1.5rem',
    borderRadius: '8px',
    boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)',
    maxWidth: '1000px',
    margin: '0 auto',
  } as React.CSSProperties,
  title: {
    fontSize: '2.5rem',
    color: '#333',
    marginBottom: '1rem',
  } as React.CSSProperties,
  titleMobile: {
    fontSize: '1.75rem',
    color: '#333',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  description: {
    fontSize: '1.125rem',
    color: '#666',
    lineHeight: '1.6',
  } as React.CSSProperties,
  descriptionMobile: {
    fontSize: '1rem',
    color: '#666',
    lineHeight: '1.5',
  } as React.CSSProperties,
};
