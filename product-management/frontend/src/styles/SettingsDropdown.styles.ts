import React from 'react';

export const styles = {
  container: {
    position: 'relative',
    display: 'inline-block',
  } as React.CSSProperties,
  button: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '45px',
    height: '45px',
    padding: '0',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '50%',
    color: '#000',
    fontSize: '2rem',
    cursor: 'pointer',
    boxShadow: 'none',
    transition: 'transform 0.2s',
    filter: 'brightness(0.8)',
  } as React.CSSProperties,
  icon: {
    fontSize: '1.25rem',
  } as React.CSSProperties,
  label: {
    fontWeight: '500',
  } as React.CSSProperties,
  arrow: {
    fontSize: '0.75rem',
  } as React.CSSProperties,
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '0.5rem',
    backgroundColor: '#fff',
    border: '1px solid #ddd',
    borderRadius: '4px',
    boxShadow: '0 4px 10px rgba(0, 0, 0, 0.15)',
    minWidth: '200px',
    overflow: 'hidden',
  } as React.CSSProperties,
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    width: '100%',
    padding: '0.75rem 1rem',
    backgroundColor: 'transparent',
    border: 'none',
    color: '#333',
    fontSize: '1rem',
    cursor: 'pointer',
    textAlign: 'left',
    transition: 'background-color 0.2s',
  } as React.CSSProperties,
  itemIcon: {
    fontSize: '1.25rem',
  } as React.CSSProperties,
};
