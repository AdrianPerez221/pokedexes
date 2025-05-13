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
    // Inicialización
    loadPokemon(currentPokemonId);
    setupEventListeners();
});

function setupEventListeners() {
    // Botones de control - Con verificación de existencia
    const toggleStatsButton = document.getElementById('toggle-stats');
    
    if (toggleStatsButton) {
        toggleStatsButton.addEventListener('click', toggleStatsDisplay);
    } 
    
    // Navegación
    document.getElementById('prev-pokemon').addEventListener('click', () => navigatePokemon(-1));
    document.getElementById('next-pokemon').addEventListener('click', () => navigatePokemon(1));
    document.getElementById('prev-ten').addEventListener('click', () => navigatePokemon(-10));
    document.getElementById('next-ten').addEventListener('click', () => navigatePokemon(10));
    
    // Number Pad
    document.querySelectorAll('.num-button').forEach(button => {
        button.addEventListener('click', handleNumberPad);
    });
    
    // Filtros
    document.querySelectorAll('.type-button').forEach(button => {
        button.addEventListener('click', () => {
            // Toggle selected class
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
    
    // Tabs
    document.querySelectorAll('.tab-button').forEach(tab => {
        tab.addEventListener('click', () => {
            // Remove active class from all tabs and contents
            document.querySelectorAll('.tab-button').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked tab and corresponding content
            tab.classList.add('active');
            const tabId = tab.dataset.tab;
            document.getElementById(tabId).classList.add('active');
        });
    });
}

// Funciones de navegación y carga de Pokémon
async function loadPokemon(id) {
    try {
        // Reset input buffer
        inputBuffer = '';
        updateNumberDisplay('');
        
        // Asegúrate de que id sea un número
        id = parseInt(id);
        if (isNaN(id) || id < 1) {
            id = 1;
        }
        
        // Fetch Pokémon data from PHP backend (MySQL database)
        const dbPokemonData = await fetchPokemonFromDB(id);
        
        if (!dbPokemonData) {
            showError('Pokémon no encontrado en la base de datos');
            return;
        }
        
        // Update current ID - asegurándonos que sea un número
        currentPokemonId = parseInt(dbPokemonData.id);
        
        // Update main display with DB data
        updateMainDisplayFromDB(dbPokemonData);
        
        // Fetch and update additional data for stats display from PokeAPI
        await fetchAndUpdateAdditionalData(dbPokemonData);
        
    } catch (error) {
        console.error('Error loading Pokémon:', error);
        showError('Error al cargar el Pokémon');
    }
}

async function fetchPokemonFromDB(id) {
    try {
        const response = await fetch(`../php/db.php?id=${id}`);
        
        if (!response.ok) {
            throw new Error('Error al conectar con la base de datos');
        }
        
        const data = await response.json();
        
        if (data.error) {
            console.error('Error from DB:', data.error);
            return null;
        }
        
        // Asegúrate de que el ID sea un número
        data.id = parseInt(data.id);
        
        return data;
    } catch (error) {
        console.error('Error fetching Pokémon from DB:', error);
        return null;
    }
}

async function fetchPokemonData(idOrName) {
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${idOrName.toString().toLowerCase()}`);
        if (!response.ok) {
            throw new Error('Pokémon no encontrado');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching Pokémon:', error);
        return null;
    }
}

function updateMainDisplayFromDB(dbPokemon) {
    // Update name and ID
    document.getElementById('pokemon-name').textContent = dbPokemon.nombre.toUpperCase();
    document.getElementById('pokemon-id').textContent = `#${dbPokemon.id.toString().padStart(3, '0')}`;
    
    // Update image from database
    const pokemonImage = document.getElementById('pokemon-image');
    pokemonImage.src = dbPokemon.imagen || 'placeholder.png';
    pokemonImage.alt = dbPokemon.nombre;
    
    // Update types from database
    const typesContainer = document.getElementById('pokemon-types');
    typesContainer.innerHTML = '';
    
    // Procesar tipo principal
    if (dbPokemon.tipo) {
        const typeElement = document.createElement('span');
        typeElement.classList.add('type-tag', dbPokemon.tipo.toLowerCase());
        typeElement.textContent = translateType(dbPokemon.tipo).toUpperCase();
        typesContainer.appendChild(typeElement);
    }
    
    // Procesar tipo secundario si existe
    if (dbPokemon.tipo_secundario) {
        const secondaryTypeElement = document.createElement('span');
        secondaryTypeElement.classList.add('type-tag', dbPokemon.tipo_secundario.toLowerCase());
        secondaryTypeElement.textContent = translateType(dbPokemon.tipo_secundario).toUpperCase();
        typesContainer.appendChild(secondaryTypeElement);
    }
    
    // Update measures (altura and peso from database)
    document.getElementById('pokemon-measures').textContent = 
        `ALT: ${(dbPokemon.altura)}m / PESO: ${(dbPokemon.peso)}kg`;
}

async function fetchAndUpdateAdditionalData(dbPokemon) {
    // Update stats mini display info with DB data
    document.getElementById('stats-pokemon-id').textContent = `#${dbPokemon.id.toString().padStart(3, '0')}`;
    document.getElementById('stats-pokemon-name').textContent = dbPokemon.nombre.toUpperCase();
    document.getElementById('stats-mini-sprite').src = dbPokemon.imagen || 'placeholder.png';
    
    // For the rest of the data, fetch from PokeAPI
    try {
        const apiPokemon = await fetchPokemonData(dbPokemon.id);
        
        if (apiPokemon) {
            // Update stats chart
            updateStatsChart(apiPokemon.stats);
            
            // Fetch and update species data
            try {
                const speciesResponse = await fetch(apiPokemon.species.url);
                if (!speciesResponse.ok) throw new Error('No se pudo cargar los datos de la especie');
                const speciesData = await speciesResponse.json();
                
                // Update description
                updateDescription(speciesData);
                
                // Fetch and update evolution chain
                await fetchAndUpdateEvolutionChain(speciesData);
            } catch (error) {
                console.error('Error fetching species data:', error);
            }
            
            // Update moves
            updateMoves(apiPokemon.moves);
        }
    } catch (error) {
        console.error('Error fetching additional data from PokeAPI:', error);
    }
}

function updateStatsChart(stats) {
    const ctx = document.getElementById('stats-chart').getContext('2d');
    
    // Destroy previous chart if exists
    if (statsChart) {
        statsChart.destroy();
    }
    
    const labels = stats.map(stat => translateStatName(stat.stat.name));
    const values = stats.map(stat => stat.base_stat);
    
    // Create new chart
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
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    max: 255,
                    ticks: {
                        color: '#8bac0f'
                    },
                    grid: {
                        color: 'rgba(139, 172, 15, 0.2)'
                    }
                },
                x: {
                    ticks: {
                        color: '#8bac0f'
                    },
                    grid: {
                        color: 'rgba(139, 172, 15, 0.2)'
                    }
                }
            }
        }
    });
}

function updateDescription(speciesData) {
    const descriptionElement = document.querySelector('.pokemon-description');
    const categoryElement = document.getElementById('pokemon-category');
    const abilityElement = document.getElementById('pokemon-ability');
    
    
    // Find Spanish flavor text if available, otherwise use English
    let flavorText = '';
    const spanishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'es');
    const englishEntry = speciesData.flavor_text_entries.find(entry => entry.language.name === 'en');
    
    if (spanishEntry) {
        flavorText = spanishEntry.flavor_text;
    } else if (englishEntry) {
        flavorText = englishEntry.flavor_text;
    } else if (speciesData.flavor_text_entries.length > 0) {
        flavorText = speciesData.flavor_text_entries[0].flavor_text;
    }
    
    // Clean up flavor text (replace line breaks and duplicate spaces)
    flavorText = flavorText.replace(/\f/g, ' ').replace(/\n/g, ' ').replace(/\s+/g, ' ');
    
    descriptionElement.textContent = flavorText;
    
    // Set category (genus)
    const spanishGenus = speciesData.genera.find(genus => genus.language.name === 'es');
    const englishGenus = speciesData.genera.find(genus => genus.language.name === 'en');
    
    if (spanishGenus) {
        categoryElement.textContent = spanishGenus.genus;
    } else if (englishGenus) {
        categoryElement.textContent = englishGenus.genus;
    } else {
        categoryElement.textContent = 'Desconocido';
    }
    
    // Fetch abilities (need to go back to main pokemon data)
    fetchPokemonData(speciesData.id).then(pokemon => {
        if (pokemon && pokemon.abilities && pokemon.abilities.length > 0) {
            abilityElement.textContent = pokemon.abilities.map(ability => 
                capitalizeFirstLetter(ability.ability.name.replace('-', ' '))
            ).join(', ');
        } else {
            abilityElement.textContent = 'Desconocido';
        }
    });
}

async function fetchAndUpdateEvolutionChain(speciesData) {
    try {
        const evolutionChainUrl = speciesData.evolution_chain.url;
        const response = await fetch(evolutionChainUrl);
        if (!response.ok) throw new Error('No se pudo cargar la cadena evolutiva');
        
        const evolutionData = await response.json();
        const evolutionChain = [];
        
        // Extract evolution chain
        let currentStage = evolutionData.chain;
        while (currentStage) {
            // Get species details for this evolution stage
            const speciesName = currentStage.species.name;
            const speciesUrl = currentStage.species.url;
            const speciesId = getIdFromUrl(speciesUrl);
            
            // Add to evolution chain
            evolutionChain.push({
                name: speciesName,
                id: speciesId,
                sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${speciesId}.png`,
                evolutionDetails: currentStage.evolution_details.length > 0 ? currentStage.evolution_details[0] : null
            });
            
            // Move to next evolution stage if exists
            if (currentStage.evolves_to.length > 0) {
                currentStage = currentStage.evolves_to[0];
            } else {
                currentStage = null;
            }
        }
        
        // Update UI
        updateEvolutionChainUI(evolutionChain);
    } catch (error) {
        console.error('Error fetching evolution chain:', error);
        document.querySelector('.evolution-chain').innerHTML = 'No se pudo cargar la cadena evolutiva.';
    }
}

function updateEvolutionChainUI(evolutionChain) {
    const container = document.querySelector('.evolution-chain');
    container.innerHTML = '';
    
    for (let i = 0; i < evolutionChain.length; i++) {
        const pokemon = evolutionChain[i];
        
        // Create container for this evolution stage
        const evolutionItem = document.createElement('div');
        evolutionItem.classList.add('evolution-item');
        
        // Add sprite
        const sprite = document.createElement('img');
        sprite.src = pokemon.sprite;
        sprite.alt = pokemon.name;
        sprite.classList.add('evolution-sprite');
        sprite.addEventListener('click', () => loadPokemon(pokemon.id));
        evolutionItem.appendChild(sprite);
        
        // Add name
        const name = document.createElement('div');
        name.classList.add('evolution-name');
        name.textContent = capitalizeFirstLetter(pokemon.name);
        evolutionItem.appendChild(name);
        
        // Add to container
        container.appendChild(evolutionItem);
        
        // Add arrow to next evolution if not the last one
        if (i < evolutionChain.length - 1) {
            const arrow = document.createElement('div');
            arrow.classList.add('evolution-arrow');
            arrow.innerHTML = '→';
            container.appendChild(arrow);
        }
    }
}

function updateMoves(moves) {
    const levelMovesContainer = document.querySelector('.level-moves');
    const tmMovesContainer = document.querySelector('.tm-moves');
    
    // Clear containers
    levelMovesContainer.innerHTML = '';
    tmMovesContainer.innerHTML = '';
    
    // Sort moves by level
    const sortedMoves = [...moves].sort((a, b) => {
        const levelA = a.version_group_details[0]?.level_learned_at || 0;
        const levelB = b.version_group_details[0]?.level_learned_at || 0;
        return levelA - levelB;
    });
    
    // Add level-up moves
    const levelMoves = sortedMoves.filter(move => {
        const details = move.version_group_details[0];
        return details && details.move_learn_method.name === 'level-up';
    });
    
    levelMoves.forEach(move => {
        const moveItem = document.createElement('div');
        moveItem.classList.add('move-item');
        
        const level = document.createElement('span');
        level.classList.add('move-level');
        level.textContent = `Nv.${move.version_group_details[0].level_learned_at}`;
        
        const name = document.createElement('span');
        name.textContent = capitalizeFirstLetter(move.move.name.replace('-', ' '));
        
        moveItem.appendChild(level);
        moveItem.appendChild(name);
        levelMovesContainer.appendChild(moveItem);
    });
    
    // Add TM/MT moves
    const tmMoves = sortedMoves.filter(move => {
        const details = move.version_group_details.find(detail => 
            detail.move_learn_method.name === 'machine'
        );
        return details !== undefined;
    });
    
    tmMoves.forEach(move => {
        const moveItem = document.createElement('div');
        moveItem.classList.add('move-item');
        
        const name = document.createElement('span');
        name.textContent = capitalizeFirstLetter(move.move.name.replace('-', ' '));
        
        moveItem.appendChild(name);
        tmMovesContainer.appendChild(moveItem);
    });
    
    // Display message if no moves found
    if (levelMoves.length === 0) {
        levelMovesContainer.innerHTML = '<div class="move-item">No hay movimientos por nivel</div>';
    }
    
    if (tmMoves.length === 0) {
        tmMovesContainer.innerHTML = '<div class="move-item">No hay movimientos TM/MT</div>';
    }
}

// Navegación
function navigatePokemon(change) {
    // Asegúrate de que currentPokemonId sea un número
    currentPokemonId = parseInt(currentPokemonId);
    
    // Asegúrate de que change sea un número
    change = parseInt(change);
    
    let newId = currentPokemonId + change;
    
    // Handle wrap-around
    if (newId < 1) newId = MAX_POKEMON;
    if (newId > MAX_POKEMON) newId = 1;
    
    // If filtering, navigate through filtered list
    if (isFiltering && filteredPokemon.length > 0) {
        const currentIndex = filteredPokemon.findIndex(id => id === currentPokemonId);
        let newIndex = currentIndex + (change > 0 ? 1 : -1);
        
        // Handle wrap-around in filtered list
        if (newIndex < 0) newIndex = filteredPokemon.length - 1;
        if (newIndex >= filteredPokemon.length) newIndex = 0;
        
        newId = filteredPokemon[newIndex];
    }
    
    loadPokemon(newId);
}

// Number Pad
function handleNumberPad(e) {
    const value = e.target.dataset.num;
    
    if (value === 'c') {
        // Clear input buffer
        inputBuffer = '';
    } else if (value === 'enter') {
        // Search using current buffer
        if (inputBuffer) {
            loadPokemon(parseInt(inputBuffer));
        }
    } else {
        // Add digit to buffer (max 4 digits)
        if (inputBuffer.length < 4) {
            inputBuffer += value;
        }
    }
    
    // Update display
    updateNumberDisplay(inputBuffer);
}

function updateNumberDisplay(value) {
    document.getElementById('number-display').textContent = value.padStart(3, ' ');
}

// Cambio entre pantallas
function toggleStatsDisplay() {
    const mainDisplay = document.getElementById('main-display');
    const statsDisplay = document.getElementById('stats-display');
    
    if (mainDisplay.style.display !== 'none') {
        mainDisplay.style.display = 'none';
        statsDisplay.style.display = 'block';
        statsDisplay.classList.add('fadeIn');
    } else {
        statsDisplay.style.display = 'none';
        mainDisplay.style.display = 'block';
        mainDisplay.classList.add('fadeIn');
    }
}

// Filtro por tipo
async function applyFilter() {
    if (!currentFilterType) {
        clearFilter();
        return;
    }
    
    try {
        const response = await fetch(`https://pokeapi.co/api/v2/type/${currentFilterType}`);
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
    // Reset filter variables
    isFiltering = false;
    filteredPokemon = [];
    
    // Reset selected type buttons
    document.querySelectorAll('.type-button').forEach(b => b.classList.remove('selected'));
    currentFilterType = '';
    
    // Stay on current Pokémon
    loadPokemon(currentPokemonId);
}

// Funciones auxiliares
function getIdFromUrl(url) {
    const parts = url.split('/');
    return parseInt(parts[parts.length - 2]);
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function showError(message) {
    // Simple error display
    alert(message);
}

// Traducción de términos
function translateType(type) {
    const typeTranslations = {
        'normal': 'Normal',
        'fire': 'Fuego',
        'water': 'Agua',
        'electric': 'Eléctrico',
        'grass': 'Planta',
        'ice': 'Hielo',
        'fighting': 'Lucha',
        'poison': 'Veneno',
        'ground': 'Tierra',
        'flying': 'Volador',
        'psychic': 'Psíquico',
        'bug': 'Bicho',
        'rock': 'Roca',
        'ghost': 'Fantasma',
        'dragon': 'Dragón',
        'dark': 'Siniestro',
        'steel': 'Acero',
        'fairy': 'Hada'
    };
    
    return typeTranslations[type.toLowerCase()] || type;
}

function translateStatName(stat) {
    const statTranslations = {
        'hp': 'PS',
        'attack': 'Ataque',
        'defense': 'Defensa',
        'special-attack': 'At. Esp.',
        'special-defense': 'Def. Esp.',
        'speed': 'Velocidad'
    };
    
    return statTranslations[stat] || stat;
}