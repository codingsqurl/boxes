/* ============================================
   TREE HOPPERS - Main JavaScript
   Cross-browser compatible (Safari, Chrome, Firefox, DuckDuckGo, Edge)
   ============================================ */

// Polyfill for smooth scroll (Safari < 15.4)
(function() {
  if (!('scrollBehavior' in document.documentElement.style)) {
    var script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/smoothscroll-polyfill@0.4.4/dist/smoothscroll.min.js';
    script.onload = function() {
      if (typeof window.__forceSmoothScrollPolyfill__ !== 'undefined') {
        window.__forceSmoothScrollPolyfill__ = true;
      }
    };
    document.head.appendChild(script);
  }
})();

// Polyfill for Object.fromEntries (older browsers)
if (!Object.fromEntries) {
  Object.fromEntries = function(entries) {
    var obj = {};
    entries.forEach(function(entry) {
      obj[entry[0]] = entry[1];
    });
    return obj;
  };
}

// Polyfill for Element.closest (IE11)
if (!Element.prototype.closest) {
  Element.prototype.closest = function(s) {
    var el = this;
    do {
      if (el.matches(s)) return el;
      el = el.parentElement || el.parentNode;
    } while (el !== null && el.nodeType === 1);
    return null;
  };
}

// Polyfill for Element.matches
if (!Element.prototype.matches) {
  Element.prototype.matches = Element.prototype.msMatchesSelector || Element.prototype.webkitMatchesSelector;
}

document.addEventListener('DOMContentLoaded', function() {
  // Initialize all modules
  initLoader();
  initNavbar();
  initMobileMenu();
  initCounterAnimation();
  initGalleryFilter();
  initReviewsCarousel();
  initBackToTop();
  initScrollAnimations();
  initContactForm();
  loadReviews();
});

/* ============================================
   PAGE LOADER
   ============================================ */
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

/* ============================================
   NAVBAR SCROLL EFFECT
   ============================================ */
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

// Custom smooth scroll function for Safari compatibility
function smoothScrollTo(target) {
  var targetPosition = target.getBoundingClientRect().top + window.pageYOffset - 80;
  var startPosition = window.pageYOffset;
  var distance = targetPosition - startPosition;
  var duration = 800;
  var start = null;

  // Check if browser supports smooth scroll natively
  if ('scrollBehavior' in document.documentElement.style) {
    window.scrollTo({ top: targetPosition, behavior: 'smooth' });
    return;
  }

  // Fallback animation for Safari
  function animation(currentTime) {
    if (start === null) start = currentTime;
    var timeElapsed = currentTime - start;
    var progress = Math.min(timeElapsed / duration, 1);
    var easing = easeInOutCubic(progress);
    window.scrollTo(0, startPosition + distance * easing);
    if (timeElapsed < duration) {
      requestAnimationFrame(animation);
    }
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  requestAnimationFrame(animation);
}

/* ============================================
   MOBILE MENU
   ============================================ */
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

/* ============================================
   COUNTER ANIMATION
   ============================================ */
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

/* ============================================
   GALLERY FILTER
   ============================================ */
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

        if (filter === 'all' || category === filter) {
          item.classList.remove('hidden');
          item.style.animation = 'fadeInUp 0.5s ease forwards';
        } else {
          item.classList.add('hidden');
        }
      });
    });
  });
}

/* ============================================
   REVIEWS CAROUSEL
   ============================================ */
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

  var scrollAmount = 380; // Card width + gap

  // Safari-compatible scroll function
  function scrollTrack(amount) {
    var start = track.scrollLeft;
    var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    var duration = isTouchDevice ? 800 : 300; // Slower, smoother on mobile
    var startTime = null;

    // Try native smooth scroll first
    if ('scrollBehavior' in document.documentElement.style) {
      track.scrollBy({ left: amount, behavior: 'smooth' });
      return;
    }

    // Fallback animation for Safari
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
    var duration = isTouchDevice ? 800 : 300; // Slower, smoother on mobile

    if ('scrollBehavior' in document.documentElement.style) {
      track.scrollTo({ left: 0, behavior: 'smooth' });
    } else {
      // Fallback
      var start = track.scrollLeft;
      var startTime = null;
      function animate(currentTime) {
        if (!startTime) startTime = currentTime;
        var elapsed = currentTime - startTime;
        var progress = Math.min(elapsed / duration, 1);
        track.scrollLeft = start * (1 - progress);
        if (elapsed < duration) requestAnimationFrame(animate);
      }
      requestAnimationFrame(animate);
    }
  }

  prevBtn.addEventListener('click', function() {
    scrollTrack(-scrollAmount);
  });

  nextBtn.addEventListener('click', function() {
    scrollTrack(scrollAmount);
  });

  // Auto-scroll with different speeds for mobile vs desktop
  var isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  var autoScrollInterval = isTouchDevice ? 8000 : 5000; // 8 seconds for mobile, 5 for desktop

  // Auto-scroll
  window.reviewsAutoScroll = setInterval(function() {
    if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
      scrollToStart();
    } else {
      scrollTrack(scrollAmount);
    }
  }, autoScrollInterval);

  // Pause auto-scroll on hover (desktop)
  track.addEventListener('mouseenter', function() {
    clearInterval(window.reviewsAutoScroll);
  });

  track.addEventListener('mouseleave', function() {
    window.reviewsAutoScroll = setInterval(function() {
      if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
        scrollToStart();
      } else {
        scrollTrack(scrollAmount);
      }
    }, autoScrollInterval);
  });

  // Pause auto-scroll on touch (mobile)
  if (isTouchDevice) {
    track.addEventListener('touchstart', function() {
      clearInterval(window.reviewsAutoScroll);
    });

    track.addEventListener('touchend', function() {
      // Resume auto-scroll after 3 seconds of inactivity
      setTimeout(function() {
        window.reviewsAutoScroll = setInterval(function() {
          if (track.scrollLeft + track.clientWidth >= track.scrollWidth - 10) {
            scrollToStart();
          } else {
            scrollTrack(scrollAmount);
          }
        }, autoScrollInterval);
      }, 3000);
    });
  }

  // Enable touch scroll for all devices
  enableTouchScroll(track);
}

/* ============================================
   TOUCH SCROLL ENHANCEMENT FOR MOBILE
   ============================================ */
function enableTouchScroll(element) {
  var startX = 0;
  var scrollLeft = 0;
  var isDown = false;
  var hasMoved = false;

  element.addEventListener('touchstart', function(e) {
    isDown = true;
    hasMoved = false;
    startX = e.touches[0].pageX - element.offsetLeft;
    scrollLeft = element.scrollLeft;
  }, { passive: true });

  element.addEventListener('touchmove', function(e) {
    if (!isDown) return;
    hasMoved = true;
    var x = e.touches[0].pageX - element.offsetLeft;
    var walk = (x - startX) * 2;
    element.scrollLeft = scrollLeft - walk;
  }, { passive: true });

  element.addEventListener('touchend', function() {
    isDown = false;
  }, { passive: true });
}

/* ============================================
   LOAD REVIEWS (Dynamic)
   ============================================ */
async function loadReviews() {
  const container = document.getElementById('reviews-container');
  const reviewCount = document.getElementById('review-count');

  // Simulated reviews data - In production, this would fetch from Google Places API or Yelp API
  // To use real Google reviews, you'd need:
  // 1. Google Places API key
  // 2. Place ID for Tree Hoppers
  // 3. Fetch from: https://maps.googleapis.com/maps/api/place/details/json?place_id=YOUR_PLACE_ID&fields=reviews&key=YOUR_API_KEY

  const reviews = [
    {
      author: "Sarah Mitchell",
      avatar: "SM",
      rating: 5,
      text: "Paul and his team did an amazing job removing a dangerous tree from our backyard. They were professional, efficient, and cleaned up everything perfectly. Highly recommend Tree Hoppers!",
      date: "2 weeks ago",
      source: "Google"
    },
    {
      author: "Mike Thompson",
      avatar: "MT",
      rating: 5,
      text: "After the recent storm damaged several trees on our property, Tree Hoppers responded quickly and took care of everything. Their expertise really showed. Will definitely use them again.",
      date: "1 month ago",
      source: "Yelp"
    },
    {
      author: "Jennifer Rodriguez",
      avatar: "JR",
      rating: 5,
      text: "Great fire mitigation work! They thinned out the trees around our cabin and now we feel much safer. Paul was very knowledgeable about local regulations and insurance requirements.",
      date: "3 weeks ago",
      source: "Google"
    },
    {
      author: "David Kim",
      avatar: "DK",
      rating: 5,
      text: "Best tree service in Colorado Springs. Fair prices, excellent communication, and the crew was super careful around our landscaping. They even helped us understand which trees needed attention.",
      date: "2 months ago",
      source: "Facebook"
    },
    {
      author: "Lisa Anderson",
      avatar: "LA",
      rating: 5,
      text: "We've used Tree Hoppers twice now - once for pruning and once for removing a dead pine. Both times they exceeded our expectations. Professional, on-time, and reasonably priced.",
      date: "1 week ago",
      source: "Google"
    },
    {
      author: "Robert Chen",
      avatar: "RC",
      rating: 5,
      text: "Called them for an emergency after a tree fell during a storm. They came out the same day and made everything safe. Can't thank them enough for their quick response!",
      date: "1 month ago",
      source: "Yelp"
    },
    {
      author: "Amanda Foster",
      avatar: "AF",
      rating: 5,
      text: "Paul is incredibly knowledgeable about Colorado trees and their specific needs. He helped us create a plan for our entire property. The ISA certification really shows in his work.",
      date: "3 weeks ago",
      source: "Google"
    },
    {
      author: "James Wilson",
      avatar: "JW",
      rating: 5,
      text: "Tree Hoppers transformed our overgrown backyard into a beautiful, safe space. Their attention to detail and cleanup was impressive. Would recommend to anyone in the Springs area!",
      date: "2 weeks ago",
      source: "Facebook"
    }
  ];

  // Simulate loading delay
  await new Promise(resolve => setTimeout(resolve, 1500));

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

/* ============================================
   FETCH REAL GOOGLE REVIEWS (Template)
   ============================================ */
// Uncomment and configure this function to fetch real Google reviews
// You'll need a Google Places API key and the Place ID for Tree Hoppers

/*
async function fetchGoogleReviews() {
  const GOOGLE_API_KEY = 'YOUR_GOOGLE_API_KEY';
  const PLACE_ID = 'YOUR_PLACE_ID'; // Find this on Google Maps

  try {
    // Note: This needs to be done through a backend server due to CORS
    // You'd create a simple API endpoint that fetches and returns the data
    const response = await fetch(`/api/reviews?place_id=${PLACE_ID}`);
    const data = await response.json();

    return data.result.reviews.map(review => ({
      author: review.author_name,
      avatar: review.author_name.split(' ').map(n => n[0]).join(''),
      rating: review.rating,
      text: review.text,
      date: review.relative_time_description,
      source: 'Google'
    }));
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return [];
  }
}
*/

/* ============================================
   BACK TO TOP BUTTON
   ============================================ */
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

/* ============================================
   SCROLL ANIMATIONS
   ============================================ */
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

/* ============================================
   CONTACT FORM
   ============================================ */
function initContactForm() {
  const form = document.getElementById('contact-form');

  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.classList.add('loading');

    // Collect form data
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());

    // Simulate form submission
    // In production, you'd send this to your server or a service like Formspree
    await new Promise(resolve => setTimeout(resolve, 2000));

    submitBtn.classList.remove('loading');

    // Show success message
    showNotification('Thank you! We\'ll contact you within 24 hours.', 'success');

    // Reset form
    form.reset();

    // Log data (for development)
    console.log('Form submitted:', data);

    // Example: Send to Formspree (free form backend)
    // await fetch('https://formspree.io/f/YOUR_FORM_ID', {
    //   method: 'POST',
    //   body: formData,
    //   headers: { 'Accept': 'application/json' }
    // });
  });
}

/* ============================================
   NOTIFICATION SYSTEM
   ============================================ */
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
  notification.style.cssText = `
    position: fixed;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%) translateY(100px);
    background: ${type === 'success' ? '#9dc334' : '#e48705'};
    color: ${type === 'success' ? '#041e1f' : '#fff'};
    padding: 15px 25px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    gap: 15px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    z-index: 10000;
    font-weight: 500;
    animation: slideUp 0.5s ease forwards;
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

/* ============================================
   PHONE NUMBER FORMATTING
   ============================================ */
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

/* ============================================
   PARALLAX EFFECT (Optional Enhancement)
   ============================================ */
function initParallax() {
  const heroBg = document.querySelector('.hero-bg');

  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    if (heroBg && scrolled < window.innerHeight) {
      heroBg.style.transform = `scale(1.1) translateY(${scrolled * 0.3}px)`;
    }
  });
}

// Initialize parallax
initParallax();
