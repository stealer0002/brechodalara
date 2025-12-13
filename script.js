const defaultProducts = [
    // Deixe vazio para não aparecer nada antes do Contentful carregar
];

// --- CONFIGURAÇÃO DE AUTOMAÇÃO (OPCIONAL) ---
// Se você quiser usar uma Planilha do Google ou API externa no futuro,
// coloque o link do JSON aqui. Enquanto estiver vazio (""), usa a lista acima.
const EXTERNAL_DATA_URL = ""; 

// --- CONTROLE DE VERSÃO ---
// IMPORTANTE: Mude esse número (+1) sempre que você editar a lista acima (defaultProducts).
// Isso avisa o navegador das clientes que tem novidade e força a atualização!
const DATA_VERSION = 1; 

window.products = []; // Define como global para o Contentful acessar

let cart = JSON.parse(localStorage.getItem('pudin_cart')) || [];
let productIntervals = {}; // Armazena os timers do carrossel de imagens

// ATENÇÃO: TROQUE PELOS NÚMEROS REAIS ANTES DE LANÇAR!
// Formato: 55 + DDD + Número (sem espaços ou traços)
const adminPhones = {
    'lara': '5511993336808', 
    'monalisa': '5511974871916'
};

// Variações de apelidos carinhosos para não ficar repetitivo
const affectionateTerms = ['pudin', 'docinho', 'lindeza', 'chuchu', 'flor', 'amiga'];
function getRandomTerm() {
    return affectionateTerms[Math.floor(Math.random() * affectionateTerms.length)];
}

const gridElement = document.getElementById('product-grid');
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const cartModal = document.getElementById('cart-modal');

async function init() {
    await loadProductsData(); // Carrega os produtos (local ou externo)
    renderProducts(products);
    setupFilters();
    setupSearch();
    setupBackToTop();
    validateCartStock(); // Verifica a sacola assim que o site carrega
    updateCartCounter();

    // Configurar botão da sacola
    document.getElementById('cart-btn').addEventListener('click', (e) => {
        e.preventDefault();
        openCartModal();
    });
}

// Função inteligente para carregar produtos
async function loadProductsData() {
    // Agora usamos apenas o Contentful!
    // Deixamos a lista vazia inicialmente para o contentful-logic.js preencher.
    products = [];

    // 5. Normaliza os dados (garante imagens e estoque)
    products = products.map(p => {
        if (!p.images && p.image) return { ...p, images: [p.image] };
        if (p.stock === undefined) p.stock = p.sold ? 0 : 1;
        return p;
    });
}

// Função para prevenir XSS (injeção de código malicioso via texto)
function escapeHtml(text) {
    if (!text) return text;
    return text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function renderProducts(list) {
    // Limpa intervalos antigos para evitar memory leaks ao re-renderizar
    Object.values(productIntervals).forEach(clearInterval);
    productIntervals = {};

    gridElement.innerHTML = '';

    if (list.length === 0) {
        gridElement.innerHTML = '<div style="width:100%; text-align:center; padding:2rem; font-size:1.5rem; font-family:var(--font-heading);">Nenhum garimpo encontrado nessa categoria :(</div>';
        return;
    }
    
    list.forEach(product => {
        const card = document.createElement('article');
        const isSold = product.stock === 0 ? 'sold' : '';
        card.className = `product-card ${isSold}`;

        const qtyInCart = cart.filter(i => i.id == product.id).length;
        const btnText = qtyInCart > 0 ? `Eu quero! (${qtyInCart})` : 'Eu quero!';

        // Define o nome bonitinho para exibir
        const ownerDisplay = product.owner === 'monalisa' ? 'Monalisa 🎨' : 'Lara 🧚‍♀️';

        // Gera HTML das imagens
        const imagesHtml = product.images.map((img, index) => 
            `<img src="${img}" class="product-image ${index === 0 ? 'active' : ''}" data-index="${index}">`
        ).join('');

        // Botões de navegação (só aparecem se tiver mais de 1 foto)
        const sliderControls = product.images.length > 1 ? `
            <button class="slider-btn prev" onclick="changeImage('${product.id}', -1)">&#10094;</button>
            <button class="slider-btn next" onclick="changeImage('${product.id}', 1)">&#10095;</button>
        ` : '';
        
        card.innerHTML = `
            ${isSold ? '<div class="sold-badge">ESGOTADO</div>' : ''}
            <div class="owner-tag" style="position: absolute; top: 10px; left: 10px; background: rgba(255,255,255,0.9); padding: 4px 10px; border-radius: 15px; font-size: 0.75rem; font-weight: bold; z-index: 2; box-shadow: 0 2px 5px rgba(0,0,0,0.1); color: #333;">${ownerDisplay}</div>
            <div class="image-container" id="slider-${product.id}">
                ${imagesHtml}
                ${sliderControls}
            </div>
            <div class="product-info">
                <h3 class="product-title">${escapeHtml(product.title)}</h3>
                
                <div class="product-meta">
                    <span class="product-size">📏 Tam: <strong>${escapeHtml(product.size || 'Único')}</strong></span>
                    ${product.defects ? `<span class="product-defect">⚠️ ${escapeHtml(product.defects)}</span>` : ''}
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                    <span class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
                    <div>
                        ${isSold 
                            ? `<button class="btn-add" disabled style="background: #ccc; cursor: not-allowed; border: 2px solid #999; color: #666; padding: 5px 15px; border-radius: 20px;">Já foi :(</button>`
                            : `<button class="btn-add" data-id="${product.id}" style="cursor: pointer; background: var(--accent-color); color: white; border: 2px solid var(--text-color); padding: 5px 15px; border-radius: 20px; font-weight: bold; box-shadow: 2px 2px 0px #333;">${btnText}</button>`
                        }
                    </div>
                </div>
            </div>
        `;
        gridElement.appendChild(card);
    });

    // Após adicionar os cards ao DOM, inicializa os carrosséis
    list.forEach(product => {
        if (product.images.length > 1) {
            const imageContainer = document.getElementById(`slider-${product.id}`);
            
            const startInterval = () => {
                if (productIntervals[product.id]) clearInterval(productIntervals[product.id]);
                productIntervals[product.id] = setInterval(() => {
                    changeImage(product.id, 1);
                }, 3000); // Muda a imagem a cada 3 segundos
            };

            const stopInterval = () => {
                clearInterval(productIntervals[product.id]);
            };

            imageContainer.addEventListener('mouseenter', stopInterval);
            imageContainer.addEventListener('mouseleave', startInterval);

            startInterval(); // Inicia o carrossel
        }
    });

    // Re-adicionar eventos aos botões de compra recém-criados
    document.querySelectorAll('.btn-add').forEach(btn => {
        btn.addEventListener('click', addToCart);
    });
}

function changeImage(productId, direction) {
    const container = document.getElementById(`slider-${productId}`);
    const images = container.querySelectorAll('.product-image');
    let activeIndex = 0;

    images.forEach((img, index) => {
        if (img.classList.contains('active')) {
            activeIndex = index;
            img.classList.remove('active');
        }
    });

    let newIndex = activeIndex + direction;
    if (newIndex < 0) newIndex = images.length - 1;
    if (newIndex >= images.length) newIndex = 0;

    images[newIndex].classList.add('active');
}

function setupSearch() {
    searchInput.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        
        // Se tiver texto, filtra tudo. Se não, volta ao estado atual (ou tudo)
        if(term.length > 0) {
            // Remove active dos botões de categoria visualmente
            filterButtons.forEach(b => b.classList.remove('active'));
            
            const filtered = products.filter(p => p.title.toLowerCase().includes(term));
            renderProducts(filtered);
        } else {
            // Se limpar, reseta para "Tudinho"
            document.querySelector('[data-category="all"]').click();
        }
    });
}

function setupFilters() {
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active de todos
            filterButtons.forEach(b => b.classList.remove('active'));
            // Adiciona active ao clicado
            btn.classList.add('active');
            
            // Limpa a busca ao clicar em categoria
            searchInput.value = '';
            
            const category = btn.dataset.category;
            const filtered = category === 'all' ? products : products.filter(p => p.category === category);
            renderProducts(filtered);
        });
    });
}

function addToCart(e) {
    // Use currentTarget para garantir que pegamos o botão com o data-id
    const btn = e.currentTarget;
    const id = btn.dataset.id; 
    
    // Converte para String para garantir que ache, seja numero ou texto
    const product = products.find(p => String(p.id) === String(id));
    
    const qtyInCart = cart.filter(i => String(i.id) === String(id)).length;
    const stock = product ? parseInt(product.stock) : 0;

    // Verifica se ainda tem estoque disponível
    if(product && stock > qtyInCart) {
        cart.push(product);
        saveCart();
        showToast(`Adicionado à sacola, ${getRandomTerm()}! 💖`, 'success');

        // Atualiza o texto do botão visualmente
        const newQty = qtyInCart + 1;
        btn.innerText = `Eu quero! (${newQty})`;
    } else {
        showToast('Ops! Estoque esgotado para essa peça! 😬', 'error');
    }
}

function updateCartCounter() {
    document.getElementById('cart-btn').innerText = `Sacola (${cart.length}) 🛍️`;
}

function saveCart() {
    localStorage.setItem('pudin_cart', JSON.stringify(cart));
    updateCartCounter();
}

function openCartModal() {
    // Verifica novamente antes de mostrar a lista
    if (validateCartStock()) {
        showToast('Sua sacola foi atualizada conforme o estoque! ⚠️', 'normal');
    }

    const container = document.getElementById('cart-items');
    const footer = document.querySelector('.cart-footer');
    
    cartModal.style.display = 'flex';
    container.innerHTML = '';
    
    if(cart.length === 0) {
        container.innerHTML = `<p style="text-align:center; padding: 20px;">Sua sacola está vazia, ${getRandomTerm()}! 😢</p>`;
        footer.innerHTML = '<div class="cart-total">Total: <span>R$ 0,00</span></div>';
        return;
    }

    let total = 0;
    const groupedCart = {};

    // Agrupa itens por ID
    cart.forEach(item => {
        total += item.price;
        if (!groupedCart[item.id]) {
            groupedCart[item.id] = { ...item, qty: 0 };
        }
        groupedCart[item.id].qty++;
    });

    Object.values(groupedCart).forEach(item => {
        const itemEl = document.createElement('div');
        itemEl.className = 'cart-item';
        itemEl.innerHTML = `
            <img src="${item.images[0]}" alt="${item.title}">
            <div class="cart-item-info">
                <div class="cart-item-title">${escapeHtml(item.title)}</div>
                <div class="cart-item-price">R$ ${item.price.toFixed(2).replace('.', ',')} (cada)</div>
                <div class="cart-qty-controls">
                    <button class="btn-qty" onclick="changeCartQty('${item.id}', -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="btn-qty" onclick="changeCartQty('${item.id}', 1)">+</button>
                </div>
            </div>
            <button onclick="removeProductFromCart('${item.id}')" class="btn-delete" title="Remover todos">🗑️</button>
        `;
        container.appendChild(itemEl);
    });
    
    // Reconstrói o rodapé (sem calculadora de frete)
    let footerHtml = `
        <div class="cart-total">
            <div style="font-size: 1.3rem; font-weight:bold;">Total: R$ ${total.toFixed(2).replace('.', ',')}</div>
            <div style="font-size: 0.8rem; color: #666;">*Frete a combinar no WhatsApp</div>
        </div>`;
    
    // Identifica donas únicas para os botões de checkout
    const itemsByOwner = [...new Set(cart.map(item => item.owner || 'lara'))];
    itemsByOwner.forEach(owner => {
        const ownerName = owner.charAt(0).toUpperCase() + owner.slice(1);
        // Cria um botão para cada dona encontrada na sacola
        footerHtml += `<button onclick="checkoutOwner('${owner}')" class="btn-cta" style="width:100%; margin-top:10px;">Finalizar com ${ownerName} 📱</button>`;
    });
    
    footerHtml += `<button type="button" onclick="clearCart()" class="btn-cta" style="width:100%; margin-top:10px; background: #ff6b6b; border-color: #ee5253;">Esvaziar Sacola 🗑️</button>`;

    footer.innerHTML = footerHtml;
}

function closeCartModal() {
    cartModal.style.display = 'none';
}

function changeCartQty(id, delta) {
    if (delta > 0) {
        // Adiciona mais um do mesmo produto
        const item = products.find(p => p.id == id) || cart.find(c => c.id == id);
        const currentQty = cart.filter(c => c.id == id).length;
        
        if(item && currentQty < item.stock) {
            cart.push(item);
        } else {
            showToast('Máximo em estoque atingido! 📦', 'error');
        }
    } else {
        // Remove uma instância do produto
        const index = cart.findIndex(c => c.id == id);
        if(index > -1) cart.splice(index, 1);
    }
    saveCart();
    openCartModal();
    
    // Atualiza o botão na grid se estiver visível
    const btn = document.querySelector(`.btn-add[data-id="${id}"]`);
    if(btn) {
        const qty = cart.filter(c => c.id == id).length;
        btn.innerText = qty > 0 ? `Eu quero! (${qty})` : 'Eu quero!';
    }
}

function removeProductFromCart(id) {
    cart = cart.filter(item => item.id != id);
    saveCart();
    openCartModal();
    
    // Reseta o botão na grid
    const btn = document.querySelector(`.btn-add[data-id="${id}"]`);
    if(btn) btn.innerText = 'Eu quero!';
}

function validateCartStock() {
    // Se os produtos ainda não carregaram, não faz nada (evita limpar a sacola sem querer)
    if (!products || products.length === 0) return;

    let changed = false;
    const uniqueIds = [...new Set(cart.map(item => item.id))];
    
    uniqueIds.forEach(id => {
        const product = products.find(p => p.id == id);
        const qtyInCart = cart.filter(c => c.id == id).length;
        
        if (!product) {
            // Se o produto foi deletado do sistema, remove da sacola
            cart = cart.filter(c => c.id != id);
            changed = true;
        } else if (qtyInCart > product.stock) {
            // Se a pessoa tem 3 na sacola, mas agora só tem 1 no estoque
            // Remove tudo e adiciona de volta apenas o que tem disponível
            cart = cart.filter(c => c.id != id);
            for(let i = 0; i < product.stock; i++) {
                cart.push(product);
            }
            changed = true;
        }
    });
    
    if(changed) saveCart();
    return changed;
}

function clearCart() {
    cart = [];
    saveCart();
    openCartModal();
    showToast(`Sacola limpinha, ${getRandomTerm()}! ✨`, 'success');
}

function checkout() {
    if(cart.length === 0) return;
    
    let message = `Oii! 🍮 Quero fechar meu pedido:\n\n`;
    let total = 0;
    cart.forEach(item => {
        // Busca o produto original para garantir o preço atual (segurança contra manipulação)
        const product = products.find(p => p.id == item.id) || item;
        message += `- ${product.title} (Tam: ${product.size || 'Único'}): R$ ${product.price.toFixed(2).replace('.', ',')}\n`;
        total += product.price;
    });
    message += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    
    window.open(`https://wa.me/${adminPhones['lara']}?text=${encodeURIComponent(message)}`, '_blank');
}

function showToast(message, type = 'normal') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerText = message;
    
    container.appendChild(toast);
    
    // Remove após 3 segundos
    setTimeout(() => {
        toast.style.animation = 'fadeOut 0.5s ease-out forwards';
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

function checkoutOwner(owner) {
    // Filtra apenas os itens da dona específica
    const ownerItems = cart.filter(item => (item.owner || 'lara') === owner);
    
    if(ownerItems.length === 0) return;

    const ownerName = owner.charAt(0).toUpperCase() + owner.slice(1);
    let message = `Oii ${ownerName}! 🍮 Quero fechar meu pedido com suas peças:\n\n`;
    let subtotal = 0;
    
    ownerItems.forEach(item => {
        // Busca o produto original para garantir o preço
        const product = products.find(p => p.id == item.id) || item;
        message += `- ${product.title} (Tam: ${product.size || 'Único'}): R$ ${product.price.toFixed(2).replace('.', ',')}\n`;
        subtotal += product.price;
    });
    
    message += `\n*Total com você: R$ ${subtotal.toFixed(2).replace('.', ',')}*`;
    
    message += `\n(Frete a combinar)`;
    
    // Verifica se há peças de mais de uma dona na sacola
    const uniqueOwners = new Set(cart.map(item => item.owner || 'lara'));
    if (uniqueOwners.size > 1) {
        message += `\n\n⚠️ *Aviso: Estou levando peças das duas! (Pedido em Conjunto)*`;
    }
    
    message += "\n\nComo faço para pagar?";
    
    const phone = adminPhones[owner] || adminPhones['lara'];
    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
    
    // Abre o modal perguntando se deu tudo certo
    document.getElementById('checkout-modal').style.display = 'flex';
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').style.display = 'none';
}

function finishCheckout() {
    // Limpa a sacola sem perguntar (pois a pessoa confirmou que comprou)
    cart = [];
    saveCart();
    closeCheckoutModal();
    closeCartModal();
    showToast(`Oba! Compra finalizada, ${getRandomTerm()}! 🎉`, 'success');
}

function setupBackToTop() {
    const btn = document.getElementById('back-to-top');
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            btn.style.display = 'block';
        } else {
            btn.style.display = 'none';
        }
    });

    btn.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// Iniciar aplicação
init();