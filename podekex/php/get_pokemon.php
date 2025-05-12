<?php
require 'db.php';
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$identifier = $_GET['id'] ?? '';

if (empty($identifier)) {
    http_response_code(400);
    die(json_encode(["error" => "ID or name required"]));
}

// Consulta SQL ajustada
$sql = "SELECT * FROM Pokemon;";

$stmt = $conn->prepare($sql);
$stmt->bind_param("ss", $identifier, $identifier);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    die(json_encode(["error" => "Pokémon no encontrado"]));
}

$pokemon = $result->fetch_assoc();

// Estructura de respuesta simplificada
$response = [
    'id' => $pokemon['id'],
    'nombre' => $pokemon['name'],
    'altura' => $pokemon['height'],
    'peso' => $pokemon['weight'],
    'sprite' => $pokemon['sprite_url'],
    'tipo' => explode(',', $pokemon['types'])
];

echo json_encode($response);

$conn->close();
?>