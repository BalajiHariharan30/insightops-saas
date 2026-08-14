import React, { useEffect } from 'react';
import { Spin, message } from 'antd';
import { useNavigate } from 'react-router-dom';

/**
 * OAuthCallback Page
 * 
 * After Google OAuth login, the backend redirects to:
 *   /oauth-callback?token=<accessToken>&orgId=<organizationId>
 * 
 * This page extracts those values, stores them in localStorage,
 * and redirects to the main dashboard.
 */
const OAuthCallback: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    const orgId = params.get('orgId');
    const error = params.get('error');

    if (error) {
      message.error('Google sign-in failed. Please try again.');
      navigate('/auth');
      return;
    }

    if (token) {
      localStorage.setItem('access_token', token);
    }

    if (orgId) {
      localStorage.setItem('active_organization_id', orgId);
    }

    if (token && orgId) {
      message.success('Signed in with Google successfully!');
      // Force a full page reload so AuthProvider initializes with the new token
      window.location.href = '/';
    } else {
      message.error('Incomplete OAuth response. Redirecting to login.');
      navigate('/auth');
    }
  }, [navigate]);

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: '#0a0b10',
      color: '#fff',
      gap: 16,
    }}>
      <Spin size="large" />
      <p style={{ color: '#9ca3af', fontSize: 16 }}>Completing Google Sign-In...</p>
    </div>
  );
};

export default OAuthCallback;
