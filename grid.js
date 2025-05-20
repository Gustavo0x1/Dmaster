const canvas = document.getElementById('gridCanvas');
const ctx = canvas.getContext('2d');
let zoom = 1;
let panX = 0;
let panY = 0;
let isDragging = false;
let draggedToken = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
const layers = {
    MAP: [],
    CHARACTERS: [],
    EXTRA1: [],
    EXTRA2: []
};
const cellSize = 50;

let mapImage = new Image();
mapImage.src = '3.jpeg'; // Use uma imagem de mapa real
mapImage.onload = () => drawGrid();


// Ajusta o tamanho do canvas ao tamanho da janela
const resizeCanvas =()=> {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    // Centraliza o mapa ao redimensionar
    if (mapImage) {
        panX = (canvas.width - mapImage.width * zoom) / 2;
        panY = (canvas.height - mapImage.height * zoom) / 2;
    }
    drawGrid();
}

const drawGrid =()=> {

    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reseta o contexto para o estado inicial
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa tudo

    // Aplica as transformações de pan e zoom
    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Desenha o mapa (camada de fundo)
    if (mapImage) {
        ctx.drawImage(mapImage, 0, 0, mapImage.width, mapImage.height);
    }

    // Desenha o grid
    drawLayerGrid();

    // Renderiza os tokens de cada camada
    Object.values(layers).forEach(renderLayer);

    ctx.restore();
}



// Desenha o grid para ajudar com posicionamento
const drawLayerGrid =()=> {
    const width = mapImage ? mapImage.width : canvas.width / zoom;
    const height = mapImage ? mapImage.height : canvas.height / zoom;

    ctx.beginPath();
    for (let x = 0; x <= width; x += cellSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += cellSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    ctx.strokeStyle = '#ccc';
    ctx.lineWidth = 0.5 / zoom; // Ajusta a largura da linha para zoom
    ctx.stroke();
}

// Renderiza tokens de uma camada
const renderLayer =(layer)=> {
    layer.forEach((token) => {
        if (token.image instanceof HTMLImageElement && token.image.complete) {
            ctx.drawImage(
                token.image,
                token.x * cellSize,
                token.y * cellSize,
                token.width * cellSize,
                token.height * cellSize
            );

            // Adiciona borda vermelha para tokens selecionados
            if (selectedTokens.includes(token)) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2 / zoom;
                ctx.strokeRect(
                    token.x * cellSize,
                    token.y * cellSize,
                    token.width * cellSize,
                    token.height * cellSize
                );
            }
        } else {
            // Placeholder para tokens sem imagem
            ctx.fillStyle = 'red';
            ctx.fillRect(
                token.x * cellSize,
                token.y * cellSize,
                token.width * cellSize,
                token.height * cellSize
            );

            if (selectedTokens.includes(token)) {
                ctx.strokeStyle = 'red';
                ctx.lineWidth = 2 / zoom;
                ctx.strokeRect(
                    token.x * cellSize,
                    token.y * cellSize,
                    token.width * cellSize,
                    token.height * cellSize
                );
            }
        }
    });
}

let pendingUpdates = [];
 const moveToken =(id, newX, newY)=> {
    try {
        
        pendingUpdates.push({ id, newX, newY });
        const response = window.api.updateTokenPosition(id, newX, newY);
        if (response.success) {
            
            const token = layers.CHARACTERS.find((t) => t.id === id);
            if (token) {
                token.x = newX;
                token.y = newY;
                pendingUpdates = pendingUpdates.filter(update => update.id !== id);
                drawGrid();
            }
        } else {
            console.warn(`[RENDERER] moveToken: Falha ao mover token ${id}`);
        }
    } catch (error) {
        console.error('[RENDERER] moveToken: Erro ao chamar updateTokenPosition:', error);
    }
}


// Zoom com scroll do mouse
canvas.addEventListener('wheel', (event) => {
    event.preventDefault();

    const scaleFactor = 0.1;
    zoom += event.deltaY < 0 ? scaleFactor : -scaleFactor;
    zoom = Math.min(Math.max(zoom, 0.5), 3); // Limita o zoom entre 0.5x e 3x
    drawGrid();
});

// Pan com mouse direito
let isPanning = false;
let startX, startY;
let selectedTokens = []; // Lista de tokens selecionados
const displaySelectedTokens =()=> {
    const infoDiv = document.getElementById('selectedTokensInfo'); // Certifique-se de ter esse elemento no HTML
    if (!infoDiv) {
        console.warn('Elemento para exibir informações dos tokens não encontrado.');
        return;
    }

    if (selectedTokens.length === 0) {
        infoDiv.innerHTML = '<p>Nenhum token selecionado.</p>';
        return;
    }

    // Gera o HTML para os tokens selecionados
    const htmlContent = selectedTokens.map((token, index) => `
        <div class="token-info">
            <h4>Token ${index + 1}</h4>
            <p>Posição: (${token.x}, ${token.y})</p>
            <p>Tamanho: ${token.width} x ${token.height} células</p>
            <p>Imagem: ${token.image?.src ? `<img src="${token.image.src}" alt="Token Image" width="50" height="50">` : 'Nenhuma imagem associada'}</p>
        </div>
        <hr>
    `).join('');

    // Atualiza o conteúdo do elemento
    infoDiv.innerHTML = htmlContent;
}

canvas.addEventListener('mousedown', (event) => {
    const rect = canvas.getBoundingClientRect(); // Dimensões reais do canvas
    const mouseX = (event.clientX - rect.left - panX) / zoom;
    const mouseY = (event.clientY - rect.top - panY) / zoom;

    if (event.ctrlKey) { // Se a tecla Ctrl estiver pressionada
        for (const layer of Object.values(layers)) {
            for (const token of layer) {
                const tokenX = token.x * cellSize;
                const tokenY = token.y * cellSize;

                if (
                    mouseX >= tokenX &&
                    mouseX <= tokenX + token.width * cellSize &&
                    mouseY >= tokenY &&
                    mouseY <= tokenY + token.height * cellSize
                ) {

                    const isAlreadySelected = selectedTokens.includes(token);
                    if (isAlreadySelected) {
                        // Se já está selecionado, remova da seleção
                        selectedTokens = selectedTokens.filter(t => t !== token);
                        drawGrid();
                    } else {
                        
                        selectedTokens.push(token);
                        drawGrid();
                    }
                    displaySelectedTokens()
                    drawGrid();
                    return;
                }
            }
        }
    } else if (event.button === 0) { // Botão esquerdo do mouse
        for (const layer of Object.values(layers)) {
            for (const token of layer) {
                const tokenX = token.x * cellSize;
                const tokenY = token.y * cellSize;

                if (
                    mouseX >= tokenX &&
                    mouseX <= tokenX + token.width * cellSize &&
                    mouseY >= tokenY &&
                    mouseY <= tokenY + token.height * cellSize
                ) {
                    isDragging = true;
                    draggedToken = token;
                    dragOffsetX = mouseX - tokenX;
                    dragOffsetY = mouseY - tokenY;
          
                    return;
                }
            }
        }
    } else if (event.button === 2) { // Botão direito do mouse
        isPanning = true;
        startX = event.clientX - panX;
        startY = event.clientY - panY;
    }
});

canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    if (isDragging && draggedToken) {
        const mouseX = (event.clientX - rect.left - panX) / zoom;
        const mouseY = (event.clientY - rect.top - panY) / zoom;

        const newPosX = Math.floor((mouseX - dragOffsetX) / cellSize);
        const newPosY = Math.floor((mouseY - dragOffsetY) / cellSize);

        if (newPosX !== draggedToken.x || newPosY !== draggedToken.y) {
            draggedToken.x = newPosX;
            draggedToken.y = newPosY;
            drawGrid(); // Redesenha somente se necessário
        }
    }

    if (isPanning) {
        const newPanX = event.clientX - startX;
        const newPanY = event.clientY - startY;
        if (newPanX !== panX || newPanY !== panY) {
            panX = newPanX;
            panY = newPanY;
            drawGrid();
        }
    }
});


canvas.addEventListener('mouseup', (event) => {


    if (isDragging && draggedToken) {
        const rect = canvas.getBoundingClientRect();
        const mouseX = (event.clientX - rect.left - panX) / zoom;
        const mouseY = (event.clientY - rect.top - panY) / zoom;
        const tokenLayer = draggedToken.layer;
        const finalX = Math.floor((mouseX - dragOffsetX) / cellSize);
        const finalY = Math.floor((mouseY - dragOffsetY) / cellSize);
    
        moveToken(draggedToken.id, finalX, finalY, tokenLayer);

        isDragging = false;
        draggedToken = null;
    }
    isPanning = false;
});


canvas.addEventListener('contextmenu', (event) => event.preventDefault());

// Ajusta o canvas ao redimensionar a janela
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// Exibe informações sobre o token e permite alterar tamanho




const tokens = [];
const clearCanvas =()=> {
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reseta a transformação
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Limpa o canvas
}

 const syncPendingUpdates =()=> {
    for (const update of pendingUpdates) {
         moveToken(update.id, update.newX, update.newY);
    }
}

 const GridSync =()=> {
    
    try {
        const tokenData =  window.api.loadTokens();
        const existingTokens = new Map(layers.CHARACTERS.map(t => [t.id, t]));

        layers.CHARACTERS =  Promise.all(tokenData.map(async (data) => {
            const existingToken = existingTokens.get(data.id);
            const tokenImage = new Image();
            tokenImage.src = data.image;

            return new Promise((resolve) => {
                tokenImage.onload = () => {
                    resolve({
                        id: data.id,
                        x: existingToken?.x ?? (typeof data.posx === 'number' ? data.posx : 0),
                        y: existingToken?.y ?? (typeof data.posy === 'number' ? data.posy : 0),
                        width: existingToken?.width ?? 1,
                        height: existingToken?.height ?? 1,
                        image: tokenImage,
                        layer: 'CHARACTERS',
                    });
                };
                tokenImage.onerror = () => {
                    
                    resolve(null);
                };
            });
        }));

        layers.CHARACTERS = layers.CHARACTERS.filter(token => token !== null);
        drawGrid();

    } catch (error) {

    }
  
}
 const loadTokens =()=> {
    try {
        
        clearCanvas();
        const tokenData =  window.api.loadTokens();
        tokenData.forEach((data) => {
            const tokenImage = new Image();
            tokenImage.src = data.image;
            tokenImage.onload = () => {
                layers.CHARACTERS.push({ id: data.id, x: data.posx, y: data.posy, width: 1, height: 1, image: tokenImage, layer: 'CHARACTERS' });
                drawGrid();
            };
            tokenImage.onerror = () => {
              
            };
        });
        
    } catch (error) {
        console.error('[RENDERER] loadTokens: Erro ao carregar tokens:', error);
    }
}
window.api.onUpdateMap((data) => {
    
    mapImage.src = data;
    
});

  
let syncTimeout = null;
const scheduleGridSync =()=> {
    if (syncTimeout) clearTimeout(syncTimeout);
    syncTimeout = setTimeout(() => {
        GridSync();
        syncTimeout = null;
    }, 1000); // Atraso de 1 segundo
}
window.api.onUpdatePositions((event, updatedTokens) => {
    
    updatedTokens.data.forEach((updatedToken) => {
        const token = layers.CHARACTERS.find((t) => t.id === updatedToken.id);
        if (token) {
            

            
            token.x = updatedToken.newX ?? 0; // Usa 0 se posx for undefined
            token.y = updatedToken.newY ?? 0; // Usa 0 se posy for undefined
        } else {
            console.warn(`Token ID ${updatedToken.id} não encontrado no grid.`);
        }
    });
    drawGrid();
    
});

loadTokens();
window.addEventListener('resize', resizeCanvas);