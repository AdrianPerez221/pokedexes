<?php
require 'db.php';
header('Content-Type: application/json');

$host = "localhost";
$user = "Manu";
$password = "Palma2006_";
$database = "Pokedex_";

// Crear conexión
$conn = new mysqli($host, $user, $password, $database);
$type = $_GET['type'] ?? '';

// Consulta para Pokémon por tipo
$sql = "SELECT p.id 
        FROM pokemon p
        JOIN pokemon_types pt ON p.id = pt.pokemon_id
        JOIN types t ON pt.type_id = t.id
        WHERE t.type_name = ?";

// ... ejecutar consulta y devolver resultados

echo json_encode(['pokemon' => array_map(function($id) {
    return ['pokemon' => ['url' => "../php/get_pokemon.php?id=$id"]];
}, $results)]);

$conn->close();
?>