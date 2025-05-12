<?php
// Incluir la configuración de la base de datos
require 'db.php';

// Definir la ruta base de la API
$request_uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$endpoint = trim(str_replace('/api.php', '', $request_uri), '/');

// Procesar la solicitud según el endpoint
switch ($endpoint) {
    case 'pokemon':
        // Obtener un Pokémon por ID o nombre
        if (isset($_GET['id']) || isset($_GET['name'])) {
            $id = isset($_GET['id']) ? $_GET['id'] : null;
            $name = isset($_GET['name']) ? $_GET['name'] : null;
            getPokemon($pdo, $id, $name);
        } else {
            // Listar todos los Pokémon (con paginación)
            $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
            $limit = isset($_GET['limit']) ? (int)$_GET['limit'] : 20;
            getAllPokemon($pdo, $page, $limit);
        }
        break;
        
    case 'type':
        // Filtrar Pokémon por tipo
        if (isset($_GET['name'])) {
            getPokemonByType($pdo, $_GET['name']);
        } else {
            sendResponse(400, ['error' => 'Se requiere el nombre del tipo']);
        }
        break;
        
    case 'evolution-chain':
        // Obtener cadena evolutiva
        if (isset($_GET['pokemon_id'])) {
            getEvolutionChain($pdo, $_GET['pokemon_id']);
        } else {
            sendResponse(400, ['error' => 'Se requiere el ID del Pokémon']);
        }
        break;
        
    case 'moves':
        // Obtener movimientos de un Pokémon
        if (isset($_GET['pokemon_id'])) {
            getMoves($pdo, $_GET['pokemon_id']);
        } else {
            sendResponse(400, ['error' => 'Se requiere el ID del Pokémon']);
        }
        break;
        
    case 'search':
        // Buscar Pokémon
        if (isset($_GET['query'])) {
            searchPokemon($pdo, $_GET['query']);
        } else {
            sendResponse(400, ['error' => 'Se requiere un término de búsqueda']);
        }
        break;
        
    default:
        sendResponse(404, ['error' => 'Endpoint no encontrado']);
        break;
}

// Función para obtener un Pokémon por ID o nombre
function getPokemon($pdo, $id = null, $name = null) {
    try {
        $pokemon = [];
        
        if ($id) {
            // Buscar por ID
            $stmt = $pdo->prepare("SELECT * FROM pokemon WHERE id = :id");
            $stmt->bindParam(':id', $id, PDO::PARAM_INT);
        } else if ($name) {
            // Buscar por nombre
            $stmt = $pdo->prepare("SELECT * FROM pokemon WHERE name = :name");
            $stmt->bindParam(':name', $name, PDO::PARAM_STR);
        } else {
            sendResponse(400, ['error' => 'Se requiere un ID o nombre']);
            return;
        }
        
        $stmt->execute();
        $pokemon = $stmt->fetch();
        
        if (!$pokemon) {
            // Si no se encuentra en la base de datos, intentar obtener de PokeAPI
            $apiData = fetchFromPokeAPI($id ?? $name);
            if ($apiData) {
                // Guardar en la base de datos para futuras consultas
                saveToDatabase($pdo, $apiData);
                sendResponse(200, $apiData);
                return;
            } else {
                sendResponse(404, ['error' => 'Pokémon no encontrado']);
                return;
            }
        }
        
        // Obtener tipos
        $stmt = $pdo->prepare("
            SELECT t.name 
            FROM pokemon_types pt
            JOIN types t ON pt.type_id = t.id
            WHERE pt.pokemon_id = :pokemon_id
        ");
        $stmt->bindParam(':pokemon_id', $pokemon['id'], PDO::PARAM_INT);
        $stmt->execute();
        $pokemon['types'] = $stmt->fetchAll();
        
        // Obtener stats
        $stmt = $pdo->prepare("SELECT * FROM stats WHERE pokemon_id = :pokemon_id");
        $stmt->bindParam(':pokemon_id', $pokemon['id'], PDO::PARAM_INT);
        $stmt->execute();
        $pokemon['stats'] = $stmt->fetch();
        
        // Obtener descripción y categoría
        $stmt = $pdo->prepare("SELECT * FROM species WHERE pokemon_id = :pokemon_id");
        $stmt->bindParam(':pokemon_id', $pokemon['id'], PDO::PARAM_INT);
        $stmt->execute();
        $pokemon['species'] = $stmt->fetch();
        
        // Obtener habilidades
        $stmt = $pdo->prepare("
            SELECT a.name, pa.is_hidden
            FROM pokemon_abilities pa
            JOIN abilities a ON pa.ability_id = a.id
            WHERE pa.pokemon_id = :pokemon_id
        ");
        $stmt->bindParam(':pokemon_id', $pokemon['id'], PDO::PARAM_INT);
        $stmt->execute();
        $pokemon['abilities'] = $stmt->fetchAll();
        
        sendResponse(200, $pokemon);
    } catch (PDOException $e) {
        sendResponse(500, ['error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
}

// Función para listar todos los Pokémon con paginación
function getAllPokemon($pdo, $page = 1, $limit = 20) {
    try {
        $offset = ($page - 1) * $limit;
        
        $stmt = $pdo->prepare("
            SELECT id, name, image_url 
            FROM pokemon 
            ORDER BY id 
            LIMIT :limit OFFSET :offset
        ");
        $stmt->bindParam(':limit', $limit, PDO::PARAM_INT);
        $stmt->bindParam(':offset', $offset, PDO::PARAM_INT);
        $stmt->execute();
        
        $pokemon = $stmt->fetchAll();
        
        // Obtener el total de Pokémon para la paginación
        $stmt = $pdo->query("SELECT COUNT(*) FROM pokemon");
        $total = $stmt->fetchColumn();
        
        sendResponse(200, [
            'results' => $pokemon,
            'count' => $total,
            'pages' => ceil($total / $limit),
            'current_page' => $page
        ]);
    } catch (PDOException $e) {
        sendResponse(500, ['error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
}

// Función para filtrar Pokémon por tipo
function getPokemonByType($pdo, $typeName) {
    try {
        $stmt = $pdo->prepare("
            SELECT p.id, p.name, p.image_url 
            FROM pokemon p
            JOIN pokemon_types pt ON p.id = pt.pokemon_id
            JOIN types t ON pt.type_id = t.id
            WHERE t.name = :type_name
            ORDER BY p.id
        ");
        $stmt->bindParam(':type_name', $typeName, PDO::PARAM_STR);
        $stmt->execute();
        
        $pokemon = $stmt->fetchAll();
        
        if (empty($pokemon)) {
            // Si no hay resultados, intentar obtener de PokeAPI
            $apiData = fetchTypeFromPokeAPI($typeName);
            if ($apiData && !empty($apiData['pokemon'])) {
                sendResponse(200, $apiData);
                return;
            } else {
                sendResponse(404, ['error' => 'No se encontraron Pokémon de este tipo']);
                return;
            }
        }
        
        sendResponse(200, ['pokemon' => $pokemon]);
    } catch (PDOException $e) {
        sendResponse(500, ['error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
}

// Función para obtener la cadena evolutiva
function getEvolutionChain($pdo, $pokemonId) {
    try {
        // Primero, encontrar el grupo de cadena evolutiva para este Pokémon
        $stmt = $pdo->prepare("
            SELECT ec.chain_group
            FROM pokemon_evolutions pe
            JOIN evolution_chains ec ON pe.evolution_chain_id = ec.id
            WHERE pe.pokemon_id = :pokemon_id
        ");
        $stmt->bindParam(':pokemon_id', $pokemonId, PDO::PARAM_INT);
        $stmt->execute();
        
        $chainGroup = $stmt->fetchColumn();
        
        if (!$chainGroup) {
            // Si no se encuentra en la base de datos, intentar obtener de PokeAPI
            $apiData = fetchEvolutionChainFromPokeAPI($pokemonId);
            if ($apiData) {
                sendResponse(200, $apiData);
                return;
            } else {
                sendResponse(404, ['error' => 'Cadena evolutiva no encontrada']);
                return;
            }
        }
        
        // Obtener todos los Pokémon en esta cadena evolutiva, ordenados por el orden de evolución
        $stmt = $pdo->prepare("
            SELECT p.id, p.name, p.image_url, pe.evolution_order, pe.evolution_trigger, pe.evolution_condition
            FROM pokemon_evolutions pe
            JOIN evolution_chains ec ON pe.evolution_chain_id = ec.id
            JOIN pokemon p ON pe.pokemon_id = p.id
            WHERE ec.chain_group = :chain_group
            ORDER BY pe.evolution_order
        ");
        $stmt->bindParam(':chain_group', $chainGroup, PDO::PARAM_INT);
        $stmt->execute();
        
        $evolutionChain = $stmt->fetchAll();
        
        sendResponse(200, ['chain' => $evolutionChain]);
    } catch (PDOException $e) {
        sendResponse(500, ['error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
}

// Función para obtener los movimientos de un Pokémon
function getMoves($pdo, $pokemonId) {
    try {
        $stmt = $pdo->prepare("
            SELECT m.name, pm.level_learned, pm.learn_method
            FROM pokemon_moves pm
            JOIN moves m ON pm.move_id = m.id
            WHERE pm.pokemon_id = :pokemon_id
            ORDER BY 
                CASE 
                    WHEN pm.learn_method = 'level-up' THEN 1
                    ELSE 2
                END,
                pm.level_learned
        ");
        $stmt->bindParam(':pokemon_id', $pokemonId, PDO::PARAM_INT);
        $stmt->execute();
        
        $moves = $stmt->fetchAll();
        
        if (empty($moves)) {
            // Si no hay resultados, intentar obtener de PokeAPI
            $apiData = fetchMovesFromPokeAPI($pokemonId);
            if ($apiData) {
                sendResponse(200, $apiData);
                return;
            } else {
                sendResponse(404, ['error' => 'No se encontraron movimientos para este Pokémon']);
                return;
            }
        }
        
        // Organizar los movimientos por método de aprendizaje
        $organizedMoves = [
            'level-up' => [],
            'machine' => []
        ];
        
        foreach ($moves as $move) {
            $organizedMoves[$move['learn_method']][] = $move;
        }
        
        sendResponse(200, $organizedMoves);
    } catch (PDOException $e) {
        sendResponse(500, ['error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
}

// Función para buscar Pokémon
function searchPokemon($pdo, $query) {
    try {
        // Buscar por ID o nombre
        $stmt = $pdo->prepare("
            SELECT id, name, image_url 
            FROM pokemon 
            WHERE id = :query_id OR name LIKE :query_name
            ORDER BY id
            LIMIT 20
        ");
        
        $queryId = is_numeric($query) ? intval($query) : 0;
        $queryName = "%$query%";
        
        $stmt->bindParam(':query_id', $queryId, PDO::PARAM_INT);
        $stmt->bindParam(':query_name', $queryName, PDO::PARAM_STR);
        $stmt->execute();
        
        $results = $stmt->fetchAll();
        
        if (empty($results) && is_numeric($query)) {
            // Si es un número y no se encontró, intentar obtener de PokeAPI
            $apiData = fetchFromPokeAPI(intval($query));
            if ($apiData) {
                // Guardar en la base de datos
                saveToDatabase($pdo, $apiData);
                sendResponse(200, ['results' => [$apiData]]);
                return;
            }
        } else if (empty($results)) {
            // Si es un nombre y no se encontró, intentar obtener de PokeAPI
            $apiData = fetchFromPokeAPI($query);
            if ($apiData) {
                // Guardar en la base de datos
                saveToDatabase($pdo, $apiData);
                sendResponse(200, ['results' => [$apiData]]);
                return;
            }
        }
        
        sendResponse(200, ['results' => $results]);
    } catch (PDOException $e) {
        sendResponse(500, ['error' => 'Error de base de datos: ' . $e->getMessage()]);
    }
}

// Función para obtener datos de la PokeAPI
function fetchFromPokeAPI($idOrName) {
    $url = "https://pokeapi.co/api/v2/pokemon/" . strtolower($idOrName);
    $response = file_get_contents($url);
    
    if ($response === false) {
        return null;
    }
    
    return json_decode($response, true);
}

// Función para obtener datos de tipo de la PokeAPI
function fetchTypeFromPokeAPI($typeName) {
    $url = "https://pokeapi.co/api/v2/type/" . strtolower($typeName);
    $response = file_get_contents($url);
    
    if ($response === false) {
        return null;
    }
    
    return json_decode($response, true);
}

// Función para obtener la cadena evolutiva de la PokeAPI
function fetchEvolutionChainFromPokeAPI($pokemonId) {
    // Primero obtenemos los datos de la especie
    $url = "https://pokeapi.co/api/v2/pokemon-species/" . $pokemonId;
    $response = file_get_contents($url);
    
    if ($response === false) {
        return null;
    }
    
    $speciesData = json_decode($response, true);
    $evolutionChainUrl = $speciesData['evolution_chain']['url'];
    
    // Luego obtenemos la cadena evolutiva
    $response = file_get_contents($evolutionChainUrl);
    
    if ($response === false) {
        return null;
    }
    
    return json_decode($response, true);
}

// Función para obtener los movimientos de la PokeAPI
function fetchMovesFromPokeAPI($pokemonId) {
    $url = "https://pokeapi.co/api/v2/pokemon/" . $pokemonId;
    $response = file_get_contents($url);
    
    if ($response === false) {
        return null;
    }
    
    $pokemonData = json_decode($response, true);
    return ['moves' => $pokemonData['moves']];
}

// Función para guardar datos de un Pokémon en la base de datos
function saveToDatabase($pdo, $pokemonData) {
    try {
        // Iniciar transacción
        $pdo->beginTransaction();
        
        // 1. Insertar datos básicos del Pokémon
        $stmt = $pdo->prepare("
            INSERT INTO pokemon (id, name, height, weight, image_url)
            VALUES (:id, :name, :height, :weight, :image_url)
            ON DUPLICATE KEY UPDATE 
                name = :name,
                height = :height,
                weight = :weight,
                image_url = :image_url
        ");
        
        $imageUrl = $pokemonData['sprites']['front_default'] ?? null;
        
        $stmt->bindParam(':id', $pokemonData['id'], PDO::PARAM_INT);
        $stmt->bindParam(':name', $pokemonData['name'], PDO::PARAM_STR);
        $stmt->bindParam(':height', $pokemonData['height'], PDO::PARAM_INT);
        $stmt->bindParam(':weight', $pokemonData['weight'], PDO::PARAM_INT);
        $stmt->bindParam(':image_url', $imageUrl, PDO::PARAM_STR);
        $stmt->execute();
        
        // 2. Insertar tipos
        foreach ($pokemonData['types'] as $typeInfo) {
            $typeName = $typeInfo['type']['name'];
            
            // Verificar si el tipo ya existe
            $stmt = $pdo->prepare("SELECT id FROM types WHERE name = :name");
            $stmt->bindParam(':name', $typeName, PDO::PARAM_STR);
            $stmt->execute();
            $typeId = $stmt->fetchColumn();
            
            // Si no existe, insertarlo
            if (!$typeId) {
                $stmt = $pdo->prepare("INSERT INTO types (name) VALUES (:name)");
                $stmt->bindParam(':name', $typeName, PDO::PARAM_STR);
                $stmt->execute();
                $typeId = $pdo->lastInsertId();
            }
            
            // Relacionar Pokémon con tipo
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO pokemon_types (pokemon_id, type_id)
                VALUES (:pokemon_id, :type_id)
            ");
            $stmt->bindParam(':pokemon_id', $pokemonData['id'], PDO::PARAM_INT);
            $stmt->bindParam(':type_id', $typeId, PDO::PARAM_INT);
            $stmt->execute();
        }
        
        // 3. Insertar stats
        $stmt = $pdo->prepare("
            INSERT INTO stats (pokemon_id, hp, attack, defense, special_attack, special_defense, speed)
            VALUES (:pokemon_id, :hp, :attack, :defense, :special_attack, :special_defense, :speed)
            ON DUPLICATE KEY UPDATE
                hp = :hp,
                attack = :attack,
                defense = :defense,
                special_attack = :special_attack,
                special_defense = :special_defense,
                speed = :speed
        ");
        
        $hp = $attack = $defense = $spAtk = $spDef = $speed = 0;
        
        foreach ($pokemonData['stats'] as $stat) {
            switch ($stat['stat']['name']) {
                case 'hp': $hp = $stat['base_stat']; break;
                case 'attack': $attack = $stat['base_stat']; break;
                case 'defense': $defense = $stat['base_stat']; break;
                case 'special-attack': $spAtk = $stat['base_stat']; break;
                case 'special-defense': $spDef = $stat['base_stat']; break;
                case 'speed': $speed = $stat['base_stat']; break;
            }
        }
        
        $stmt->bindParam(':pokemon_id', $pokemonData['id'], PDO::PARAM_INT);
        $stmt->bindParam(':hp', $hp, PDO::PARAM_INT);
        $stmt->bindParam(':attack', $attack, PDO::PARAM_INT);
        $stmt->bindParam(':defense', $defense, PDO::PARAM_INT);
        $stmt->bindParam(':special_attack', $spAtk, PDO::PARAM_INT);
        $stmt->bindParam(':special_defense', $spDef, PDO::PARAM_INT);
        $stmt->bindParam(':speed', $speed, PDO::PARAM_INT);
        $stmt->execute();
        
        // 4. Insertar habilidades
        foreach ($pokemonData['abilities'] as $abilityInfo) {
            $abilityName = $abilityInfo['ability']['name'];
            $isHidden = $abilityInfo['is_hidden'] ? 1 : 0;
            
            // Verificar si la habilidad ya existe
            $stmt = $pdo->prepare("SELECT id FROM abilities WHERE name = :name");
            $stmt->bindParam(':name', $abilityName, PDO::PARAM_STR);
            $stmt->execute();
            $abilityId = $stmt->fetchColumn();
            
            // Si no existe, insertarla
            if (!$abilityId) {
                $stmt = $pdo->prepare("INSERT INTO abilities (name) VALUES (:name)");
                $stmt->bindParam(':name', $abilityName, PDO::PARAM_STR);
                $stmt->execute();
                $abilityId = $pdo->lastInsertId();
            }
            
            // Relacionar Pokémon con habilidad
            $stmt = $pdo->prepare("
                INSERT IGNORE INTO pokemon_abilities (pokemon_id, ability_id, is_hidden)
                VALUES (:pokemon_id, :ability_id, :is_hidden)
                ON DUPLICATE KEY UPDATE is_hidden = :is_hidden
            ");
            $stmt->bindParam(':pokemon_id', $pokemonData['id'], PDO::PARAM_INT);
            $stmt->bindParam(':ability_id', $abilityId, PDO::PARAM_INT);
            $stmt->bindParam(':is_hidden', $isHidden, PDO::PARAM_BOOL);
            $stmt->execute();
        }
        
        // 5. Insertar movimientos
        foreach ($pokemonData['moves'] as $moveInfo) {
            $moveName = $moveInfo['move']['name'];
            
            // Verificar si el movimiento ya existe
            $stmt = $pdo->prepare("SELECT id FROM moves WHERE name = :name");
            $stmt->bindParam(':name', $moveName, PDO::PARAM_STR);
            $stmt->execute();
            $moveId = $stmt->fetchColumn();
            
            // Si no existe, insertarlo
            if (!$moveId) {
                $stmt = $pdo->prepare("INSERT INTO moves (name) VALUES (:name)");
                $stmt->bindParam(':name', $moveName, PDO::PARAM_STR);
                $stmt->execute();
                $moveId = $pdo->lastInsertId();
            }
            
            // Procesar versiones del movimiento
            foreach ($moveInfo['version_group_details'] as $versionDetail) {
                $learnMethod = $versionDetail['move_learn_method']['name'];
                $levelLearned = $versionDetail['level_learned_at'];
                
                // Solo nos interesan los métodos level-up y machine
                if ($learnMethod !== 'level-up' && $learnMethod !== 'machine') {
                    continue;
                }
                
                // Relacionar Pokémon con movimiento
                $stmt = $pdo->prepare("
                    INSERT IGNORE INTO pokemon_moves 
                    (pokemon_id, move_id, level_learned, learn_method)
                    VALUES (:pokemon_id, :move_id, :level_learned, :learn_method)
                    ON DUPLICATE KEY UPDATE 
                        level_learned = :level_learned
                ");
                $stmt->bindParam(':pokemon_id', $pokemonData['id'], PDO::PARAM_INT);
                $stmt->bindParam(':move_id', $moveId, PDO::PARAM_INT);
                $stmt->bindParam(':level_learned', $levelLearned, PDO::PARAM_INT);
                $stmt->bindParam(':learn_method', $learnMethod, PDO::PARAM_STR);
                $stmt->execute();
                
                // Para simplificar, solo guardamos la primera versión encontrada de cada método
                break;
            }
        }
        
        // Confirmar transacción
        $pdo->commit();
        return true;
    } catch (PDOException $e) {
        // Revertir cambios en caso de error
        $pdo->rollBack();
        error_log('Error guardando Pokémon en base de datos: ' . $e->getMessage());
        return false;
    }
}

// Función para enviar respuesta JSON
function sendResponse($statusCode, $data) {
    http_response_code($statusCode);
    echo json_encode($data);
    exit;
}