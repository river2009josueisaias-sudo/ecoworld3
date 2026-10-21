(() => {
  const config = window.ECOWORLD_CONFIG;
  const cart = JSON.parse(localStorage.getItem('ecoworld_cart')) || [];
  let lastOrder = null;
  const money = new Intl.NumberFormat(config.locale, {
    style: 'currency',
    currency: config.currency
  });
  const $ = (selector, context = document) => context.querySelector(selector);
  const $$ = (selector, context = document) => [...context.querySelectorAll(selector)];
  const productById = id => config.products.find(product => product.id === id);
  const total = () => cart.reduce((sum, line) => sum + productById(line.id).price * line.quantity, 0);
  const shipping = () => cart.length ? config.shipping : 0;
  const grandTotal = () => total() + shipping();
  const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));

  function saveCart() {
    localStorage.setItem('ecoworld_cart', JSON.stringify(cart));
  }

  function applyImages() {
    Object.entries(config.images).forEach(([key, path]) => {
      $$(`[data-image="${key}"]`).forEach(image => {
        const placeholder = image.parentElement.querySelector(`[data-placeholder="${key}"]`);
        if (!path) return;
        image.src = path;
        image.hidden = false;
        if (placeholder) placeholder.hidden = true;
        image.onerror = () => {
          image.hidden = true;
          if (placeholder) placeholder.hidden = false;
        };
      });
    });
    $$('[data-logo-placeholder]').forEach(placeholder => {
      placeholder.hidden = Boolean(config.images.logo);
    });
    $$('[data-contact-email]').forEach(link => {
      link.textContent = config.contact.email;
      link.href = `mailto:${config.contact.email}`;
    });
    $$('[data-floating]').forEach(group => {
      const path = config.images[group.dataset.floating];
      if (!path) return;
      group.innerHTML = [...Array(4)].map((_, index) => `<img src="${path}" alt="" class="floating-image float-${index + 1}" />`).join('');
    });
  }

  function productCard(product) {
    return `<article class="product-option"><div><div class="option-name">${product.pieces} pajillas</div><div class="option-detail">${escapeHtml(product.description)}</div></div><strong class="option-price">${money.format(product.price)}</strong><button class="add-product" data-product-id="${product.id}" type="button">+ AGREGAR</button></article>`;
  }

  $('#original-products').innerHTML = config.products.filter(product => product.flavor === 'original').map(productCard).join('');
  $('#chocolate-products').innerHTML = config.products.filter(product => product.flavor === 'chocolate').map(productCard).join('');
  $('#company-details').innerHTML = config.company.map(([title, text], index) => `<article class="company-detail reveal"><span>${String(index + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(title)}</h3><p>${escapeHtml(text)}</p></div></article>`).join('');
  $('#reviews-list').innerHTML = config.reviews.map(review => `<article class="review reveal"><span class="quote-mark">"</span><blockquote>${escapeHtml(review.quote)}</blockquote><footer><strong>${escapeHtml(review.author)}</strong><small>${escapeHtml(review.role)}</small></footer></article>`).join('');
  $('#year').textContent = new Date().getFullYear();
  applyImages();

  function openCart() {
    $('.cart-panel').classList.add('open');
    $('.cart-panel').setAttribute('aria-hidden', 'false');
    $('.overlay').classList.add('show');
  }

  function closeCart() {
    $('.cart-panel').classList.remove('open');
    $('.cart-panel').setAttribute('aria-hidden', 'true');
    $('.overlay').classList.remove('show');
  }

  function add(id) {
    const line = cart.find(item => item.id === id);
    line ? line.quantity += 1 : cart.push({
      id,
      quantity: 1
    });
    saveCart();
    renderCart();
    openCart();
  }

  function change(id, amount) {
    const line = cart.find(item => item.id === id);
    if (!line) return;
    line.quantity += amount;
    if (line.quantity < 1) cart.splice(cart.indexOf(line), 1);
    saveCart();
    renderCart();
  }

  function renderCart() {
    $('.cart-count').textContent = cart.reduce((count, line) => count + line.quantity, 0);
    $('.cart-items').innerHTML = cart.map(line => {
      const product = productById(line.id);
      return `<article class="cart-item"><div class="mini-pack ${product.flavor}">${product.flavor === 'chocolate' ? 'CHOCO' : 'ECO'}</div><div><h3>${escapeHtml(product.name)}</h3><p>${money.format(product.price)}</p><div class="quantity"><button data-change="-1" data-id="${product.id}" type="button">−</button><b>${line.quantity}</b><button data-change="1" data-id="${product.id}" type="button">+</button></div></div><div><strong>${money.format(product.price * line.quantity)}</strong><button class="remove-item" data-remove="${product.id}" type="button">Quitar</button></div></article>`;
    }).join('');
    $('.cart-empty').hidden = cart.length > 0;
    $('.cart-summary').hidden = !cart.length;
    $('.cart-total').textContent = money.format(total());
    $('.shipping-total').textContent = money.format(shipping());
    $('.order-total-value').textContent = money.format(grandTotal());
  }

  function renderCheckout() {
    $('.checkout-order').innerHTML = `${cart.map(line => {
      const product = productById(line.id);
      return `<div class="checkout-line"><span>${line.quantity} × ${escapeHtml(product.name)}</span><b>${money.format(product.price * line.quantity)}</b></div>`;
    }).join('')}<div class="checkout-line"><span>Envío</span><b>${money.format(shipping())}</b></div><div class="checkout-line checkout-total"><span>Total</span><b>${money.format(grandTotal())}</b></div>`;
  }

  document.addEventListener('click', event => {
    const addButton = event.target.closest('[data-product-id]');
    const quantityButton = event.target.closest('[data-change]');
    const removeButton = event.target.closest('[data-remove]');
    if (addButton) add(addButton.dataset.productId);
    if (quantityButton) change(quantityButton.dataset.id, Number(quantityButton.dataset.change));
    if (removeButton) {
      cart.splice(cart.findIndex(line => line.id === removeButton.dataset.remove), 1);
      saveCart();
      renderCart();
    }
  });

  $('.cart-trigger').addEventListener('click', openCart);
  $$('.close-cart').forEach(button => button.addEventListener('click', closeCart));
  $('.overlay').addEventListener('click', closeCart);
  $('.checkout-button').addEventListener('click', () => {
    if (!cart.length) return;
    closeCart();
    renderCheckout();
    $('.checkout-dialog').showModal();
  });
  $$('.close-checkout').forEach(button => button.addEventListener('click', () => $('.checkout-dialog').close()));
  $('.checkout-dialog').addEventListener('click', event => {
    if (event.target === $('.checkout-dialog')) $('.checkout-dialog').close();
  });

  $('input[name="cardNumber"]', $('.checkout-dialog')).addEventListener('input', event => {
    event.target.value = event.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim().slice(0, 19);
  });
  $('input[name="expiry"]', $('.checkout-dialog')).addEventListener('input', event => {
    const digits = event.target.value.replace(/\D/g, '').slice(0, 4);
    event.target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  });

  $('#checkout-form').addEventListener('submit', event => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    lastOrder = {
      ...data,
      lines: cart.map(line => ({
        ...line,
        product: productById(line.id)
      })),
      subtotal: total(),
      shipping: shipping(),
      total: grandTotal(),
      number: `EW-${Date.now().toString().slice(-6)}`,
      date: new Intl.DateTimeFormat('es-SV', {
        dateStyle: 'long'
      }).format(new Date())
    };
    $('.checkout-content').hidden = true;
    $('.confirmation').hidden = false;
    $('.confirmation-text').textContent = `${data.customerName}, tu pedido fue confirmado. Preparamos tu factura para que puedas guardarla.`;
    cart.length = 0;
    saveCart();
    renderCart();
  });
  $('.checkout-dialog').addEventListener('close', () => {
    $('.checkout-content').hidden = false;
    $('.confirmation').hidden = true;
    $('#checkout-form').reset();
  });

  function renderInvoice() {
    if (!lastOrder) return;
    $('.invoice-number').textContent = `Pedido ${lastOrder.number}`;
    $('.invoice-date').textContent = lastOrder.date;
    $('.invoice-customer').textContent = lastOrder.customerName;
    $('.invoice-email').textContent = lastOrder.customerEmail;
    $('.invoice-phone').textContent = lastOrder.phone;
    $('.invoice-address').textContent = `${lastOrder.address}, ${lastOrder.city}, ${lastOrder.region}, ${lastOrder.country}. CP: ${lastOrder.postalCode}${lastOrder.reference ? ` · Ref.: ${lastOrder.reference}` : ''}`;
    $('.invoice-lines').innerHTML = `${lastOrder.lines.map(line => `<div><span>${line.quantity} × ${escapeHtml(line.product.name)}</span><b>${money.format(line.product.price * line.quantity)}</b></div>`).join('')}<div><span>Envío</span><b>${money.format(lastOrder.shipping)}</b></div>`;
    $('.invoice-total').innerHTML = `<span>Total</span><strong>${money.format(lastOrder.total)}</strong>`;
  }
  $('.show-invoice').addEventListener('click', () => {
    renderInvoice();
    $('.invoice-dialog').showModal();
  });
  $('.close-invoice').addEventListener('click', () => $('.invoice-dialog').close());
  $('.print-invoice').addEventListener('click', () => window.print());

  $('#contact-form').addEventListener('submit', async event => {
    event.preventDefault();
    const message = $('.form-message');
    message.textContent = 'Enviando mensaje…';
    try {
      const response = await fetch(config.contact.formEndpoint, {
        method: 'POST',
        headers: {
          Accept: 'application/json'
        },
        body: new FormData(event.currentTarget)
      });
      if (!response.ok) throw new Error('No se pudo enviar');
      message.textContent = '¡Gracias! Tu mensaje fue enviado correctamente.';
      event.currentTarget.reset();
    } catch {
      message.textContent = 'No se pudo enviar desde esta vista previa. Intenta cuando la página esté publicada o escríbenos al correo mostrado.';
    }
  });

  const menu = $('.menu-toggle');
  menu.addEventListener('click', () => {
    const open = menu.classList.toggle('active');
    menu.setAttribute('aria-expanded', String(open));
    $('#primary-nav').classList.toggle('open', open);
  });
  $$('#primary-nav a').forEach(link => link.addEventListener('click', () => {
    menu.classList.remove('active');
    menu.setAttribute('aria-expanded', 'false');
    $('#primary-nav').classList.remove('open');
  }));
  const observer = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  }), {
    threshold: .12
  });
  $$('.reveal').forEach(element => observer.observe(element));
  renderCart();
})();
