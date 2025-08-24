'use client'

import { useState, useEffect } from 'react'
import { ChainConfig, SUPPORTED_CHAINS, CHAIN_CATEGORIES, getChainsByCategory } from '@/utils/chains'

interface ChainSelectorProps {
  selectedChain: string
  onChainChange: (chainKey: string, chain: ChainConfig) => void
  className?: string
}

export function ChainSelector({ selectedChain, onChainChange, className = '' }: ChainSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')

  const currentChain = SUPPORTED_CHAINS[selectedChain] || SUPPORTED_CHAINS.ethereum

  const filteredChains = Object.entries(SUPPORTED_CHAINS).filter(([key, chain]) => {
    const matchesSearch = chain.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         chain.symbol.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || chain.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const handleChainSelect = (chainKey: string, chain: ChainConfig) => {
    onChainChange(chainKey, chain)
    setIsOpen(false)
    setSearchQuery('')
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (!target.closest('.chain-selector')) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className={`chain-selector relative ${className}`}>
      {/* Current Chain Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '8px 12px',
          backgroundColor: 'white',
          border: '1px solid #e5e7eb',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '14px',
          fontWeight: '500',
          color: '#374151',
          minWidth: '160px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          (e.target as HTMLElement).style.borderColor = '#3b82f6'
        }}
        onMouseLeave={(e) => {
          (e.target as HTMLElement).style.borderColor = '#e5e7eb'
        }}
      >
        {/* Chain Logo */}
        {currentChain.logoUrl && (
          <img 
            src={currentChain.logoUrl} 
            alt={currentChain.name}
            style={{ 
              width: '20px', 
              height: '20px', 
              borderRadius: '50%',
              objectFit: 'cover'
            }}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none'
            }}
          />
        )}
        
        {/* Chain Info */}
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: '14px', fontWeight: '600' }}>
            {currentChain.name}
          </div>
          <div style={{ fontSize: '12px', color: '#6b7280' }}>
            {currentChain.symbol} • ID: {currentChain.id}
          </div>
        </div>
        
        {/* Dropdown Arrow */}
        <svg
          style={{
            width: '16px',
            height: '16px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease'
          }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            marginTop: '4px',
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '12px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            zIndex: 50,
            maxHeight: '400px',
            overflow: 'hidden'
          }}
        >
          {/* Search Bar */}
          <div style={{ padding: '12px' }}>
            <input
              type="text"
              placeholder="Search chains..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none'
              }}
            />
          </div>

          {/* Category Filter */}
          <div style={{ 
            padding: '0 12px 12px 12px',
            borderBottom: '1px solid #f3f4f6'
          }}>
            <div style={{ 
              display: 'flex', 
              gap: '4px', 
              flexWrap: 'wrap' 
            }}>
              <button
                onClick={() => setSelectedCategory('all')}
                style={{
                  padding: '4px 8px',
                  fontSize: '12px',
                  backgroundColor: selectedCategory === 'all' ? '#3b82f6' : '#f3f4f6',
                  color: selectedCategory === 'all' ? 'white' : '#6b7280',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                All
              </button>
              {CHAIN_CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  onClick={() => setSelectedCategory(category.key)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '12px',
                    backgroundColor: selectedCategory === category.key ? '#3b82f6' : '#f3f4f6',
                    color: selectedCategory === category.key ? 'white' : '#6b7280',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {category.icon} {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chain List */}
          <div style={{ 
            maxHeight: '250px', 
            overflowY: 'auto',
            padding: '4px'
          }}>
            {filteredChains.length === 0 ? (
              <div style={{ 
                padding: '20px', 
                textAlign: 'center', 
                color: '#6b7280',
                fontSize: '14px'
              }}>
                No chains found
              </div>
            ) : (
              filteredChains.map(([chainKey, chain]) => (
                <button
                  key={chainKey}
                  onClick={() => handleChainSelect(chainKey, chain)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: chainKey === selectedChain ? '#f0f9ff' : 'transparent',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (chainKey !== selectedChain) {
                      (e.target as HTMLElement).style.backgroundColor = '#f9fafb'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (chainKey !== selectedChain) {
                      (e.target as HTMLElement).style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  {/* Chain Logo */}
                  {chain.logoUrl && (
                    <img 
                      src={chain.logoUrl} 
                      alt={chain.name}
                      style={{ 
                        width: '24px', 
                        height: '24px', 
                        borderRadius: '50%',
                        objectFit: 'cover',
                        flexShrink: 0
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  )}
                  
                  {/* Chain Info */}
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ 
                      fontWeight: '600',
                      color: '#111827',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      {chain.name}
                      {chain.isTestnet && (
                        <span style={{
                          fontSize: '10px',
                          padding: '2px 6px',
                          backgroundColor: '#fef3c7',
                          color: '#d97706',
                          borderRadius: '4px'
                        }}>
                          TESTNET
                        </span>
                      )}
                    </div>
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6b7280',
                      marginTop: '2px'
                    }}>
                      {chain.symbol} • Chain ID: {chain.id}
                    </div>
                  </div>

                  {/* Selected Indicator */}
                  {chainKey === selectedChain && (
                    <svg
                      style={{ width: '16px', height: '16px', color: '#3b82f6' }}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}