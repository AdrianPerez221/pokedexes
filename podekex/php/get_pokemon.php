<?php
require 'db.php';
header('Content-Type: application/json');

// Verificar parámetro
$identifier = $_GET['id'] ?? '';

if (empty($identifier)) {
    http_response_code(400);
    die(json_encode(["error" => "Se requiere ID o nombre"]));
}

// Consulta SQL ajustada a tu estructura
$sql = "SELECT 
            id,
            nombre as name,
            altura as height,
            peso as weight,
            imagen as sprite_url,
            tipo as primary_type,
            tipo_secundario as secondary_type,
            hp,
            ataque_e as attack,
            defensa_e as defense,
            velocidad as speed
        FROM Pokemon 
        WHERE id = ? OR nombre = ?";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $identifier, $identifier);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    die(json_encode(["error" => "Pokémon no encontrado"]));
}

$pokemon = $result->fetch_assoc();

// Procesar tipos
$types = [];
$types[] = ['type' => ['name' => $pokemon['primary_type']]];
if (!empty($pokemon['secondary_type'])) {
    $types[] = ['type' => ['name' => $pokemon['secondary_type']]];
}

// Procesar stats
$stats = [
    ['stat' => ['name' => 'hp'], 'base_stat' => $pokemon['hp']],
    ['stat' => ['name' => 'attack'], 'base_stat' => $pokemon['attack']],
    ['stat' => ['name' => 'defense'], 'base_stat' => $pokemon['defense']],
    ['stat' => ['name' => 'speed'], 'base_stat' => $pokemon['speed']]
];

// Formatear respuesta
$response = [
    'id' => $pokemon['id'],
    'name' => $pokemon['name'],
    'height' => $pokemon['height'],
    'weight' => $pokemon['weight'],
    'sprites' => [
        'front_default' => $pokemon['sprite_url']
    ],
    'types' => $types,
    'stats' => $stats
];

echo json_encode($response);

$conn->close();
?>