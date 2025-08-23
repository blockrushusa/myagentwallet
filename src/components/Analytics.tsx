'use client'

import Script from 'next/script'
import { useEffect, useState } from 'react'

interface AnalyticsProps {
  gaId?: string
}

// Privacy-first Google Analytics implementation for wallet applications
export default function Analytics({ gaId }: AnalyticsProps) {
  const [consent, setConsent] = useState<boolean | null>(null)
  const [showConsentBanner, setShowConsentBanner] = useState(false)

  // Only load in production and if GA ID is provided
  const shouldLoadGA = process.env.NODE_ENV === 'production' && gaId

  useEffect(() => {
    // Check for existing consent
    const existingConsent = localStorage.getItem('ga-consent')
    if (existingConsent) {
      setConsent(existingConsent === 'true')
    } else if (shouldLoadGA) {
      // Show consent banner for new users
      setShowConsentBanner(true)
    }
  }, [shouldLoadGA])

  useEffect(() => {
    // Initialize GA when consent is given
    if (consent && shouldLoadGA && typeof window !== 'undefined' && window.gtag) {
      window.gtag('consent', 'update', {
        analytics_storage: 'granted'
      })
      
      // Configure GA with privacy-first settings
      window.gtag('config', gaId!, {
        // Privacy settings
        anonymize_ip: true,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
        
        // Wallet-specific settings
        custom_map: {
          custom_parameter_1: 'wallet_action'
        },
        
        // Disable automatic page view tracking for sensitive pages
        send_page_view: false
      })

      // Send initial page view (non-sensitive)
      window.gtag('event', 'page_view', {
        page_title: document.title,
        page_location: window.location.origin // Only domain, not full URL for privacy
      })
    }
  }, [consent, gaId, shouldLoadGA])

  const handleConsent = (granted: boolean) => {
    setConsent(granted)
    setShowConsentBanner(false)
    localStorage.setItem('ga-consent', granted.toString())
    
    if (!granted && typeof window !== 'undefined' && window.gtag) {
      // Deny consent
      window.gtag('consent', 'update', {
        analytics_storage: 'denied'
      })
    }
  }

  // Don't render anything in development or without GA ID
  if (!shouldLoadGA) {
    return null
  }

  return (
    <>
      {/* Google Analytics Scripts */}
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="afterInteractive"
        onLoad={() => {
          // Initialize dataLayer and gtag function
          window.dataLayer = window.dataLayer || []
          window.gtag = function gtag() {
            window.dataLayer.push(arguments)
          }
          window.gtag('js', new Date())
          
          // Set default consent to denied (privacy-first)
          window.gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            wait_for_update: 500
          })
        }}
      />

      {/* Privacy Consent Banner */}
      {showConsentBanner && (
        <div style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: '#1f2937',
          color: 'white',
          padding: '1rem',
          zIndex: 9999,
          boxShadow: '0 -4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '1rem'
          }}>
            <div style={{ flex: 1, minWidth: '300px' }}>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>
                🍪 <strong>Privacy Notice:</strong> We use privacy-first analytics to improve our wallet service. 
                No personal data, wallet addresses, or transaction details are tracked. 
                <a 
                  href="#privacy" 
                  style={{ color: '#60a5fa', textDecoration: 'underline', marginLeft: '0.5rem' }}
                >
                  Learn more
                </a>
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => handleConsent(false)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#374151',
                  color: 'white',
                  border: '1px solid #4b5563',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Decline
              </button>
              <button
                onClick={() => handleConsent(true)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.9rem'
                }}
              >
                Accept Analytics
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// Type declaration for gtag
declare global {
  interface Window {
    dataLayer: any[]
    gtag: (command: string, ...args: any[]) => void
  }
}

// Utility function to track events (privacy-safe)
export const trackEvent = (eventName: string, parameters?: Record<string, any>) => {
  if (
    typeof window !== 'undefined' && 
    window.gtag && 
    localStorage.getItem('ga-consent') === 'true'
  ) {
    // Filter out sensitive data
    const safeParameters = parameters ? Object.fromEntries(
      Object.entries(parameters).filter(([key, value]) => 
        // Don't track sensitive wallet data
        !key.toLowerCase().includes('address') &&
        !key.toLowerCase().includes('key') &&
        !key.toLowerCase().includes('private') &&
        !key.toLowerCase().includes('seed') &&
        !key.toLowerCase().includes('mnemonic')
      )
    ) : {}

    window.gtag('event', eventName, {
      ...safeParameters,
      // Always anonymize
      anonymize_ip: true
    })
  }
}

// Utility function to track page views (privacy-safe)
export const trackPageView = (pageName: string) => {
  if (
    typeof window !== 'undefined' && 
    window.gtag && 
    localStorage.getItem('ga-consent') === 'true'
  ) {
    window.gtag('event', 'page_view', {
      page_title: pageName,
      page_location: window.location.origin, // Only domain for privacy
      anonymize_ip: true
    })
  }
}