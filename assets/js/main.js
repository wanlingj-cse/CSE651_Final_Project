/**
 * PETER'S BAKERY — MAIN JAVASCRIPT
 * Real-time business status, interactive cart, cake customizer, lightbox, and FAQ search.
 */

document.addEventListener('DOMContentLoaded', () => {
  initBusinessHours();
  initHeaderScroll();
  initMobileNav();
  initFaqAccordions();
  initFaqSearch();
  initMenuFilters();
  initLightbox();
  initCustomizer();
  initCart();
  initNoticeModal();
});

/* ==========================================================================
   1. Real-Time Store Hours & Status Badge
   Tuesday – Saturday: 6:30 AM – 6:00 PM
   Sunday & Monday: Closed
   ========================================================================== */
function initBusinessHours() {
  const badge = document.getElementById('live-status-badge');
  if (!badge) return;

  const now = new Date();
  const day = now.getDay(); // 0 = Sun, 1 = Mon, 2 = Tue, ..., 6 = Sat
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const currentTime = hours * 60 + minutes;

  const openTime = 6 * 60 + 30; // 6:30 AM (390 mins)
  const closeTime = 18 * 60;    // 6:00 PM (1080 mins)

  const isStoreDay = day >= 2 && day <= 6; // Tue through Sat
  const isOpen = isStoreDay && currentTime >= openTime && currentTime < closeTime;

  if (isOpen) {
    badge.className = 'status-badge open';
    badge.innerHTML = '<span class="status-indicator"></span> Open Now &bull; Closes 6:00 PM';
  } else {
    badge.className = 'status-badge closed';
    if (day === 0) {
      badge.innerHTML = '<span class="status-indicator"></span> Closed &bull; Opens Tuesday 6:30 AM';
    } else if (day === 1) {
      badge.innerHTML = '<span class="status-indicator"></span> Closed &bull; Opens Tomorrow 6:30 AM';
    } else if (currentTime < openTime && isStoreDay) {
      badge.innerHTML = '<span class="status-indicator"></span> Closed &bull; Opens Today 6:30 AM';
    } else {
      badge.innerHTML = '<span class="status-indicator"></span> Closed &bull; Opens ' + (day === 6 ? 'Tuesday' : 'Tomorrow') + ' 6:30 AM';
    }
  }
}

/* ==========================================================================
   2. Sticky Header Scroll Effect
   ========================================================================== */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });
}

/* ==========================================================================
   3. Mobile Navigation Drawer
   ========================================================================== */
function initMobileNav() {
  const openBtn = document.querySelector('.mobile-menu-btn');
  const drawer = document.querySelector('.mobile-nav-drawer');
  const closeBtn = document.querySelector('.mobile-nav-close');
  const backdrop = document.querySelector('.mobile-nav-backdrop');
  const navLinks = document.querySelectorAll('.mobile-nav-link');

  if (!openBtn || !drawer) return;

  function openDrawer() {
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    drawer.classList.remove('active');
    document.body.style.overflow = '';
  }

  openBtn.addEventListener('click', openDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  navLinks.forEach(link => link.addEventListener('click', closeDrawer));
}

/* ==========================================================================
   4. FAQ Accordions
   ========================================================================== */
function initFaqAccordions() {
  const faqCards = document.querySelectorAll('.faq-card');
  faqCards.forEach(card => {
    const btn = card.querySelector('.faq-question-btn');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const isOpen = card.classList.contains('open');
      
      // Close all others (optional for single open)
      faqCards.forEach(c => {
        if (c !== card) c.classList.remove('open');
      });

      card.classList.toggle('open', !isOpen);
    });
  });
}

/* ==========================================================================
   5. FAQ Live Search
   ========================================================================== */
function initFaqSearch() {
  const searchInput = document.getElementById('faq-search-input');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    const faqCards = document.querySelectorAll('.faq-card');
    let visibleCount = 0;

    faqCards.forEach(card => {
      const q = card.querySelector('.faq-question-text')?.innerText.toLowerCase() || '';
      const a = card.querySelector('.faq-answer-inner')?.innerText.toLowerCase() || '';
      
      if (q.includes(query) || a.includes(query)) {
        card.style.display = 'block';
        visibleCount++;
      } else {
        card.style.display = 'none';
      }
    });

    const noResults = document.getElementById('faq-no-results');
    if (noResults) {
      noResults.style.display = visibleCount === 0 ? 'block' : 'none';
    }
  });
}

/* ==========================================================================
   6. Menu Filter Tabs
   ========================================================================== */
function initMenuFilters() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const menuItems = document.querySelectorAll('.menu-item-row');

  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filter = btn.getAttribute('data-filter');

      menuItems.forEach(item => {
        const cat = item.getAttribute('data-category');
        if (filter === 'all' || cat === filter) {
          item.style.display = 'flex';
        } else {
          item.style.display = 'none';
        }
      });
    });
  });
}

/* ==========================================================================
   7. Gallery Lightbox
   ========================================================================== */
let currentLightboxIdx = 0;
let lightboxItems = [];

function initLightbox() {
  const galleryElements = document.querySelectorAll('.gallery-item');
  const modal = document.getElementById('lightbox-modal');
  if (!modal || !galleryElements.length) return;

  lightboxItems = Array.from(galleryElements).map(el => {
    const img = el.querySelector('img');
    const title = el.querySelector('h4')?.innerText || 'Peters Bakery';
    const desc = el.querySelector('p')?.innerText || '';
    return {
      src: img?.getAttribute('data-full') || img?.src,
      title: title,
      desc: desc
    };
  });

  galleryElements.forEach((el, idx) => {
    el.addEventListener('click', () => {
      openLightbox(idx);
    });
  });

  const closeBtn = document.querySelector('.lightbox-close');
  const prevBtn = document.querySelector('.lightbox-prev');
  const nextBtn = document.querySelector('.lightbox-next');

  if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
  if (prevBtn) prevBtn.addEventListener('click', prevLightbox);
  if (nextBtn) nextBtn.addEventListener('click', nextLightbox);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeLightbox();
  });

  document.addEventListener('keydown', (e) => {
    if (!modal.classList.contains('active')) return;
    if (e.key === 'Escape') closeLightbox();
    if (e.key === 'ArrowLeft') prevLightbox();
    if (e.key === 'ArrowRight') nextLightbox();
  });
}

function openLightbox(idx) {
  currentLightboxIdx = idx;
  const modal = document.getElementById('lightbox-modal');
  const img = document.getElementById('lightbox-img');
  const caption = document.getElementById('lightbox-caption');

  const item = lightboxItems[idx];
  if (!item) return;

  img.src = item.src;
  caption.innerHTML = `<strong>${item.title}</strong><br><span style="font-size:0.9rem; opacity:0.8;">${item.desc}</span>`;

  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeLightbox() {
  const modal = document.getElementById('lightbox-modal');
  if (!modal) return;
  modal.classList.remove('active');
  document.body.style.overflow = '';
}

function prevLightbox() {
  currentLightboxIdx = (currentLightboxIdx - 1 + lightboxItems.length) % lightboxItems.length;
  openLightbox(currentLightboxIdx);
}

function nextLightbox() {
  currentLightboxIdx = (currentLightboxIdx + 1) % lightboxItems.length;
  openLightbox(currentLightboxIdx);
}

/* ==========================================================================
   8. Burnt Almond Cake Customizer
   ========================================================================== */
function initCustomizer() {
  const sizeCards = document.querySelectorAll('.radio-card');
  const fillingSelect = document.getElementById('custard-filling');
  const inscriptionInput = document.getElementById('cake-inscription');
  const previewSize = document.getElementById('preview-size-text');
  const previewFilling = document.getElementById('preview-filling-text');
  const previewInscription = document.getElementById('preview-inscription-text');
  const previewPrice = document.getElementById('preview-total-price');
  const addCustomBtn = document.getElementById('add-custom-cake-btn');

  if (!sizeCards.length) return;

  let currentPrice = 32.50;
  let currentSize = '7" Round (Serves 6–8)';

  sizeCards.forEach(card => {
    card.addEventListener('click', () => {
      sizeCards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');

      currentPrice = parseFloat(card.getAttribute('data-price')) || 32.50;
      currentSize = card.getAttribute('data-size') || '7" Round';

      if (previewSize) previewSize.innerText = currentSize;
      if (previewPrice) previewPrice.innerText = `$${currentPrice.toFixed(2)}`;
    });
  });

  if (fillingSelect) {
    fillingSelect.addEventListener('change', () => {
      if (previewFilling) previewFilling.innerText = fillingSelect.value;
    });
  }

  if (inscriptionInput) {
    inscriptionInput.addEventListener('input', () => {
      const val = inscriptionInput.value.trim();
      if (previewInscription) {
        previewInscription.innerText = val ? `"${val}"` : 'None';
      }
    });
  }

  if (addCustomBtn) {
    addCustomBtn.addEventListener('click', () => {
      const filling = fillingSelect ? fillingSelect.value : 'Traditional Bavarian Custard';
      const inscription = inscriptionInput ? inscriptionInput.value.trim() : '';
      
      addToCart({
        id: 'burnt-almond-custom-' + Date.now(),
        name: 'Burnt Almond Cake (' + currentSize + ')',
        details: 'Filling: ' + filling + (inscription ? ' • Note: "' + inscription + '"' : ''),
        price: currentPrice,
        img: 'assets/images/burnt-almond.jpg',
        quantity: 1
      });

      showToast('Burnt Almond Cake added to your box!');
      openCart();
    });
  }
}

/* ==========================================================================
   9. Cart Drawer & State Management
   ========================================================================== */
let cart = [];
let cartDrawerEl = null;
let cartOverlayEl = null;

function openCart() {
  if (!cartDrawerEl) cartDrawerEl = document.getElementById('cart-drawer');
  if (!cartOverlayEl) cartOverlayEl = document.getElementById('cart-drawer-overlay');
  if (cartDrawerEl && cartOverlayEl) {
    cartDrawerEl.classList.add('active');
    cartOverlayEl.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeCart() {
  if (!cartDrawerEl) cartDrawerEl = document.getElementById('cart-drawer');
  if (!cartOverlayEl) cartOverlayEl = document.getElementById('cart-drawer-overlay');
  if (cartDrawerEl && cartOverlayEl) {
    cartDrawerEl.classList.remove('active');
    cartOverlayEl.classList.remove('active');
    document.body.style.overflow = '';
  }
}
window.openCart = openCart;
window.closeCart = closeCart;

function initCart() {
  // Load from session or memory
  try {
    const saved = localStorage.getItem('peters_bakery_cart');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {}

  updateCartUI();

  const cartToggleBtns = document.querySelectorAll('.cart-toggle-btn');
  const cartCloseBtn = document.getElementById('cart-drawer-close');
  cartDrawerEl = document.getElementById('cart-drawer');
  cartOverlayEl = document.getElementById('cart-drawer-overlay');

  cartToggleBtns.forEach(b => b.addEventListener('click', openCart));
  if (cartCloseBtn) cartCloseBtn.addEventListener('click', closeCart);
  if (cartOverlayEl) cartOverlayEl.addEventListener('click', closeCart);

  // Direct quick add buttons
  document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const name = btn.getAttribute('data-name');
      const price = parseFloat(btn.getAttribute('data-price')) || 0;
      const img = btn.getAttribute('data-img') || 'assets/images/logo.png';
      const details = btn.getAttribute('data-desc') || '';

      addToCart({
        id: 'item-' + name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
        name: name,
        details: details,
        price: price,
        img: img,
        quantity: 1
      });

      showToast(`Added ${name} to your box!`);
      openCart();
    });
  });

  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (!cart || cart.length === 0) {
        showToast('Your bakery box is empty! Please select a cake or menu item.');
        closeCart();
        const customizer = document.getElementById('cake-customizer-section');
        if (customizer) {
          customizer.scrollIntoView({ behavior: 'smooth' });
        } else {
          window.location.href = 'orders.html#cake-customizer-section';
        }
        return;
      }
      initiateStripeCheckout();
    });
  }
}

async function initiateStripeCheckout() {
  if (!cart || cart.length === 0) {
    showToast('Your bakery box is currently empty!');
    return;
  }

  const checkoutBtn = document.getElementById('cart-checkout-btn');
  const dateInput = document.getElementById('cart-pickup-date') || document.getElementById('pickup-date');
  const timeSelect = document.getElementById('cart-pickup-time') || document.getElementById('pickup-time');
  const notesInput = document.getElementById('cart-pickup-notes');

  // Enforce 48-hour minimum pickup date
  let pickupDate = dateInput ? dateInput.value : '';
  if (!pickupDate) {
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 2);
    pickupDate = minDate.toISOString().split('T')[0];
  }
  const pickupTime = timeSelect ? timeSelect.value : 'Morning (9:00 AM - 12:00 PM)';
  const customerNotes = notesInput ? notesInput.value : '';

  const originalContent = checkoutBtn ? checkoutBtn.innerHTML : '';
  if (checkoutBtn) {
    checkoutBtn.disabled = true;
    checkoutBtn.innerHTML = `
      <span class="spinner" style="width: 14px; height: 14px; border: 2px solid #fff; border-top-color: transparent; border-radius: 50%; display: inline-block; animation: spin 0.6s linear infinite; vertical-align: middle; margin-right: 6px;"></span>
      <span>Opening Stripe Checkout...</span>
    `;
  }

  let rewardsEmail = '';
  try {
    const rawUser = localStorage.getItem('pb_supabase_rewards_user');
    if (rawUser) {
      const u = JSON.parse(rawUser);
      rewardsEmail = u.email || '';
    }
  } catch(e) {}

  try {
    const res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: cart,
        pickupDate,
        pickupTime,
        customerNotes,
        customerEmail: rewardsEmail,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Failed to create checkout session');
    }

    if (data.url) {
      window.location.href = data.url;
    } else {
      throw new Error('No checkout URL received from Stripe');
    }
  } catch (err) {
    console.error('Stripe Checkout Error:', err);
    showToast(`Checkout Error: ${err.message}`);
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = originalContent;
    }
  }
}

function addToCart(item) {
  const existing = cart.find(i => i.name === item.name && i.details === item.details);
  if (existing) {
    existing.quantity += item.quantity;
  } else {
    cart.push(item);
  }
  saveCart();
  updateCartUI();
}

function removeFromCart(idx) {
  cart.splice(idx, 1);
  saveCart();
  updateCartUI();
}

function saveCart() {
  try {
    localStorage.setItem('peters_bakery_cart', JSON.stringify(cart));
  } catch (e) {}
}

function updateCartUI() {
  const badges = document.querySelectorAll('.cart-badge');
  const container = document.getElementById('cart-items-container');
  const subtotalEl = document.getElementById('cart-subtotal-val');
  const footerEl = document.querySelector('.cart-drawer-footer');

  const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  badges.forEach(b => {
    b.innerText = totalCount;
    b.style.display = totalCount > 0 ? 'flex' : 'none';
  });

  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="empty-cart-message" style="text-align: center; padding: 2rem 1rem;">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin: 0 auto 1rem; color: var(--color-caramel);">
          <circle cx="9" cy="21" r="1"></circle>
          <circle cx="20" cy="21" r="1"></circle>
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
        </svg>
        <p style="font-size: 1.1rem; color: var(--color-primary); margin-bottom: 4px;"><strong>Your bakery box is empty</strong></p>
        <p style="font-size: 0.88rem; margin: 4px 0 16px; color: var(--color-text-muted);">
          Customize a fresh Burnt Almond Cake below or order from our full online menu.
        </p>
        <div style="display: flex; flex-direction: column; gap: 8px; max-width: 260px; margin: 0 auto;">
          <button class="btn btn-primary btn-sm" onclick="closeCart(); document.getElementById('cake-customizer-section')?.scrollIntoView({behavior: 'smooth'})">
            Build Custom Cake &darr;
          </button>
          <a href="/online/petersbakery" class="btn btn-outline btn-sm" style="text-align: center;">
            Explore Toast Tab Menu &rarr;
          </a>
        </div>
      </div>
    `;
    if (subtotalEl) subtotalEl.innerText = '$0.00';
    const checkoutBtn = document.getElementById('cart-checkout-btn');
    if (checkoutBtn) {
      checkoutBtn.disabled = false;
      checkoutBtn.innerHTML = `Proceed to Review & Pickup`;
    }
    const pickupControls = document.getElementById('cart-pickup-scheduler');
    if (pickupControls) pickupControls.style.display = 'none';
    return;
  }

  let subtotal = 0;
  container.innerHTML = cart.map((item, idx) => {
    const itemTotal = item.price * item.quantity;
    subtotal += itemTotal;
    return `
      <div class="cart-item">
        <img src="${item.img}" alt="${item.name}" class="cart-item-img">
        <div class="cart-item-info">
          <div class="cart-item-name">${item.name}</div>
          ${item.details ? `<div class="cart-item-meta">${item.details}</div>` : ''}
          <div class="cart-item-price">$${item.price.toFixed(2)} &times; ${item.quantity} = $${itemTotal.toFixed(2)}</div>
        </div>
        <button onclick="removeFromCart(${idx})" style="color: var(--color-danger); font-size: 1.1rem; padding: 4px;" title="Remove">&times;</button>
      </div>
    `;
  }).join('');

  if (subtotalEl) subtotalEl.innerText = `$${subtotal.toFixed(2)}`;

  // Ensure pickup scheduler controls exist in cart drawer
  let pickupControls = document.getElementById('cart-pickup-scheduler');
  if (!pickupControls && footerEl) {
    pickupControls = document.createElement('div');
    pickupControls.id = 'cart-pickup-scheduler';
    pickupControls.innerHTML = `
      <div style="background: #faf6f0; border: 1px solid var(--color-border); border-radius: 8px; padding: 10px; margin-bottom: 12px;">
        <div style="font-size: 0.8rem; font-weight: 600; color: var(--color-primary); margin-bottom: 6px; display: flex; align-items: center; gap: 4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Pickup at 3108 Alum Rock Ave (48h Lead Time)
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-bottom: 6px;">
          <div>
            <label for="cart-pickup-date" style="font-size: 0.7rem; color: var(--color-text-muted); display: block;">Pickup Date</label>
            <input type="date" id="cart-pickup-date" style="width: 100%; font-size: 0.8rem; padding: 4px 6px; border: 1px solid var(--color-border); border-radius: 4px;">
          </div>
          <div>
            <label for="cart-pickup-time" style="font-size: 0.7rem; color: var(--color-text-muted); display: block;">Time Window</label>
            <select id="cart-pickup-time" style="width: 100%; font-size: 0.8rem; padding: 4px 6px; border: 1px solid var(--color-border); border-radius: 4px;">
              <option value="Morning (9:00 AM - 12:00 PM)">9:00 AM – 12:00 PM</option>
              <option value="Afternoon (12:00 PM - 3:00 PM)">12:00 PM – 3:00 PM</option>
              <option value="Late Afternoon (3:00 PM - 5:30 PM)">3:00 PM – 5:30 PM</option>
            </select>
          </div>
        </div>
        <input type="text" id="cart-pickup-notes" placeholder="Order notes or instructions (optional)" maxlength="120" style="width: 100%; font-size: 0.75rem; padding: 4px 6px; border: 1px solid var(--color-border); border-radius: 4px;">
      </div>
      <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 10px; display: flex; justify-content: space-between;">
        <span>Sales Tax (Stripe Tax):</span>
        <span style="font-style: italic;">Calculated at Stripe Checkout</span>
      </div>
    `;
    const subtotalRow = footerEl.querySelector('.cart-subtotal-row');
    if (subtotalRow) {
      subtotalRow.after(pickupControls);
    }

    // Set 48h min date
    const dateInput = document.getElementById('cart-pickup-date');
    if (dateInput) {
      const minDate = new Date();
      minDate.setDate(minDate.getDate() + 2);
      const minStr = minDate.toISOString().split('T')[0];
      dateInput.min = minStr;
      dateInput.value = minStr;
    }
  } else if (pickupControls) {
    pickupControls.style.display = 'block';
  }

  const checkoutBtn = document.getElementById('cart-checkout-btn');
  if (checkoutBtn) {
    checkoutBtn.disabled = false;
    checkoutBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 6px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
      Proceed to Review & Pickup
    `;
  }
}

/* ==========================================================================
   10. Official Orders Notice Modal & Lead Time Notice
   ========================================================================== */
function initNoticeModal() {
  const modal = document.getElementById('orders-notice-modal');
  if (!modal) return;

  const closeBtn = modal.querySelector('.modal-close-btn');
  const acceptBtn = document.getElementById('modal-accept-btn');
  const toastBtn = document.getElementById('modal-toast-tab-btn');

  function closeModal() {
    modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  if (closeBtn) closeBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  if (acceptBtn) {
    acceptBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
      window.location.href = '/online/petersbakery';
    });
  }

  if (toastBtn) {
    toastBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeModal();
      window.location.href = '/online/petersbakery';
    });
  }

  // Open modal trigger
  document.querySelectorAll('.open-order-notice-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openNoticeModal();
    });
  });
}

function openNoticeModal() {
  const modal = document.getElementById('orders-notice-modal');
  if (!modal) return;
  modal.classList.add('active');
  document.body.style.overflow = 'hidden';
}

/* ==========================================================================
   11. Toast Notifications
   ========================================================================== */
function showToast(message) {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast-msg';
  toast.innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#BF8243" stroke-width="2.5">
      <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
