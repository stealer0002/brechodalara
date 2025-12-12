// Configuração do Contentful
// Substitua as chaves abaixo pelas suas chaves reais do Contentful (Settings > API Keys)
const SPACE_ID = 'SEU_SPACE_ID_AQUI';
const ACCESS_TOKEN = 'SEU_ACCESS_TOKEN_AQUI';

const client = contentful.createClient({
    space: SPACE_ID,
    accessToken: ACCESS_TOKEN
});

const productGrid = document.getElementById('product-grid');

// Função para buscar produtos do Contentful
function fetchContentfulProducts() {
    // Feedback de carregamento
    productGrid.innerHTML = '<p style="text-align:center; width:100%; margin-top:20px;">Carregando mimos do Contentful... 🍮</p>';

    client.getEntries({
        content_type: 'product', // Certifique-se que o ID do Content Model é 'product'
        order: '-sys.createdAt'  // Mostra os mais recentes primeiro
    })
    .then((response) => {
        // Converte os dados do Contentful para o formato que o script.js entende
        const contentfulProducts = response.items.map(item => {
            const fields = item.fields;
            return {
                id: item.sys.id, // ID único do Contentful (ex: "4a2B...")
                title: fields.title,
                category: fields.category || 'outros',
                price: fields.price || 0,
                // Pega todas as imagens se existirem, senão array vazio
                images: fields.images ? fields.images.map(img => img.fields.file.url) : [],
                stock: typeof fields.stock === 'number' ? fields.stock : 1,
                sold: fields.stock === 0
            };
        });

        // Atualiza a lista global de produtos do script.js
        window.products = contentfulProducts;

        // Chama a função original do script.js para desenhar na tela
        // Isso garante que os filtros, busca e botão de carrinho funcionem!
        if (typeof renderProducts === 'function') {
            renderProducts(window.products);
        }
    })
    .catch((error) => {
        console.error("Erro ao buscar do Contentful:", error);
        productGrid.innerHTML = '<p style="text-align:center; width:100%;">Ops! Não consegui carregar os produtos. :(</p>';
    });
}

// Inicia a busca assim que a página carregar
document.addEventListener('DOMContentLoaded', fetchContentfulProducts);