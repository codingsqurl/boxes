document.addEventListener('DOMContentLoaded', function() {
  // Initialize all modules
  initLoader();
  initNavbar();
  initMobileMenu();
  initCounterAnimation();
  initGalleryFilter();
  initBackToTop();
  initScrollAnimations();
  initContactForm();
  initCostCalculator();
  initFAQ();
  loadReviews().then(function() {
    initReviewsCarousel();
  });
});

/* PAGE LOADER */
function initLoader() {
  const loader = document.getElementById('loader');

  window.addEventListener('load', () => {
    setTimeout(() => {
      loader.classList.add('hidden');
      document.body.style.overflow = 'visible';
    }, 1800);
  });

  // Fallback - hide loader after 3 seconds max
  setTimeout(() => {
    loader.classList.add('hidden');
    document.body.style.overflow = 'visible';
  }, 3000);
}

/* NAVBAR */
function initNavbar() {
  var navbar = document.getElementById('navbar');

  window.addEventListener('scroll', function() {
    var currentScroll = window.pageYOffset || document.documentElement.scrollTop;

    if (currentScroll > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Smooth scroll for nav links (Safari compatible)
  var anchors = document.querySelectorAll('a[href^="#"]');
  for (var i = 0; i < anchors.length; i++) {
    anchors[i].addEventListener('click', function(e) {
      e.preventDefault();
      var targetId = this.getAttribute('href');
      var target = document.querySelector(targetId);
      if (target) {
        smoothScrollTo(target);
        // Close mobile menu if open
        var navMenu = document.querySelector('.nav-menu');
        var navToggle = document.querySelector('.nav-toggle');
        if (navMenu) navMenu.classList.remove('active');
        if (navToggle) navToggle.classList.remove('active');
      }
    });
  }
}

function smoothScrollTo(target) {
  var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 80;
  window.scrollTo({ top: targetPosition, behavior: 'smooth' });
}

/* MOBILE MENU */
function initMobileMenu() {
  const navToggle = document.querySelector('.nav-toggle');
  const navMenu = document.querySelector('.nav-menu');

  navToggle.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navMenu.classList.toggle('active');
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!navToggle.contains(e.target) && !navMenu.contains(e.target)) {
      navToggle.classList.remove('active');
      navMenu.classList.remove('active');
    }
  });
}

/* COUNTER ANIMATION */
function initCounterAnimation() {
  const counters = document.querySelectorAll('.stat-number');
  let animated = false;

  function animateCounters() {
    counters.forEach(counter => {
      const target = parseInt(counter.getAttribute('data-target'));
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;

      const updateCounter = () => {
        current += step;
        if (current < target) {
          counter.textContent = Math.floor(current);
          requestAnimationFrame(updateCounter);
        } else {
          counter.textContent = target;
        }
      };

      updateCounter();
    });
  }

  // Trigger when hero section is in view
  const heroSection = document.getElementById('hero');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !animated) {
        animated = true;
        setTimeout(animateCounters, 500);
      }
    });
  }, { threshold: 0.5 });

  if (heroSection) {
    observer.observe(heroSection);
  }
}

/* MEDIA FILTER */
function initGalleryFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const galleryItems = document.querySelectorAll('.gallery-item');

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      // Filter items with animation
      galleryItems.forEach(item => {
        const category = item.getAttribute('data-category');
        const type = item.getAttribute('data-type');
        let shouldShow = false;

        // Determine if item should be shown
        if (filter === 'all') {
          shouldShow = true;
        } else if (filter === 'photos' || filter === 'videos') {
          shouldShow = type === filter.slice(0, -1); // Remove 's' from 'photos'/'videos'
        } else {
          shouldShow = category === filter;
        }

        // Show or hide with animation
        if (shouldShow) {
          item.classList.remove('hidden');
          item.style.animation = 'fadeInUp 0.5s ease forwards';
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });
}

/* REVIEWS CAROUSEL */
function initReviewsCarousel() {
  var track = document.querySelector('.reviews-track');
  var prevBtn = document.querySelector('.carousel-btn.prev');
  var nextBtn = document.querySelector('.carousel-btn.next');

  if (!track) return;
  if (!prevBtn || !nextBtn) {
    // Mobile: buttons might be hidden, just enable touch scrolling
    enableTouchScroll(track);
    return;
  }

  // Calculate scroll amount based on card width + gap
  var cardElement = track.querySelector('.review-card');
  var scrollAmount = cardElement ? cardElement.offsetWidth + 40 : 540; // Card width + gap

  // Smooth scroll function with custom animation
  function scrollTrack(amount) {
    var start = track.scrollLeft;
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var duration = isTouchDevice ? 1200 : 600; // Slower, smoother on mobile
    var startTime = null;

    // Custom animation for better control and compatibility
    function animate(currentTime) {
      if (!startTime) startTime = currentTime;
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var easing = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      track.scrollLeft = start + amount * easing;
      if (elapsed < duration) {
        requestAnimationFrame(animate);
      }
    }
    requestAnimationFrame(animate);
  }

  function scrollToStart() {
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var duration = isTouchDevice ? 1200 : 600; // Slower, smoother on mobile
    var start = track.scrollLeft;
    var startTime = null;

    // Custom animation to scroll back to start
    function animate(currentTime) {
      if (!startTime) startTime = currentTime;
      var elapsed = currentTime - startTime;
      var progress = Math.min(elapsed / duration, 1);
      var easing = progress < 0.5 ? 2 * progress * progress : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      track.scrollLeft = start * (1 - easing);
      if (elapsed < duration) requestAnimationFrame(animate);
    }
    requestAnimationFrame(animate);
  }

  prevBtn.addEventListener('click', function() {
    scrollTrack(-scrollAmount);
  });

  nextBtn.addEventListener('click', function() {
    scrollTrack(scrollAmount);
  });

  // Auto-scroll with pause on each review for reading
  var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  var readingTime = isTouchDevice ? 10000 : 8000; // Time to read each review: 10s mobile, 8s desktop
  var scrollDuration = isTouchDevice ? 1200 : 600; // Scroll animation duration
  var isPaused = false;

  function startAutoScroll() {
    if (isPaused) return;

    window.reviewsAutoScroll = setTimeout(function() {
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
        scrollToStart();
      } else {
        scrollTrack(scrollAmount);
      }
      // Wait for scroll to complete, then pause for reading
      setTimeout(startAutoScroll, scrollDuration + readingTime);
    }, readingTime);
  }

  // Start the auto-scroll
  startAutoScroll();

  // Pause auto-scroll on hover (desktop)
  track.addEventListener('mouseenter', function() {
    isPaused = true;
    clearTimeout(window.reviewsAutoScroll);
  });

  track.addEventListener('mouseleave', function() {
    isPaused = false;
    startAutoScroll();
  });

  // Pause auto-scroll on touch (mobile)
  if (isTouchDevice) {
    var resumeTimeout;

    track.addEventListener('touchstart', function() {
      isPaused = true;
      clearTimeout(window.reviewsAutoScroll);
      clearTimeout(resumeTimeout);
    });

    track.addEventListener('touchend', function() {
      // Resume auto-scroll after 5 seconds of inactivity
      resumeTimeout = setTimeout(function() {
        isPaused = false;
        startAutoScroll();
      }, 5000);
    });
  }

  // Enable touch scroll for all devices
  enableTouchScroll(track);
}

/* TOUCH SCROLL */
function enableTouchScroll(element) {
  var startX = 0;
  var scrollLeft = 0;
  var isDown = false;

  element.addEventListener('touchstart', function(e) {
    isDown = true;
    startX = e.touches[0].pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  }, { passive: true });

  element.addEventListener('touchmove', function(e) {
    if (!isDown) return;
    var x = e.touches[0].pageX - element.offsetLeft;
    var walk = (x - startX) * 2;
    element.scrollLeft = scrollLeft - walk;
  }, { passive: true });

  element.addEventListener('touchend', function() {
    isDown = false;
  }, { passive: true });
}

/* LOAD REVIEWS */
var MAX_REVIEWS = 8;

async function loadReviews() {
  const container = document.getElementById('reviews-container');
  const reviewCount = document.getElementById('review-count');

  try {
    const response = await fetch('reviews.json');
    var reviews = await response.json();
  } catch (e) {
    container.innerHTML = '<p style="color: var(--gray-400); text-align: center;">Unable to load reviews.</p>';
    return;
  }

  // Take the most recent reviews, capped at MAX_REVIEWS
  reviews = reviews.slice(0, MAX_REVIEWS);

  // Generate avatar initials from author name
  reviews.forEach(function(review) {
    review.avatar = review.author.split(' ').map(function(n) { return n[0]; }).join('');
  });

  // Clear skeleton loaders
  container.innerHTML = '';

  // Update review count
  reviewCount.textContent = reviews.length;

  // Render reviews
  reviews.forEach((review, index) => {
    const card = createReviewCard(review);
    card.style.animation = `fadeInUp 0.5s ease ${index * 0.1}s forwards`;
    card.style.opacity = '0';
    container.appendChild(card);
  });
}

function createReviewCard(review) {
  const card = document.createElement('div');
  card.className = 'review-card';

  const stars = '★'.repeat(review.rating) + '☆'.repeat(5 - review.rating);

  card.innerHTML = `
    <div class="review-header">
      <div class="review-avatar">${review.avatar}</div>
      <div>
        <div class="review-author">${review.author}</div>
        <div class="review-source">via ${review.source}</div>
      </div>
    </div>
    <div class="review-stars">${stars}</div>
    <p class="review-text">"${review.text}"</p>
    <div class="review-date">${review.date}</div>
  `;

  return card;
}

/* BACK TO TOP */
function initBackToTop() {
  const backToTop = document.getElementById('back-to-top');

  window.addEventListener('scroll', () => {
    if (window.pageYOffset > 500) {
      backToTop.classList.add('visible');
    } else {
      backToTop.classList.remove('visible');
    }
  });

  backToTop.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* SCROLL ANIMATIONS */
function initScrollAnimations() {
  const animatedElements = document.querySelectorAll('.service-card, .gallery-item, .about-image, .about-content');

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.animation = 'fadeInUp 0.6s ease forwards';
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  });

  animatedElements.forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

/* CONTACT FORM */
function initContactForm() {
  const form = document.getElementById('contact-form');

  if (!form) return;

  // Add real-time validation
  const inputs = form.querySelectorAll('input, select, textarea');
  inputs.forEach(input => {
    input.addEventListener('blur', () => validateField(input));
    input.addEventListener('input', () => {
      if (input.classList.contains('error')) {
        validateField(input);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Validate all fields
    let isValid = true;
    inputs.forEach(input => {
      if (!validateField(input)) {
        isValid = false;
      }
    });

    if (!isValid) {
      showNotification('Please fix the errors in the form.', 'error');
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');
    submitBtn.disabled = true;

    // Collect form data
    const formData = new FormData(form);

    try {
      const FORMSPREE_ENDPOINT = 'YOUR_FORMSPREE_ENDPOINT';

      if (FORMSPREE_ENDPOINT !== 'YOUR_FORMSPREE_ENDPOINT') {
        const response = await fetch(FORMSPREE_ENDPOINT, {
          method: 'POST',
          body: formData,
          headers: { 'Accept': 'application/json' }
        });

        if (!response.ok) throw new Error('Form submission failed');
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
        console.log('Demo mode:', Object.fromEntries(formData.entries()));
        console.warn('Configure FORMSPREE_ENDPOINT in main.js');
      }

      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;

      // Show success message
      showNotification('Thank you! We\'ll contact you within 24 hours.', 'success');

      // Reset form
      form.reset();
      inputs.forEach(input => {
        input.classList.remove('success', 'error');
        removeFieldError(input);
      });

    } catch (error) {
      submitBtn.classList.remove('loading');
      submitBtn.disabled = false;
      console.error('Form submission error:', error);
      showNotification('Oops! Something went wrong. Please try calling us directly.', 'error');
    }
  });
}

// Field validation function
function validateField(field) {
  const value = field.value.trim();
  const type = field.type;
  const required = field.hasAttribute('required');

  // Remove previous error
  removeFieldError(field);
  field.classList.remove('error', 'success');

  if (required && !value) {
    showFieldError(field, 'This field is required');
    return false;
  }

  if (value) {
    // Email validation
    if (type === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(value)) {
        showFieldError(field, 'Please enter a valid email address');
        return false;
      }
    }

    // Phone validation
    if (type === 'tel') {
      const digitsOnly = value.replace(/\D/g, '');
      if (digitsOnly.length !== 10) {
        showFieldError(field, 'Please enter a valid 10-digit phone number');
        return false;
      }
    }

    field.classList.add('success');
  }

  return true;
}

// Show field error
function showFieldError(field, message) {
  field.classList.add('error');

  // Remove existing error message
  const existingError = field.parentNode.querySelector('.field-error');
  if (existingError) existingError.remove();

  // Add error message
  const errorDiv = document.createElement('div');
  errorDiv.className = 'field-error';
  errorDiv.textContent = message;
  field.parentNode.appendChild(errorDiv);
}

// Remove field error
function removeFieldError(field) {
  const errorDiv = field.parentNode.querySelector('.field-error');
  if (errorDiv) errorDiv.remove();
}

/* NOTIFICATIONS */
function showNotification(message, type = 'info') {
  // Remove existing notifications
  const existing = document.querySelector('.notification');
  if (existing) existing.remove();

  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <span>${message}</span>
    <button class="notification-close">&times;</button>
  `;

  // Add styles dynamically
  const colors = {
    success: { bg: '#9dc334', text: '#041e1f' },
    error: { bg: '#e53e3e', text: '#fff' },
    info: { bg: '#e48705', text: '#fff' }
  };

  const color = colors[type] || colors.info;

  notification.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: ${color.bg};
    color: ${color.text};
    padding: 15px 25px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 500;
    animation: slideUp 0.5s ease forwards;
    max-width: 90%;
  `;

  // Add animation keyframes
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideUp {
      to { transform: translateX(-50%) translateY(0); }
    }
  `;
  document.head.appendChild(style);

  document.body.appendChild(notification);

  // Close button
  notification.querySelector('.notification-close').addEventListener('click', () => {
    notification.style.animation = 'slideUp 0.5s ease reverse forwards';
    setTimeout(() => notification.remove(), 500);
  });

  // Auto-remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) {
      notification.style.animation = 'slideUp 0.5s ease reverse forwards';
      setTimeout(() => notification.remove(), 500);
    }
  }, 5000);
}

/* PHONE FORMATTING */
document.addEventListener('DOMContentLoaded', () => {
  const phoneInput = document.getElementById('phone');

  if (phoneInput) {
    phoneInput.addEventListener('input', (e) => {
      let value = e.target.value.replace(/\D/g, '');

      if (value.length >= 10) {
        value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6,10)}`;
      } else if (value.length >= 6) {
        value = `(${value.slice(0,3)}) ${value.slice(3,6)}-${value.slice(6)}`;
      } else if (value.length >= 3) {
        value = `(${value.slice(0,3)}) ${value.slice(3)}`;
      }

      e.target.value = value;
    });
  }
});


/* LAZY LOADING */
function initLazyLoading() {
  const images = document.querySelectorAll('img[loading="lazy"]');

  // Check if browser supports native lazy loading
  if ('loading' in HTMLImageElement.prototype) {
    // Browser supports native lazy loading, nothing more needed
    return;
  }

  // Fallback: Use Intersection Observer for older browsers
  if ('IntersectionObserver' in window) {
    const imageObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target;
          if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
          }
          img.classList.add('loaded');
          observer.unobserve(img);
        }
      });
    }, {
      rootMargin: '50px 0px',
      threshold: 0.01
    });

    images.forEach(img => imageObserver.observe(img));
  } else {
    // Fallback for very old browsers - load all images immediately
    images.forEach(img => {
      if (img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  }
}

// Initialize lazy loading when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLazyLoading);
} else {
  initLazyLoading();
}

/* COST CALCULATOR */
function initCostCalculator() {
  const heightSelect = document.getElementById('tree-height');
  const serviceSelect = document.getElementById('service-type');
  const conditionSelect = document.getElementById('tree-condition');
  const pruningConditionSelect = document.getElementById('pruning-condition');
  const stormConditionSelect = document.getElementById('storm-condition');
  const accessibilitySelect = document.getElementById('accessibility');
  const resultDisplay = document.getElementById('cost-result');

  var conditionGroup = document.getElementById('condition-group');
  var pruningConditionGroup = document.getElementById('pruning-condition-group');
  var stormConditionGroup = document.getElementById('storm-condition-group');

  // Show the right condition field based on service type
  serviceSelect.addEventListener('change', function() {
    var isRemoval = serviceSelect.value === '1';
    var isPruning = serviceSelect.value === '0.5';
    var isStorm = serviceSelect.value === '0.7';
    conditionGroup.style.display = isRemoval ? '' : 'none';
    pruningConditionGroup.style.display = isPruning ? '' : 'none';
    stormConditionGroup.style.display = isStorm ? '' : 'none';
    if (!isRemoval) conditionSelect.value = '';
    if (!isPruning) pruningConditionSelect.value = '';
    if (!isStorm) stormConditionSelect.value = '';
    calculateCost();
  });

  function getConditionMultiplier() {
    var sv = serviceSelect.value;
    if (sv === '1') return parseFloat(conditionSelect.value) || 0;
    if (sv === '0.5') return parseFloat(pruningConditionSelect.value) || 0;
    if (sv === '0.7') return parseFloat(stormConditionSelect.value) || 0;
    return 1;
  }

  function needsConditionInput() {
    var sv = serviceSelect.value;
    if (sv === '1') return !conditionSelect.value;
    if (sv === '0.5') return !pruningConditionSelect.value;
    if (sv === '0.7') return !stormConditionSelect.value;
    return false;
  }

  function calculateCost() {
    const height = parseFloat(heightSelect.value) || 0;
    const service = parseFloat(serviceSelect.value) || 0;
    const condition = getConditionMultiplier();
    const accessibility = parseFloat(accessibilitySelect.value) || 0;

    if (height && service && !needsConditionInput() && accessibility) {
      const baseCost = height * service * condition * accessibility;
      const minCost = Math.round(baseCost * 0.8);
      const maxCost = Math.round(baseCost * 1.2);

      resultDisplay.textContent = `$${minCost.toLocaleString()} - $${maxCost.toLocaleString()}`;
      resultDisplay.style.animation = 'none';
      setTimeout(() => {
        resultDisplay.style.animation = 'countUp 0.5s ease';
      }, 10);
    } else {
      resultDisplay.textContent = '$0 - $0';
    }
  }

  [heightSelect, serviceSelect, conditionSelect, pruningConditionSelect, stormConditionSelect, accessibilitySelect].forEach(select => {
    select.addEventListener('change', calculateCost);
  });
}

/* FAQ ACCORDION */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');

    question.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      faqItems.forEach(otherItem => {
        otherItem.classList.remove('active');
      });

      if (!isActive) {
        item.classList.add('active');
      }
    });
  });
}
