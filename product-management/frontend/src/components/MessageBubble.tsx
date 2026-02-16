import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import DOMPurify from 'dompurify';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  intent?: string;
  showIntent?: boolean;
}

/**
 * MessageBubble Component
 * Renders individual chat messages with markdown support for assistant responses
 * User messages are displayed as plain text
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  intent,
  showIntent
}) => {
  // Sanitize HTML to prevent XSS attacks
  const sanitizedContent = DOMPurify.sanitize(content);

  return (
    <div style={{
      display: 'flex',
      justifyContent: role === 'user' ? 'flex-end' : 'flex-start',
      marginBottom: '12px'
    }}>
      <div style={{
        maxWidth: '70%',
        padding: '12px 16px',
        borderRadius: '12px',
        backgroundColor: role === 'user' ? '#4f46e5' : '#ffffff',
        color: role === 'user' ? '#ffffff' : '#000000',
        boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>
        {role === 'assistant' ? (
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
            components={{
              // Style markdown elements for better readability
              p: ({node, ...props}) => (
                <p style={{ margin: '0 0 8px 0', lineHeight: '1.6' }} {...props} />
              ),
              ul: ({node, ...props}) => (
                <ul style={{ marginLeft: '20px', marginBottom: '8px' }} {...props} />
              ),
              ol: ({node, ...props}) => (
                <ol style={{ marginLeft: '20px', marginBottom: '8px' }} {...props} />
              ),
              li: ({node, ...props}) => (
                <li style={{ marginBottom: '4px' }} {...props} />
              ),
              h1: ({node, ...props}) => (
                <h1 style={{ fontSize: '1.5em', marginBottom: '8px', fontWeight: 'bold' }} {...props} />
              ),
              h2: ({node, ...props}) => (
                <h2 style={{ fontSize: '1.3em', marginBottom: '8px', fontWeight: 'bold' }} {...props} />
              ),
              h3: ({node, ...props}) => (
                <h3 style={{ fontSize: '1.1em', marginBottom: '8px', fontWeight: 'bold' }} {...props} />
              ),
              code: ({node, inline, ...props}) =>
                inline ? (
                  <code
                    style={{
                      backgroundColor: '#f3f4f6',
                      padding: '2px 6px',
                      borderRadius: '3px',
                      fontFamily: 'monospace',
                      fontSize: '0.9em'
                    }}
                    {...props}
                  />
                ) : (
                  <code
                    style={{
                      display: 'block',
                      backgroundColor: '#f3f4f6',
                      padding: '12px',
                      borderRadius: '6px',
                      overflowX: 'auto',
                      fontFamily: 'monospace',
                      fontSize: '0.9em',
                      marginBottom: '8px'
                    }}
                    {...props}
                  />
                ),
              blockquote: ({node, ...props}) => (
                <blockquote
                  style={{
                    borderLeft: '4px solid #e5e7eb',
                    paddingLeft: '12px',
                    marginLeft: '0',
                    color: '#6b7280',
                    marginBottom: '8px'
                  }}
                  {...props}
                />
              ),
              a: ({node, ...props}) => (
                <a
                  style={{
                    color: '#4f46e5',
                    textDecoration: 'underline'
                  }}
                  target="_blank"
                  rel="noopener noreferrer"
                  {...props}
                />
              ),
              strong: ({node, ...props}) => (
                <strong style={{ fontWeight: 'bold' }} {...props} />
              ),
              em: ({node, ...props}) => (
                <em style={{ fontStyle: 'italic' }} {...props} />
              )
            }}
          >
            {sanitizedContent}
          </ReactMarkdown>
        ) : (
          // User messages displayed as plain text
          <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
            {content}
          </div>
        )}

        {showIntent && intent && (
          <div style={{
            marginTop: '8px',
            paddingTop: '8px',
            borderTop: '1px solid rgba(0,0,0,0.1)',
            fontSize: '12px',
            color: role === 'user' ? 'rgba(255,255,255,0.8)' : '#6b7280',
            fontStyle: 'italic'
          }}>
            Intent: {intent}
          </div>
        )}
      </div>
    </div>
  );
};
