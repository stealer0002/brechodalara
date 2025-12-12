const defaultProducts = [
    // --- ÁREA DE CADASTRO DE PRODUTOS (VITRINE OFICIAL) ---
    // Como este é um site estático, adicione suas peças reais aqui.
    // O Painel Admin serve apenas para testes locais no seu computador.
    // Para adicionar imagens, use URLs ou caminhos relativos (ex: './img/foto1.jpg')
    {
        id: 1,
        title: "Corset Fada 🧚‍♀️",
        category: "roupas",
        price: 129.90,
        images: ["https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=500&q=60", "https://images.unsplash.com/photo-1585487000160-6ebcfceb0d03?auto=format&fit=crop&w=500&q=60"],
        sold: false,
        stock: 1
    },
    {
        id: 2,
        title: "Óculos Matrix Y2K",
        category: "acessorios",
        price: 55.00,
        images: ["https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=500&q=60"],
        sold: false,
        stock: 1
    },
    {
        id: 3,
        title: "Coturno Tratorado",
        category: "calcados",
        price: 180.00,
        images: ["https://images.unsplash.com/photo-1608256246200-53e635b5b65f?auto=format&fit=crop&w=500&q=60"],
        sold: false,
        stock: 1
    },
    {
        id: 4,
        title: "Saia Xadrez 90s",
        category: "roupas",
        price: 75.00,
        images: ["https://images.unsplash.com/photo-1576871337632-b9aef4c17ab9?auto=format&fit=crop&w=500&q=60"],
        sold: false,
        stock: 1
    }
];

let products = JSON.parse(localStorage.getItem('pudin_products')) || defaultProducts;

products = products.map(p => {
    if (!p.images && p.image) return { ...p, images: [p.image] };
    // Garante que produtos antigos tenham estoque (1 se disponível, 0 se vendido)
    if (p.stock === undefined) p.stock = p.sold ? 0 : 1;
    return p;
});

let cart = JSON.parse(localStorage.getItem('pudin_cart')) || [];
let isAdmin = sessionStorage.getItem('pudin_is_admin') === 'true';
let currentAdminUser = sessionStorage.getItem('pudin_admin_user') || '';
let productIntervals = {}; // Armazena os timers do carrossel de imagens

// ATENÇÃO: Autenticação Client-Side não é 100% segura. Use apenas para proteção básica da vitrine.
// Hash SHA-256 para a senha "pudin123"
const ADMIN_HASH = '5e884898da28047151d0e56f8dc6292773603d0d6aabbdd62a11ef721d1542d8';

// ATENÇÃO: TROQUE PELOS NÚMEROS REAIS ANTES DE LANÇAR!
// Formato: 55 + DDD + Número (sem espaços ou traços)
const adminPhones = {
    'lara': '5500000000000', 
    'monalisa': '5500000000000'
};

const gridElement = document.getElementById('product-grid');
const filterButtons = document.querySelectorAll('.filter-btn');
const searchInput = document.getElementById('search-input');
const modal = document.getElementById('admin-modal');
const cartModal = document.getElementById('cart-modal');

function init() {
    renderProducts(products);
    setupFilters();
    setupSearch();
    setupBackToTop();
    validateCartStock(); // Verifica a sacola assim que o site carrega
    updateCartCounter();
    
    // Configurar botão de abrir modal
    document.getElementById('open-admin').addEventListener('click', () => {
        modal.style.display = 'flex';
        checkAdminUI();
    });

    // Configurar botão da sacola
    document.getElementById('cart-btn').addEventListener('click', (e) => {
        e.preventDefault();
        openCartModal();
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

        const qtyInCart = cart.filter(i => i.id === product.id).length;
        const btnText = qtyInCart > 0 ? `Eu quero! (${qtyInCart})` : 'Eu quero!';

        // Gera HTML das imagens
        const imagesHtml = product.images.map((img, index) => 
            `<img src="${img}" class="product-image ${index === 0 ? 'active' : ''}" data-index="${index}">`
        ).join('');

        // Botões de navegação (só aparecem se tiver mais de 1 foto)
        const sliderControls = product.images.length > 1 ? `
            <button class="slider-btn prev" onclick="changeImage(${product.id}, -1)">&#10094;</button>
            <button class="slider-btn next" onclick="changeImage(${product.id}, 1)">&#10095;</button>
        ` : '';
        
        card.innerHTML = `
            ${isSold ? '<div class="sold-badge">ESGOTADO</div>' : ''}
            <div class="image-container" id="slider-${product.id}">
                ${imagesHtml}
                ${sliderControls}
            </div>
            <div class="product-info">
                <h3 class="product-title">${escapeHtml(product.title)}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</span>
                    <div>
                        ${isSold 
                            ? `<button class="btn-add" disabled style="background: #ccc; cursor: not-allowed; border: 2px solid #999; color: #666; padding: 5px 15px; border-radius: 20px;">Já foi :(</button>`
                            : `<button class="btn-add" data-id="${product.id}" style="cursor: pointer; background: var(--accent-color); color: white; border: 2px solid var(--text-color); padding: 5px 15px; border-radius: 20px; font-weight: bold; box-shadow: 2px 2px 0px #333;">${btnText}</button>`
                        }
                        ${isAdmin ? `<button onclick="toggleSold(${product.id})" class="btn-toggle-sold" title="Marcar/Desmarcar Vendido">💲</button>` : ''}
                        ${isAdmin ? `<button onclick="deleteProduct(${product.id})" class="btn-delete" title="Excluir">🗑️</button>` : ''}
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
    const id = parseInt(e.target.dataset.id);
    const product = products.find(p => p.id === id);
    
    const qtyInCart = cart.filter(i => i.id === id).length;

    // Verifica se ainda tem estoque disponível
    if(product && product.stock > qtyInCart) {
        cart.push(product);
        saveCart();
        showToast('Adicionado à sacola! 💖', 'success');

        // Atualiza o texto do botão visualmente
        const btn = e.target;
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
        container.innerHTML = '<p style="text-align:center; padding: 20px;">Sua sacola está vazia, bestie! 😢</p>';
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
                    <button class="btn-qty" onclick="changeCartQty(${item.id}, -1)">-</button>
                    <span>${item.qty}</span>
                    <button class="btn-qty" onclick="changeCartQty(${item.id}, 1)">+</button>
                </div>
            </div>
            <button onclick="removeProductFromCart(${item.id})" class="btn-delete" title="Remover todos">🗑️</button>
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
        const item = products.find(p => p.id === id) || cart.find(c => c.id === id);
        const currentQty = cart.filter(c => c.id === id).length;
        
        if(item && currentQty < item.stock) {
            cart.push(item);
        } else {
            showToast('Máximo em estoque atingido! 📦', 'error');
        }
    } else {
        // Remove uma instância do produto
        const index = cart.findIndex(c => c.id === id);
        if(index > -1) cart.splice(index, 1);
    }
    saveCart();
    openCartModal();
    
    // Atualiza o botão na grid se estiver visível
    const btn = document.querySelector(`.btn-add[data-id="${id}"]`);
    if(btn) {
        const qty = cart.filter(c => c.id === id).length;
        btn.innerText = qty > 0 ? `Eu quero! (${qty})` : 'Eu quero!';
    }
}

function removeProductFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
    openCartModal();
    
    // Reseta o botão na grid
    const btn = document.querySelector(`.btn-add[data-id="${id}"]`);
    if(btn) btn.innerText = 'Eu quero!';
}

function validateCartStock() {
    let changed = false;
    const uniqueIds = [...new Set(cart.map(item => item.id))];
    
    uniqueIds.forEach(id => {
        const product = products.find(p => p.id === id);
        const qtyInCart = cart.filter(c => c.id === id).length;
        
        if (!product) {
            // Se o produto foi deletado do sistema, remove da sacola
            cart = cart.filter(c => c.id !== id);
            changed = true;
        } else if (qtyInCart > product.stock) {
            // Se a pessoa tem 3 na sacola, mas agora só tem 1 no estoque
            // Remove tudo e adiciona de volta apenas o que tem disponível
            cart = cart.filter(c => c.id !== id);
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
    if(confirm('Tem certeza que quer limpar toda a sacola? 🥺')) {
        cart = [];
        saveCart();
        openCartModal();
        showToast('Sacola limpinha! ✨', 'success');
    }
}

function checkout() {
    if(cart.length === 0) return;
    
    let message = `Oii! 🍮 Quero fechar meu pedido:\n\n`;
    let total = 0;
    cart.forEach(item => {
        // Busca o produto original para garantir o preço atual (segurança contra manipulação)
        const product = products.find(p => p.id === item.id) || item;
        message += `- ${product.title}: R$ ${product.price.toFixed(2).replace('.', ',')}\n`;
        total += product.price;
    });
    message += `\n*Total: R$ ${total.toFixed(2).replace('.', ',')}*`;
    
    window.open(`https://wa.me/${adminPhones['lara']}?text=${encodeURIComponent(message)}`, '_blank');
}

// --- Funções de Admin ---

function closeModal() {
    modal.style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    const pass = document.getElementById('admin-pass').value.trim(); // Remove espaços extras
    const userSelect = document.getElementById('admin-user');
    
    if (!userSelect.value) {
        showToast('Quem é você? Selecione na lista! 💖', 'error');
        return;
    }
    
    let passHash = '';
    
    // Verifica suporte a criptografia (evita erro em file://)
    if (window.crypto && window.crypto.subtle) {
        try {
            passHash = await sha256(pass);
        } catch (e) {
            console.log('Erro de criptografia (Modo local ou sem HTTPS):', e);
        }
    }
    
    // Fallback de Segurança:
    // Se a criptografia falhar (comum em conexões HTTP ou local), verificamos a senha manualmente.
    // Isso resolve o problema de login no Netlify se o SSL ainda não estiver ativo ou falhar.
    if (passHash === '' && pass === 'pudin123') {
        passHash = ADMIN_HASH;
    }

    // Aceita apenas se o hash bater (Senha: pudin123)
    if(passHash === ADMIN_HASH) { 
        isAdmin = true;
        currentAdminUser = userSelect.value;
        
        sessionStorage.setItem('pudin_is_admin', 'true');
        sessionStorage.setItem('pudin_admin_user', currentAdminUser);

        checkAdminUI();
        renderProducts(products);
        showToast('Bem-vinda, chefa! 👑', 'success');
    } else {
        console.log('Debug Login - Senha:', pass, 'Hash:', passHash);
        showToast('Senha errada, bestie! 🚫', 'error');
    }
}

function logout() {
    isAdmin = false;
    currentAdminUser = '';
    sessionStorage.removeItem('pudin_is_admin');
    sessionStorage.removeItem('pudin_admin_user');
    
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('admin-panel').style.display = 'none';
    document.getElementById('admin-pass').value = ''; // Limpa a senha
    
    renderProducts(products);
    showToast('Saiu da conta! 👋', 'success');
}

async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function checkAdminUI() {
    if(isAdmin) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
    }
}

function addNewProductField() {
    const container = document.getElementById('products-container');
    const div = document.createElement('div');
    div.className = 'product-entry';
    div.style.cssText = 'background: #f9f9f9; padding: 15px; border-radius: 8px; margin-bottom: 15px; border: 1px dashed #ccc; position: relative;';
    
    div.innerHTML = `
        <span onclick="this.parentElement.remove()" style="position:absolute; top:5px; right:10px; cursor:pointer; color:red; font-weight:bold; font-size: 1.2rem;">&times;</span>
        <input type="text" name="title" placeholder="Nome da peça" required style="width: 100%; padding: 10px; margin-bottom: 10px; border: 1px solid #ddd; border-radius: 5px;">
        <div style="display: flex; gap: 10px; margin-bottom: 10px;">
            <select name="category" style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
                <option value="roupas">Roupas</option>
                <option value="acessorios">Acessórios</option>
                <option value="calcados">Calçados</option>
            </select>
            <input type="number" name="price" placeholder="Preço" step="0.01" required style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
            <input type="number" name="stock" placeholder="Qtd" min="1" value="1" required style="width: 80px; padding: 10px; border: 1px solid #ddd; border-radius: 5px;">
        </div>
        <label style="display:block; text-align:left; font-size:0.9rem; margin-bottom:5px;">Fotos:</label>
        <input type="file" name="images" accept="image/*" multiple required style="width: 100%;">
    `;
    
    container.appendChild(div);
}

async function handleBulkAddProduct(e) {
    e.preventDefault();
    
    const entries = document.querySelectorAll('.product-entry');
    const newProducts = [];
    
    for (const entry of entries) {
        const title = entry.querySelector('input[name="title"]').value;
        const category = entry.querySelector('select[name="category"]').value;
        const priceInput = entry.querySelector('input[name="price"]');
        const stockInput = entry.querySelector('input[name="stock"]');
        const fileInput = entry.querySelector('input[name="images"]');
        
        if (title && priceInput.value && fileInput.files.length > 0 && stockInput.value) {
            const imagesBase64 = await readFiles(fileInput.files);
            
            newProducts.push({
                id: Date.now() + Math.floor(Math.random() * 1000), // ID único
                title: title,
                category: category,
                price: parseFloat(priceInput.value.replace(',', '.')),
                stock: parseInt(stockInput.value),
                images: imagesBase64,
                sold: false,
                owner: currentAdminUser
            });
        }
    }

    if (newProducts.length > 0) {
        products.unshift(...newProducts);
        saveToStorage();
        renderProducts(products);
        notifyBulkProducts(newProducts);
        
        // Resetar formulário
        const container = document.getElementById('products-container');
        container.innerHTML = ''; 
        addNewProductField(); // Adiciona um campo limpo
        
        showToast(`${newProducts.length} peças adicionadas! ✨`, 'success');
    }
}

function readFiles(files) {
    return Promise.all(Array.from(files).map(file => {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.readAsDataURL(file);
        });
    }));
}

function notifyBulkProducts(newProducts) {
    const phone = adminPhones[currentAdminUser];
    
    if (phone) {
        let message = `✨ *Novos Garimpos Adicionados!* ✨\n\n`;
        
        newProducts.forEach(p => {
            message += `👗 *${p.title}*\n` +
                       `💰 R$ ${p.price.toFixed(2).replace('.', ',')} | 📂 ${p.category}\n` +
                       `------------------------------\n`;
        });
        
        window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
    }
}

function toggleSold(id) {
    const product = products.find(p => p.id === id);
    if(product) {
        // Se tiver estoque, zera (marca como vendido). Se for 0, volta pra 1 (disponível).
        if (product.stock > 0) {
            product.stock = 0;
        } else {
            product.stock = 1;
        }
        product.sold = (product.stock === 0); // Mantém compatibilidade
        saveToStorage();
        renderProducts(products);
    }
}

function deleteProduct(id) {
    if(confirm('Tem certeza que quer deletar esse mimo?')) {
        products = products.filter(p => p.id !== id);
        saveToStorage();
        renderProducts(products);
    }
}

function saveToStorage() {
    try {
        localStorage.setItem('pudin_products', JSON.stringify(products));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            showToast('Erro: Armazenamento cheio! Use imagens menores ou URLs.', 'error');
        }
        console.error('Erro ao salvar:', e);
    }
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
        const product = products.find(p => p.id === item.id) || item;
        message += `- ${product.title}: R$ ${product.price.toFixed(2).replace('.', ',')}\n`;
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
    showToast('Oba! Compra finalizada! 🎉', 'success');
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
