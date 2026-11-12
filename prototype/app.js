/**
 * Escrow Pigeon — Prototype Interactions
 * Vanilla JS for header, mobile menu, smooth scroll, and animations
 */

(function () {
  'use strict';

  // ==========================================================================
  // State
  // ==========================================================================
  const state = {
    mobileMenuOpen: false,
    lastScrollY: 0,
    headerVisible: true,
  };

  // ==========================================================================
  // DOM Elements
  // ==========================================================================
  const elements = {
    header: document.querySelector('.header'),
    mobileMenuBtn: document.querySelector('.mobile-menu-btn'),
    mobileMenu: document.querySelector('.mobile-menu'),
    mobileNavLinks: document.querySelectorAll('.mobile-nav-link'),
    navLinks: document.querySelectorAll('.nav-link, .mobile-nav-link'),
    heroCtaPrimary: document.querySelector('.hero-actions .btn-primary'),
    heroCtaSecondary: document.querySelector('.hero-actions .btn-ghost'),
    ctaButtons: document.querySelectorAll('.cta-actions .btn'),
    pricingToggleBtns: document.querySelectorAll('.toggle-btn'),
    pricingCards: document.querySelectorAll('.pricing-card'),
    featureCards: document.querySelectorAll('.feature-card'),
    stepCards: document.querySelectorAll('.step'),
    scrollLinks: document.querySelectorAll('a[href^="#"]'),
  };

  // ==========================================================================
  // Utilities
  // ==========================================================================
  const utils = {
    // Debounce function
    debounce(fn, delay) {
      let timeoutId;
      return (...args) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => fn.apply(this, args), delay);
      };
    },

    // Check if element is in viewport
    isInViewport(el, threshold = 0.1) {
      const rect = el.getBoundingClientRect();
      const windowHeight = window.innerHeight || document.documentElement.clientHeight;
      return (
        rect.top <= windowHeight * (1 - threshold) &&
        rect.bottom >= windowHeight * threshold
      );
    },

    // Smooth scroll to element
    scrollToElement(targetId) {
      const target = document.querySelector(targetId);
      if (!target) return;

      const headerOffset = elements.header?.offsetHeight || 72;
      const elementPosition = target.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset - 16;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });

      // Close mobile menu if open
      if (state.mobileMenuOpen) {
        this.closeMobileMenu();
      }
    },

    // Trap focus within element
    trapFocus(element) {
      const focusableElements = element.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      element.addEventListener('keydown', function handleTab(e) {
        if (e.key !== 'Tab') return;

        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      });

      // Focus first element
      firstElement?.focus();
    },
  };

  // ==========================================================================
  // Mobile Menu
  // ==========================================================================
  function openMobileMenu() {
    state.mobileMenuOpen = true;
    elements.mobileMenuBtn.setAttribute('aria-expanded', 'true');
    elements.mobileMenu.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    utils.trapFocus(elements.mobileMenu);
  }

  function closeMobileMenu() {
    state.mobileMenuOpen = false;
    elements.mobileMenuBtn.setAttribute('aria-expanded', 'false');
    elements.mobileMenu.classList.remove('is-open');
    document.body.style.overflow = '';
  }

  function toggleMobileMenu() {
    if (state.mobileMenuOpen) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }

  // ==========================================================================
  // Header Scroll Behavior
  // ==========================================================================
  function handleHeaderScroll() {
    const currentScrollY = window.scrollY;

    if (currentScrollY > state.lastScrollY && currentScrollY > 100) {
      // Scrolling down - hide header
      if (state.headerVisible) {
        elements.header.style.transform = 'translateY(-100%)';
        state.headerVisible = false;
      }
    } else if (currentScrollY < state.lastScrollY) {
      // Scrolling up - show header
      if (!state.headerVisible) {
        elements.header.style.transform = 'translateY(0)';
        state.headerVisible = true;
      }
    }

    // Add shadow when scrolled
    if (currentScrollY > 10) {
      elements.header.style.boxShadow = 'var(--shadow-md)';
    } else {
      elements.header.style.boxShadow = 'none';
    }

    state.lastScrollY = currentScrollY;
  }

  // ==========================================================================
  // Smooth Scroll for Anchor Links
  // ==========================================================================
  function handleAnchorClick(e) {
    const href = this.getAttribute('href');
    if (!href || href === '#') return;

    if (href.startsWith('#')) {
      e.preventDefault();
      utils.scrollToElement(href);
    }
  }

  // ==========================================================================
  // Pricing Toggle
  // ==========================================================================
  function handlePricingToggle() {
    const isAnnual = this.dataset.period === 'annual';

    elements.pricingToggleBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.period === (isAnnual ? 'annual' : 'monthly'));
    });

    elements.pricingCards.forEach(card => {
      const monthlyPrice = card.querySelector('[data-monthly-price]');
      const annualPrice = card.querySelector('[data-annual-price]');
      const monthlyDetail = card.querySelector('[data-monthly-detail]');
      const annualDetail = card.querySelector('[data-annual-detail]');

      if (monthlyPrice && annualPrice) {
        monthlyPrice.style.display = isAnnual ? 'none' : 'inline';
        annualPrice.style.display = isAnnual ? 'inline' : 'none';
      }
      if (monthlyDetail && annualDetail) {
        monthlyDetail.style.display = isAnnual ? 'none' : 'inline';
        annualDetail.style.display = isAnnual ? 'inline' : 'none';
      }
    });
  }

  // ==========================================================================
  // Scroll Animations (Intersection Observer)
  // ==========================================================================
  function initScrollAnimations() {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      // Show all animated elements immediately
      document.querySelectorAll('.animate-slide-up, .animate-fade-in').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -50px 0px',
      threshold: 0.1,
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);

    // Observe animated elements
    document.querySelectorAll('.animate-slide-up, .animate-fade-in, .feature-card, .pricing-card, .step').forEach(el => {
      // Set initial state
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      observer.observe(el);
    });
  }

  // ==========================================================================
  // Hero CTA Tracking (Analytics placeholder)
  // ==========================================================================
  function handleCtaClick(e) {
    const button = this;
    const action = button.dataset.action || button.textContent.trim().toLowerCase();
    const location = button.closest('section')?.className || 'unknown';

    // Analytics placeholder - replace with actual analytics
    console.log('[Analytics] CTA Click', {
      action,
      location,
      timestamp: new Date().toISOString(),
    });

    // If it's a demo link, show a toast
    if (action.includes('demo') || action.includes('try')) {
      e.preventDefault();
      showToast('Demo coming soon! Sign up for early access.', 'info');
    }
  }

  // ==========================================================================
  // Toast Notification System
  // ==========================================================================
  function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'polite');

    const icons = {
      info: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
      success: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
      error: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
    };

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || icons.info}</div>
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="Dismiss">×</button>
    `;

    // Add styles if not already added
    if (!document.querySelector('#toast-styles')) {
      const style = document.createElement('style');
      style.id = 'toast-styles';
      style.textContent = `
        .toast {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 16px 20px;
          background: var(--color-bg-primary);
          border: 1px solid var(--color-border-default);
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-xl);
          position: fixed;
          bottom: 24px;
          right: 24px;
          z-index: var(--z-toast);
          max-width: 400px;
          animation: slideIn 0.3s ease-out;
        }
        .toast-info { border-left: 4px solid var(--color-brand-primary); }
        .toast-success { border-left: 4px solid var(--color-success-500); }
        .toast-error { border-left: 4px solid var(--color-error-500); }
        .toast-icon { flex-shrink: 0; color: var(--color-brand-primary); }
        .toast-success .toast-icon { color: var(--color-success-500); }
        .toast-error .toast-icon { color: var(--color-error-500); }
        .toast-message { flex: 1; font-size: var(--font-size-sm); color: var(--color-text-primary); }
        .toast-close {
          background: none;
          border: none;
          font-size: 24px;
          color: var(--color-text-tertiary);
          cursor: pointer;
          padding: 0;
          line-height: 1;
        }
        .toast-close:hover { color: var(--color-text-primary); }
        @keyframes slideIn {
          from { opacity: 0; transform: translateX(100%); }
          to { opacity: 1; transform: translateX(0); }
        }
        @media (max-width: 480px) {
          .toast { left: 16px; right: 16px; bottom: 16px; max-width: none; }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    // Close button
    toast.querySelector('.toast-close').addEventListener('click', () => {
      toast.style.animation = 'slideIn 0.3s ease-out reverse';
      setTimeout(() => toast.remove(), 300);
    });

    // Auto dismiss after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.style.animation = 'slideIn 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
      }
    }, 5000);
  }

  // Make showToast globally available
  window.showToast = showToast;

  // ==========================================================================
  // Keyboard Navigation for Mobile Menu
  // ==========================================================================
  function handleMobileMenuKeydown(e) {
    if (e.key === 'Escape' && state.mobileMenuOpen) {
      closeMobileMenu();
      elements.mobileMenuBtn.focus();
    }
  }

  // ==========================================================================
  // Initialize All Event Listeners
  // ==========================================================================
  function initEventListeners() {
    // Mobile menu toggle
    if (elements.mobileMenuBtn) {
      elements.mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }

    // Close mobile menu on nav link click
    elements.mobileNavLinks.forEach(link => {
      link.addEventListener('click', closeMobileMenu);
    });

    // Header scroll behavior
    window.addEventListener('scroll', utils.debounce(handleHeaderScroll, 10), { passive: true });

    // Smooth scroll for anchor links
    elements.scrollLinks.forEach(link => {
      link.addEventListener('click', handleAnchorClick);
    });

    // Pricing toggle
    elements.pricingToggleBtns.forEach(btn => {
      btn.addEventListener('click', handlePricingToggle);
    });

    // CTA buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
      btn.addEventListener('click', handleCtaClick);
    });

    // Hero CTA buttons
    if (elements.heroCtaPrimary) {
      elements.heroCtaPrimary.setAttribute('data-action', 'start-free-trial');
    }
    if (elements.heroCtaSecondary) {
      elements.heroCtaSecondary.setAttribute('data-action', 'watch-demo');
    }

    // CTA section buttons
    elements.ctaButtons.forEach(btn => {
      btn.setAttribute('data-action', btn.textContent.trim().toLowerCase());
    });

    // Keyboard support for mobile menu
    document.addEventListener('keydown', handleMobileMenuKeydown);

    // Close mobile menu on outside click
    document.addEventListener('click', (e) => {
      if (
        state.mobileMenuOpen &&
        !elements.mobileMenu.contains(e.target) &&
        !elements.mobileMenuBtn.contains(e.target)
      ) {
        closeMobileMenu();
      }
    });

    // Handle window resize
    window.addEventListener('resize', utils.debounce(() => {
      if (window.innerWidth >= 768 && state.mobileMenuOpen) {
        closeMobileMenu();
      }
    }, 150));
  }

  // ==========================================================================
  // Initialize
  // ==========================================================================
  function init() {
    // Check if DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    initEventListeners();
    initScrollAnimations();

    // Add loaded class for CSS transitions
    document.body.classList.add('js-loaded');

    // Log initialization
    console.log('[Escrow Pigeon] Prototype initialized');
  }

  // Start initialization
  init();

  // ==========================================================================
  // Public API
  // ==========================================================================
  window.EscrowPigeon = {
    showToast,
    openMobileMenu,
    closeMobileMenu,
    scrollTo: utils.scrollToElement,
  };
})();