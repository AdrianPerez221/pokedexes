// Variables globales
let currentPokemonId = 1;

// Elementos DOM
document.addEventListener('DOMContentLoaded', () => {
    loadPokemon(currentPokemonId);
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('prev-pokemon').addEventListener('click', () => navigatePokemon(-1));
    document.getElementById('next-pokemon').addEventListener('click', () => navigatePokemon(1));
}

async function loadPokemon(id) {
    try {
        const response = await fetch(`../php/get_pokemon.php?id=${id}`);
        if (!response.ok) throw new Error('Pokémon no encontrado');
        
        const pokemonData = await response.json();
        updateDisplay(pokemonData);
        
    } catch (error) {
        console.error('Error:', error);
        alert(error.message);
    }
}

function updateDisplay(Pokemon) {
    // Actualizar imagen
    document.getElementById('pokemon-image').src = Pokemon.sprite;
    
    // Actualizar texto
    document.getElementById('pokemon-id').textContent = `#${Pokemon.id.toString().padStart(3, '0')}`;
    document.getElementById('pokemon-name').textContent = Pokemon.nombre.toUpperCase();
    document.getElementById('pokemon-height').textContent = `${Pokemon.peso / 10}m`;
    document.getElementById('pokemon-weight').textContent = `${Pokemon.altura / 10}kg`;
    
    // Actualizar tipos
    const typesContainer = document.getElementById('types-container');
    typesContainer.innerHTML = '';
    Pokemon.tipo.forEach(tipo => {
        const typeElement = document.createElement('span');
        typeElement.className = `type ${tipo}`;
        typeElement.textContent = translateType(tipo);
        typesContainer.appendChild(typeElement);
    });
}

// Función de traducción simplificada
function translateType(type) {
    const types = {
        'fire': 'Fuego', 'water': 'Agua', 'grass': 'Planta',
        'electric': 'Eléctrico', 'normal': 'Normal', 'fighting': 'Lucha',
        'poison': 'Veneno', 'ground': 'Tierra', 'flying': 'Volador',
        'psychic': 'Psíquico', 'bug': 'Bicho', 'rock': 'Roca',
        'ghost': 'Fantasma', 'dragon': 'Dragón', 'dark': 'Siniestro',
        'steel': 'Acero', 'fairy': 'Hada', 'ice': 'Hielo'
    };
    return types[tipo] || tipo;
}

// Navegación
function navigatePokemon(change) {
    currentPokemonId = Math.max(1, currentPokemonId + change);
    loadPokemon(currentPokemonId);
}

