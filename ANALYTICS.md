# 📊 Analytics Implementation - Privacy-First Approach

## 🎯 **Google Analytics 4 Integration**

This application uses **privacy-first Google Analytics** with the following security measures:

### 🔒 **Privacy Protections:**

1. **Consent-First**
   - ✅ User consent required before any tracking
   - ✅ Clear consent banner with decline option
   - ✅ Consent stored in localStorage
   - ✅ Easy opt-out mechanism

2. **Data Protection**
   - ✅ IP addresses anonymized (`anonymize_ip: true`)
   - ✅ No Google signals (`allow_google_signals: false`)
   - ✅ No ad personalization (`allow_ad_personalization_signals: false`)
   - ✅ No sensitive data tracking (addresses, keys, etc.)

3. **Development Safety**
   - ✅ Only loads in production (`NODE_ENV=production`)
   - ✅ No tracking in development environment
   - ✅ Environment variable configuration

### 📊 **What We Track (Privacy-Safe):**

#### **Page Views:**
- `Wallet Home` - Main wallet page visits
- `Vanity Wallet Generator` - Vanity page visits
- **Note**: Only domain tracked, not full URLs

#### **User Actions:**
- `wallet_generated` - New wallet creation
  - `method`: 'new_generation' | 'private_key_import'
  - `network`: 'testnet' | 'mainnet'
  
- `vanity_wallet_generated` - Vanity wallet success
  - `pattern_length`: Number (1-8)
  - `pattern_type`: 'prefix' | 'suffix' | 'contains'
  - `attempts`: Number of generation attempts
  - `generation_time_ms`: Time taken in milliseconds

### 🚫 **What We DON'T Track:**

- ❌ Wallet addresses
- ❌ Private keys
- ❌ Seed phrases/mnemonics
- ❌ Transaction data
- ❌ User IP addresses (anonymized)
- ❌ Personal information
- ❌ Full page URLs
- ❌ WalletConnect session data

### ⚙️ **Configuration:**

```bash
# Environment Variables (.env.local)
NEXT_PUBLIC_GA_ID=G-9ZWFB25JKE

# Analytics only loads when:
# 1. NODE_ENV=production
# 2. User provides explicit consent
# 3. GA ID is configured
```

### 🛡️ **Security Features:**

1. **Content Security Policy Ready**
   - Analytics scripts use Next.js Script component
   - Proper loading strategy (`afterInteractive`)
   - No inline scripts

2. **GDPR Compliant**
   - Explicit consent required
   - Clear privacy notice
   - Easy opt-out
   - No pre-consent data collection

3. **Wallet Security**
   - No sensitive financial data tracked
   - No user identification
   - No cross-session tracking
   - Local consent storage only

### 📋 **Usage Guide:**

#### **For Users:**
- Analytics only runs in production
- Consent banner appears on first visit
- Can decline analytics without affecting app functionality
- Can clear consent by clearing browser localStorage

#### **For Developers:**
- Use `trackEvent()` for new analytics events
- Use `trackPageView()` for page navigation
- Never pass sensitive data to tracking functions
- All events are automatically filtered for security

### 🎯 **Analytics Goals:**

1. **Understand Usage Patterns**
   - Which features are most used
   - Success rates for wallet generation
   - Performance optimization insights

2. **Improve User Experience**
   - Identify usability issues
   - Optimize slow features
   - Track feature adoption

3. **Security Monitoring**
   - No security data tracked
   - Analytics cannot compromise wallet security
   - Privacy-by-design implementation

---

**Last Updated:** $(date)
**Privacy Status:** ✅ GDPR Compliant | ✅ Privacy-First | ✅ Consent-Based