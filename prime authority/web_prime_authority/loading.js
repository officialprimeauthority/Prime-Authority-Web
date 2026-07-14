/**
 * Global Loading Manager for Prime Authority
 * Handles all loading states, page transitions, and prevents layout flashes
 */

class GlobalLoadingManager {
  constructor() {
    this.isLoading = false;
    this.loadingTimeout = null;
    this.minLoadingTime = 300; // Minimum time to show loading screen (ms)
    this.startTime = 0;
    this.init();
  }

  init() {
    this.createLoadingScreen();
    this.setupPageLoadListener();
    this.setupNavigationListener();
    this.setupFormSubmissionListener();
    
    // Show loading on initial page load
    this.showLoading();
    
    // Hide loading when DOM is fully ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.hideLoading(300));
    } else {
      window.addEventListener('load', () => this.hideLoading(300));
    }
  }

  createLoadingScreen() {
    const loadingHTML = `
      <div id="globalLoading" class="global-loading-overlay">
        <div class="loading-container">
          <div class="loading-content">
            <!-- Animated Gaming Logo -->
            <div class="loading-logo">
              <div class="logo-text">PRIME</div>
              <div class="logo-text">AUTHORITY</div>
            </div>
            
            <!-- Premium Loading Spinner -->
            <div class="loading-spinner">
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
              <div class="spinner-ring"></div>
            </div>
            
            <!-- Loading Text -->
            <p class="loading-text">LOADING</p>
            <div class="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    `;

    const style = `
      /* ===== GLOBAL LOADING SCREEN ===== */
      #globalLoading {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100vh;
        background: linear-gradient(135deg, #0b0b0b 0%, #1a1a2e 100%);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
        opacity: 1;
        transition: opacity 0.5s ease-out;
      }

      #globalLoading.hidden {
        opacity: 0;
        pointer-events: none;
      }

      .loading-container {
        text-align: center;
        animation: fadeInScale 0.5s ease-out;
      }

      .loading-content {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 30px;
      }

      /* Logo Animation */
      .loading-logo {
        font-size: 28px;
        font-weight: 900;
        letter-spacing: 4px;
        line-height: 1.2;
      }

      .logo-text {
        color: #ff2b2b;
        text-shadow: 0 0 20px rgba(255, 43, 43, 0.6);
        animation: glow 2s ease-in-out infinite;
      }

      .logo-text:nth-child(2) {
        animation-delay: 0.3s;
      }

      /* Premium Spinner */
      .loading-spinner {
        position: relative;
        width: 80px;
        height: 80px;
        margin: 0 auto;
      }

      .spinner-ring {
        position: absolute;
        width: 80px;
        height: 80px;
        border: 3px solid transparent;
        border-top-color: #ff2b2b;
        border-right-color: #ff2b2b;
        border-radius: 50%;
        animation: spin 1.5s linear infinite;
      }

      .spinner-ring:nth-child(1) {
        animation-delay: 0s;
      }

      .spinner-ring:nth-child(2) {
        width: 60px;
        height: 60px;
        top: 10px;
        left: 10px;
        border-top-color: transparent;
        border-right-color: #00d4ff;
        animation-direction: reverse;
        animation-delay: -0.5s;
      }

      .spinner-ring:nth-child(3) {
        width: 40px;
        height: 40px;
        top: 20px;
        left: 20px;
        border-top-color: #00d4ff;
        border-right-color: transparent;
        animation-delay: -1s;
      }

      /* Loading Text */
      .loading-text {
        color: #fff;
        font-size: 16px;
        font-weight: 600;
        letter-spacing: 3px;
        margin: 20px 0 10px 0;
        animation: pulse 1.5s ease-in-out infinite;
      }

      .loading-dots {
        display: flex;
        justify-content: center;
        gap: 8px;
      }

      .loading-dots span {
        width: 8px;
        height: 8px;
        background: #ff2b2b;
        border-radius: 50%;
        animation: bounce 1.4s infinite ease-in-out;
      }

      .loading-dots span:nth-child(1) {
        animation-delay: 0s;
      }

      .loading-dots span:nth-child(2) {
        animation-delay: 0.2s;
      }

      .loading-dots span:nth-child(3) {
        animation-delay: 0.4s;
      }

      /* Animations */
      @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
      }

      @keyframes glow {
        0%, 100% {
          text-shadow: 0 0 10px rgba(255, 43, 43, 0.4), 
                       0 0 20px rgba(255, 43, 43, 0.2);
        }
        50% {
          text-shadow: 0 0 30px rgba(255, 43, 43, 0.8), 
                       0 0 60px rgba(255, 43, 43, 0.4);
        }
      }

      @keyframes pulse {
        0%, 100% { opacity: 0.6; }
        50% { opacity: 1; }
      }

      @keyframes bounce {
        0%, 80%, 100% {
          opacity: 0.3;
          transform: translateY(0);
        }
        40% {
          opacity: 1;
          transform: translateY(-10px);
        }
      }

      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      /* Prevent body scroll during loading */
      body.loading-active {
        overflow: hidden;
      }
    `;

    // Inject HTML
    document.body.insertAdjacentHTML('afterbegin', loadingHTML);

    // Inject CSS
    const styleTag = document.createElement('style');
    styleTag.textContent = style;
    document.head.appendChild(styleTag);
  }

  showLoading() {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.startTime = Date.now();
    
    const loader = document.getElementById('globalLoading');
    if (loader) {
      loader.classList.remove('hidden');
      document.body.classList.add('loading-active');
    }

    clearTimeout(this.loadingTimeout);
  }

  hideLoading(delay = 0) {
    if (!this.isLoading) return;

    const elapsed = Date.now() - this.startTime;
    const remainingTime = Math.max(0, this.minLoadingTime - elapsed + delay);

    this.loadingTimeout = setTimeout(() => {
      const loader = document.getElementById('globalLoading');
      if (loader) {
        loader.classList.add('hidden');
        document.body.classList.remove('loading-active');
      }
      this.isLoading = false;
    }, remainingTime);
  }

  setupPageLoadListener() {
    // Show loading on window unload (page navigation)
    window.addEventListener('beforeunload', () => {
      this.showLoading();
    });

    // Handle back/forward buttons
    window.addEventListener('popstate', () => {
      this.showLoading();
      setTimeout(() => this.hideLoading(500), 100);
    });
  }

  setupNavigationListener() {
    // Show loading on internal link clicks
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a');
      if (link && link.href && !link.target && !link.href.includes('#')) {
        // Check if it's an internal link
        const url = new URL(link.href);
        if (url.origin === window.location.origin) {
          this.showLoading();
          // Auto hide after 2 seconds (page should load by then)
          setTimeout(() => this.hideLoading(300), 2000);
        }
      }
    });
  }

  setupFormSubmissionListener() {
    // Show loading on form submissions
    document.addEventListener('submit', (e) => {
      if (e.target && e.target.tagName === 'FORM') {
        const submitBtn = e.target.querySelector('button[type="submit"]');
        if (submitBtn) {
          // Add loading state to button
          submitBtn.dataset.originalText = submitBtn.textContent;
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="btn-spinner"></span> SUBMITTING...';
        }
      }
    }, true);
  }

  // Public method to show loading with custom duration
  showLoadingFor(duration = 1000) {
    this.showLoading();
    setTimeout(() => this.hideLoading(), duration);
  }

  // Public method to reset loading state
  reset() {
    clearTimeout(this.loadingTimeout);
    this.isLoading = false;
    const loader = document.getElementById('globalLoading');
    if (loader) {
      loader.classList.add('hidden');
      document.body.classList.remove('loading-active');
    }
  }
}

// Initialize on script load
const globalLoader = new GlobalLoadingManager();
