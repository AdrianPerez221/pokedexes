<?php
require 'db.php';
header('Content-Type: application/json');

$host = "localhost";
$user = "Manu";
$password = "Palma2006_";
$database = "Pokedex_";

// Crear conexión
$conn = new mysqli($host, $user, $password, $database);

$species_id = $_GET['id'] ?? '';

if (empty($species_id)) {
    http_response_code(400);
    die(json_encode(["error" => "Species ID required"]));
}

// Ajustar nombres de tablas y columnas según tu estructura
$sql = "SELECT s.*, 
            GROUP_CONCAT(f.flavor_text) as flavor_text_entries,
            GROUP_CONCAT(g.genus) as genera
        FROM species s
        LEFT JOIN flavor_texts f ON s.id = f.species_id
        LEFT JOIN genera g ON s.id = g.species_id
        WHERE s.id = ?
        GROUP BY s.id";

$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $species_id);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows === 0) {
    http_response_code(404);
    die(json_encode(["error" => "Species not found"]));
}

$species = $result->fetch_assoc();

$response = [
    'id' => $species['id'],
    'evolution_chain' => ['url' => "get_evolution.php?id=" . $species['evolution_chain_id']],
    'flavor_text_entries' => array_map(function($text) {
        return ['flavor_text' => $text, 'language' => ['name' => 'es']];
    }, explode(',', $species['flavor_text_entries'])),
    'genera' => array_map(function($genus) {
        return ['genus' => $genus, 'language' => ['name' => 'es']];
    }, explode(',', $species['genera']))
];

echo json_encode($response);

$conn->close();
?>