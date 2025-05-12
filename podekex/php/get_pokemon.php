<?php
require 'db.php';
header('Content-Type: application/json');

// Configuración de la base de datos (cambiar por tus credenciales)
$host = "localhost";
$user = "Manu";
$password = "Palma2006_";
$database = "Pokedex_";

// Crear conexión
$conn = new mysqli($host, $user, $password, $database);

// Verificar conexión
if ($conn->connect_error) {
    http_response_code(500);
    die(json_encode(["error" => "Connection failed: " . $conn->connect_error]));
}

// Obtener parámetro de búsqueda
$identifier = $_GET['id'] ?? '';

if (empty($identifier)) {
    http_response_code(400);
    die(json_encode(["error" => "ID or name required"]));
}

// Consulta SQL (ajusta nombres de tablas y columnas según tu estructura)
$sql = "SELECT p.id, p.name, p.height, p.weight, 
            GROUP_CONCAT(t.type_name) as types,
            p.sprite_url,
            GROUP_CONCAT(s.stat_name, ':', s.base_stat) as stats,
            p.species_id
        FROM pokemon p
        LEFT JOIN pokemon_types pt ON p.id = pt.pokemon_id
        LEFT JOIN types t ON pt.type_id = t.id
        LEFT JOIN stats s ON p.id = s.pokemon_id
        WHERE p.id = ? OR p.name = ?
        GROUP BY p.id";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $identifier, $identifier);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    die(json_encode(["error" => "Pokémon not found"]));
}

$pokemon = $result->fetch_assoc();

// Formatear la respuesta similar a la PokeAPI
$response = [
    'id' => $pokemon['id'],
    'name' => $pokemon['name'],
    'height' => $pokemon['height'],
    'weight' => $pokemon['weight'],
    'sprites' => [
        'front_default' => $pokemon['sprite_url']
    ],
    'types' => array_map(function($type) {
        return ['type' => ['name' => $type]];
    }, explode(',', $pokemon['types'])),
    'stats' => array_map(function($stat) {
        list($name, $base) = explode(':', $stat);
        return ['stat' => ['name' => $name], 'base_stat' => $base];
    }, explode(',', $pokemon['stats'])),
    'species' => ['url' => "get_species.php?id=" . $pokemon['species_id']]
];

echo json_encode($response);

$conn->close();
?>