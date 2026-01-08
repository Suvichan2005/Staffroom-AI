/**
 * AIProviderStatus Component
 * 
 * Displays the current AI provider status and allows runtime switching.
 * Useful for admin dashboards and debugging.
 */

import React, { useState, useEffect } from 'react';
import { useAIProvider } from '../../hooks/useAIProvider.jsx';

const PROVIDER_INFO = {
  azure: {
    name: 'Azure OpenAI',
    description: 'Microsoft Azure GPT-4o',
    icon: '☁️',
    color: '#0078D4'
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Google Gemini 2.5 Flash',
    icon: '✨',
    color: '#4285F4'
  },
  mock: {
    name: 'Mock Provider',
    description: 'Local testing only',
    icon: '🧪',
    color: '#9CA3AF'
  }
};

export function AIProviderStatus({ showSwitcher = true, compact = false }) {
  const { provider, changeProvider, health, checking, checkHealth, availableProviders } = useAIProvider();
  const [switching, setSwitching] = useState(false);

  const currentInfo = PROVIDER_INFO[provider] || PROVIDER_INFO.mock;

  const handleSwitch = async (newProvider) => {
    if (newProvider === provider) return;
    
    setSwitching(true);
    try {
      await changeProvider(newProvider);
    } finally {
      setSwitching(false);
    }
  };

  if (compact) {
    return (
      <div 
        className="ai-provider-status-compact"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 12px',
          borderRadius: '16px',
          backgroundColor: health.available ? '#10B98120' : '#EF444420',
          border: `1px solid ${health.available ? '#10B981' : '#EF4444'}`,
          fontSize: '13px'
        }}
      >
        <span>{currentInfo.icon}</span>
        <span style={{ fontWeight: 500 }}>{currentInfo.name}</span>
        <span 
          style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: health.available ? '#10B981' : '#EF4444',
            animation: checking ? 'pulse 1.5s infinite' : 'none'
          }}
        />
      </div>
    );
  }

  return (
    <div 
      className="ai-provider-status"
      style={{
        padding: '20px',
        borderRadius: '12px',
        backgroundColor: '#F9FAFB',
        border: '1px solid #E5E7EB'
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>
          AI Provider Status
        </h3>
        <button
          onClick={checkHealth}
          disabled={checking}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #D1D5DB',
            backgroundColor: 'white',
            fontSize: '13px',
            cursor: checking ? 'not-allowed' : 'pointer',
            opacity: checking ? 0.6 : 1
          }}
        >
          {checking ? 'Checking...' : 'Refresh'}
        </button>
      </div>

      {/* Current Provider */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '16px',
          borderRadius: '8px',
          backgroundColor: 'white',
          border: `2px solid ${currentInfo.color}`,
          marginBottom: '16px'
        }}
      >
        <span style={{ fontSize: '24px' }}>{currentInfo.icon}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, color: currentInfo.color }}>
            {currentInfo.name}
          </div>
          <div style={{ fontSize: '13px', color: '#6B7280' }}>
            {currentInfo.description}
          </div>
        </div>
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '12px',
            backgroundColor: health.available ? '#10B98120' : '#EF444420',
            color: health.available ? '#10B981' : '#EF4444',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          <span 
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'currentColor'
            }}
          />
          {health.available ? 'Connected' : 'Unavailable'}
        </div>
      </div>

      {/* Provider Switcher */}
      {showSwitcher && (
        <div>
          <div style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>
            Switch Provider:
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableProviders.map((p) => {
              const info = PROVIDER_INFO[p];
              const isActive = p === provider;
              
              return (
                <button
                  key={p}
                  onClick={() => handleSwitch(p)}
                  disabled={switching || isActive}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: `1px solid ${isActive ? info.color : '#D1D5DB'}`,
                    backgroundColor: isActive ? `${info.color}10` : 'white',
                    color: isActive ? info.color : '#374151',
                    fontSize: '13px',
                    fontWeight: isActive ? 600 : 400,
                    cursor: (switching || isActive) ? 'default' : 'pointer',
                    opacity: (switching && !isActive) ? 0.6 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  <span>{info.icon}</span>
                  <span>{info.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Health Details */}
      {health.checked && !health.available && health.error && (
        <div 
          style={{
            marginTop: '16px',
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: '#FEF2F2',
            border: '1px solid #FECACA',
            fontSize: '13px',
            color: '#991B1B'
          }}
        >
          <strong>Error:</strong> {health.error}
        </div>
      )}

      {/* Latency Info */}
      {health.latency && (
        <div 
          style={{
            marginTop: '12px',
            fontSize: '12px',
            color: '#6B7280'
          }}
        >
          Response time: {health.latency}ms
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}

export default AIProviderStatus;
