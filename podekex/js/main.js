// Variables globales
let currentPokemonId = 1;
let statsChart = null;
let filteredPokemon = [];
let isFiltering = false;
let currentFilterType = '';
let inputBuffer = '';
const MAX_POKEMON = 1025;

// Elementos DOM
document.addEventListener('DOMContentLoaded', () => {
    loadPokemon(currentPokemonId);
    setupEventListeners();
});

function setupEventListeners() {
    const toggleStatsButton = document.getElementById('toggle-stats');
    
    if (toggleStatsButton) {
        toggleStatsButton.addEventListener('click', toggleStatsDisplay);
    }
    
    document.getElementById('prev-pokemon').addEventListener('click', () => navigatePokemon(-1));
    document.getElementById('next-pokemon').addEventListener('click', () => navigatePokemon(1));
    document.getElementById('prev-ten').addEventListener('click', () => navigatePokemon(-10));
    document.getElementById('next-ten').addEventListener('click', () => navigatePokemon(10));
    
    const searchInput = document.getElementById('pokemon-search');
    if (searchInput) {
        searchInput.addEventListener('keyup', (e) => {
            if (e.key === 'Enter') searchPokemon(e.target.value);
        });
    }
    
    document.querySelectorAll('.num-button').forEach(button => {
        button.addEventListener('click', handleNumberPad);
    });
    
    document.querySelectorAll('.type-button').forEach(button => {
        button.addEventListener('click', () => {
            if (button.classList.contains('selected')) {
                button.classList.remove('selected');
                currentFilterType = '';
            } else {
                document.querySelectorAll('.type-button').forEach(b => b.classList.remove('selected'));
                button.classList.add('selected');
                currentFilterType = button.dataset.type;
            }
        });
    });
    
    document.getElementById('apply-filter').addEventListener('click', applyFilter);
    document.getElementById('clear-filter').addEventListener('click', clearFilter);
    
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Funciones principales
async function loadPokemon(id) {
    try {
        inputBuffer = '';
        updateNumberDisplay('');
        
        const pokemonData = await fetchPokemonData(id);
        
        if (!pokemonData) {
            showError('Pokémon no encontrado');
            return;
        }
        
        currentPokemonId = pokemonData.id;
        updateMainDisplay(pokemonData);
        await fetchAndUpdateAdditionalData(pokemonData);
        
    } catch (error) {
        console.error('Error loading Pokémon:', error);
        showError('Error al cargar el Pokémon');
    }
}

async function fetchPokemonData(idOrName) {
    try {
        const response = await fetch(`/php/get_pokemon.php?id=${encodeURIComponent(idOrName)}`);
        if (!response.ok) throw new Error('Pokémon no encontrado');
        const data = await response.json();
        window.currentPokemonData = data; // Almacenar datos actuales
        return data;
    } catch (error) {
        console.error('Error fetching Pokémon:', error);
        return null;
    }
}

function updateMainDisplay(pokemon) {
    document.getElementById('pokemon-name').textContent = pokemon.name.toUpperCase();
    document.getElementById('pokemon-id').textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
    
    const pokemonImage = document.getElementById('pokemon-image');
    pokemonImage.src = pokemon.sprites.front_default || 'placeholder.png';
    pokemonImage.alt = pokemon.name;
    
    const typesContainer = document.getElementById('pokemon-types');
    typesContainer.innerHTML = '';
    pokemon.types.forEach(typeInfo => {
        const typeElement = document.createElement('span');
        typeElement.classList.add('type-tag', typeInfo.type.name);
        typeElement.textContent = translateType(typeInfo.type.name).toUpperCase();
        typesContainer.appendChild(typeElement);
    });
    
    document.getElementById('pokemon-measures').textContent = 
        `ALT: ${(pokemon.height / 10).toFixed(1)}m / PESO: ${(pokemon.weight / 10).toFixed(1)}kg`;
}

async function fetchAndUpdateAdditionalData(pokemon) {
    document.getElementById('stats-pokemon-id').textContent = `#${pokemon.id.toString().padStart(3, '0')}`;
    document.getElementById('stats-pokemon-name').textContent = pokemon.name.toUpperCase();
    document.getElementById('stats-mini-sprite').src = pokemon.sprites.front_default || 'placeholder.png';
    
    updateStatsChart(pokemon.stats);

    try {
        const speciesResponse = await fetch(pokemon.species.url);
        if (!speciesResponse.ok) throw new Error('Error species data');
        const speciesData = await speciesResponse.json();
        
        updateDescription(speciesData);
        await fetchAndUpdateEvolutionChain(speciesData);
        
    } catch (error) {
        console.error('Error fetching species data:', error);
    }
    
    updateMoves(pokemon.moves);
}

// Funciones de gráficos y descripción
function updateStatsChart(stats) {
    const ctx = document.getElementById('stats-chart').getContext('2d');
    
    if (statsChart) statsChart.destroy();
    
    const labels = stats.map(stat => translateStatName(stat.stat.name));
    const values = stats.map(stat => stat.base_stat);
    
    statsChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                data: values,
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 206, 86, 0.7)',
                    'rgba(75, 192, 192, 0.7)',
                    'rgba(153, 102, 255, 0.7)',
                    'rgba(255, 159, 64, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 206, 86, 1)',
                    'rgba(75, 192, 192, 1)',
                    'rgba(153, 102, 255, 1)',
                    'rgba(255, 159, 64, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, max: 255, ticks: { color: '#8bac0f' }, grid: { color: 'rgba(139, 172, 15, 0.2)' } },
                x: { ticks: { color: '#8bac0f' }, grid: { color: 'rgba(139, 172, 15, 0.2)' } }
            }
        }
    });
}

function updateDescription(speciesData) {
    const descriptionElement = document.querySelector('.pokemon-description');
    const categoryElement = document.getElementById('pokemon-category');
    const abilityElement = document.getElementById('pokemon-ability');

    const flavorText = speciesData.flavor_text_entries[0]?.flavor_text || 'Descripción no disponible';
    descriptionElement.textContent = flavorText.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    categoryElement.textContent = speciesData.genera[0]?.genus || 'Desconocido';
    
    if (window.currentPokemonData?.abilities) {
        abilityElement.textContent = window.currentPokemonData.abilities
            .map(ability => capitalizeFirstLetter(ability.ability.name.replace('-', ' ')))
            .join(', ');
    } else {
        abilityElement.textContent = 'Desconocido';
    }
}

// Evoluciones y movimientos
async function fetchAndUpdateEvolutionChain(speciesData) {
    try {
        const response = await fetch(speciesData.evolution_chain.url);
        if (!response.ok) throw new Error('Error evolution chain');
        
        const evolutionData = await response.json();
        const evolutionChain = processEvolutionData(evolutionData);
        updateEvolutionChainUI(evolutionChain);
        
    } catch (error) {
        console.error('Error fetching evolution chain:', error);
        document.querySelector('.evolution-chain').innerHTML = 'Cadena evolutiva no disponible.';
    }
}

function processEvolutionData(evolutionData) {
    const chain = [];
    let current = evolutionData.chain;
    
    while (current) {
        chain.push({
            name: current.species.name,
            id: current.species.id,
            sprite: current.species.sprite_url
        });
        current = current.evolves_to[0];
    }
    return chain;
}

function updateEvolutionChainUI(evolutionChain) {
    const container = document.querySelector('.evolution-chain');
    container.innerHTML = '';
    
    evolutionChain.forEach((pokemon, index) => {
        const evolutionItem = document.createElement('div');
        evolutionItem.classList.add('evolution-item');
        
        const sprite = document.createElement('img');
        sprite.src = pokemon.sprite;
        sprite.alt = pokemon.name;
        sprite.classList.add('evolution-sprite');
        sprite.addEventListener('click', () => loadPokemon(pokemon.id));
        
        const name = document.createElement('div');
        name.classList.add('evolution-name');
        name.textContent = capitalizeFirstLetter(pokemon.name);
        
        evolutionItem.appendChild(sprite);
        evolutionItem.appendChild(name);
        container.appendChild(evolutionItem);

        if (index < evolutionChain.length - 1) {
            const arrow = document.createElement('div');
            arrow.classList.add('evolution-arrow');
            arrow.innerHTML = '→';
            container.appendChild(arrow);
        }
    });
}

function updateMoves(moves) {
    const levelMovesContainer = document.querySelector('.level-moves');
    const tmMovesContainer = document.querySelector('.tm-moves');
    
    levelMovesContainer.innerHTML = '';
    tmMovesContainer.innerHTML = '';
    
    // Movimientos de nivel
    const levelMoves = moves.filter(move => 
        move.version_group_details[0]?.move_learn_method.name === 'level-up'
    );
    
    levelMoves.forEach(move => {
        const moveItem = document.createElement('div');
        moveItem.classList.add('move-item');
        moveItem.innerHTML = `
            <span class="move-level">Nv.${move.version_group_details[0].level_learned_at}</span>
            <span>${capitalizeFirstLetter(move.move.name.replace('-', ' '))}</span>
        `;
        levelMovesContainer.appendChild(moveItem);
    });
    
    // Movimientos MT
    const tmMoves = moves.filter(move => 
        move.version_group_details.some(detail => 
            detail.move_learn_method.name === 'machine'
        )
    );
    
    tmMoves.forEach(move => {
        const moveItem = document.createElement('div');
        moveItem.classList.add('move-item');
        moveItem.textContent = capitalizeFirstLetter(move.move.name.replace('-', ' '));
        tmMovesContainer.appendChild(moveItem);
    });
    
    if (levelMoves.length === 0) levelMovesContainer.innerHTML = '<div class="move-item">No hay movimientos por nivel</div>';
    if (tmMoves.length === 0) tmMovesContainer.innerHTML = '<div class="move-item">No hay movimientos TM/MT</div>';
}

// Navegación y búsqueda
function navigatePokemon(change) {
    let newId = currentPokemonId + change;
    
    if (newId < 1) newId = MAX_POKEMON;
    if (newId > MAX_POKEMON) newId = 1;
    
    if (isFiltering && filteredPokemon.length > 0) {
        const currentIndex = filteredPokemon.findIndex(id => id === currentPokemonId);
        let newIndex = currentIndex + (change > 0 ? 1 : -1);
        
        if (newIndex < 0) newIndex = filteredPokemon.length - 1;
        if (newIndex >= filteredPokemon.length) newIndex = 0;
        
        newId = filteredPokemon[newIndex];
    }
    
    loadPokemon(newId);
}

function searchPokemon(query) {
    if (!query) return;
    
    const idQuery = parseInt(query);
    if (!isNaN(idQuery)) {
        loadPokemon(idQuery);
        return;
    }
    
    loadPokemon(query.toLowerCase());
}

// Teclado numérico
function handleNumberPad(e) {
    const value = e.target.dataset.num;
    
    if (value === 'c') {
        inputBuffer = '';
    } else if (value === 'enter') {
        if (inputBuffer) loadPokemon(parseInt(inputBuffer));
    } else {
        if (inputBuffer.length < 4) inputBuffer += value;
    }
    
    updateNumberDisplay(inputBuffer);
}

function updateNumberDisplay(value) {
    document.getElementById('number-display').textContent = value.padStart(3, ' ');
}

// Filtros
async function applyFilter() {
    if (!currentFilterType) {
        clearFilter();
        return;
    }
    
    try {
        const response = await fetch(`/php/get_type.php?type=${currentFilterType}`);
        if (!response.ok) throw new Error('Error al cargar tipos');
        
        const data = await response.json();
        filteredPokemon = data.pokemon
            .map(p => getIdFromUrl(p.pokemon.url))
            .filter(id => id <= MAX_POKEMON)
            .sort((a, b) => a - b);
        
        if (filteredPokemon.length > 0) {
            isFiltering = true;
            loadPokemon(filteredPokemon[0]);
        } else {
            showError('No hay Pokémon de este tipo');
            clearFilter();
        }
    } catch (error) {
        console.error('Error al aplicar filtro:', error);
        showError('Error al aplicar filtro');
    }
}

function clearFilter() {
    isFiltering = false;
    filteredPokemon = [];
    document.querySelectorAll('.type-button').forEach(b => b.classList.remove('selected'));
    currentFilterType = '';
    loadPokemon(currentPokemonId);
}

// Utilidades
function getIdFromUrl(url) {
    return parseInt(url.split('/').pop());
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function showError(message) {
    alert(message);
}

function translateType(type) {
    const typeTranslations = {
        'normal': 'Normal', 'fire': 'Fuego', 'water': 'Agua',
        'electric': 'Eléctrico', 'grass': 'Planta', 'ice': 'Hielo',
        'fighting': 'Lucha', 'poison': 'Veneno', 'ground': 'Tierra',
        'flying': 'Volador', 'psychic': 'Psíquico', 'bug': 'Bicho',
        'rock': 'Roca', 'ghost': 'Fantasma', 'dragon': 'Dragón',
        'dark': 'Siniestro', 'steel': 'Acero', 'fairy': 'Hada'
    };
    return typeTranslations[type] || type;
}

function translateStatName(stat) {
    const statTranslations = {
        'hp': 'PS', 'attack': 'Ataque', 'defense': 'Defensa',
        'special-attack': 'At. Esp.', 'special-defense': 'Def. Esp.', 
        'speed': 'Velocidad'
    };
    return statTranslations[stat] || stat;
}

function toggleStatsDisplay() {
    const mainDisplay = document.getElementById('main-display');
    const statsDisplay = document.getElementById('stats-display');
    
    if (mainDisplay.style.display !== 'none') {
        mainDisplay.style.display = 'none';
        statsDisplay.style.display = 'block';
    } else {
        statsDisplay.style.display = 'none';
        mainDisplay.style.display = 'block';
    }
}