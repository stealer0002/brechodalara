// Configuração do Contentful
// Substitua as chaves abaixo pelas suas chaves reais do Contentful (Settings > API Keys)
const SPACE_ID = 'zgsmx87w9rcy';      // Ex: 'k8s7...'
const ACCESS_TOKEN = 'Zh_LZ-wsXPs9Mhkiiwm9q5ARJB44dSB-IIhyWm0UstE';    // Ex: 'cfp-...'

const client = contentful.createClient({
    space: SPACE_ID,
    accessToken: ACCESS_TOKEN
});

const productGrid = document.getElementById('product-grid');

// Função para buscar produtos do Contentful
function fetchContentfulProducts() {
    // O loader agora é global (tela cheia) e está no HTML

    client.getEntries({
        content_type: 'pudinclotches', // ID corrigido conforme o Contentful
        order: '-sys.createdAt'  // Mostra os mais recentes primeiro
    })
    .then((response) => {
        console.log("Contentful respondeu:", response); // Para depuração
        if (response.items.length === 0) {
            console.warn("Conectou, mas não veio nenhum produto. Verifique se estão como 'Published' e se o Content Model ID é 'product'.");
        }

        // Converte os dados do Contentful para o formato que o script.js entende
        const contentfulProducts = response.items.map(item => {
            const fields = item.fields;
            return {
                id: item.sys.id, // ID único do Contentful (ex: "4a2B...")
                createdAt: item.sys.createdAt, // Data de criação para saber se é novidade
                title: fields.title,
                // Força a categoria para minúsculo para garantir que os filtros funcionem
                category: fields.category ? fields.category.toLowerCase() : 'outros',
                price: fields.price || 0,
                // Pega todas as imagens se existirem, senão array vazio
                // LÓGICA DE CARROSSEL: Tenta pegar várias ('images') ou uma só ('image')
                images: (function() {
                    if (fields.images && fields.images.length > 0) {
                        return fields.images.map(img => img.fields.file.url + '?w=800&q=85');
                    } else if (fields.image) {
                        return [fields.image.fields.file.url + '?w=800&q=85'];
                    }
                    return [];
                })(),
                stock: typeof fields.stock === 'number' ? fields.stock : 1,
                sold: fields.stock === 0,
                owner: fields.owner ? fields.owner.toLowerCase() : 'lara', // Padrão é Lara se esquecer de preencher
                size: fields.size ? String(fields.size) : 'Único', // Garante que seja texto para o filtro funcionar
                defects: fields.defects || null
            };
        });

        // Adiciona um delay de 1.5s para garantir que o loader (Pudim) seja visto
        setTimeout(() => {
            // Atualiza a lista global de produtos do script.js
            window.products = contentfulProducts;

            // Chama a função original do script.js para desenhar na tela
            if (typeof renderProducts === 'function') {
                renderProducts(window.products);
                // Valida a sacola agora que temos os dados reais de estoque
                if (typeof validateCartStock === 'function') {
                    validateCartStock();
                    updateCartCounter();
                }
                
                // Remove o loader global com um efeito de fade out
                const loader = document.getElementById('global-loader');
                if(loader) {
                    loader.style.opacity = '0';
                    document.body.classList.add('site-loaded'); // Dispara a transição cinemática
                    setTimeout(() => loader.remove(), 500);
                }
            }
        }, 1500);
    })
    .catch((error) => {
        console.error("Erro ao buscar do Contentful:", error);
        productGrid.innerHTML = `
            <div id="error-container" style="text-align:center; width:100%;">
                <p>Ops! Não consegui carregar os produtos. :(</p>
                <p style="color:red; font-size:0.8rem; margin-top:10px;">Erro: ${error.message || JSON.stringify(error)}</p>
            </div>`;
            
        // Tenta descobrir o ID correto automaticamente para te ajudar
        client.getContentTypes()
            .then(response => {
                const availableIds = response.items.map(t => t.sys.id).join(' ou ');
                const container = document.getElementById('error-container');
                if(container && availableIds) {
                    container.innerHTML += `
                        <div style="margin-top:15px; padding:10px; background:#fff3cd; color:#856404; border-radius:5px; display:inline-block;">
                            <strong>Descobri o problema!</strong><br>
                            O ID que você colocou no código é 'product', mas o correto é: <br>
                            <code style="background:#fff; padding:2px 5px; font-weight:bold; font-size:1.2rem;">${availableIds}</code><br>
                            <small>(Volte no arquivo contentful-logic.js e troque 'product' por esse nome acima)</small>
                        </div>`;
                }
            });
    });
}

// Inicia a busca assim que a página carregar
document.addEventListener('DOMContentLoaded', fetchContentfulProducts);