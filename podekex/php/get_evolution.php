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

$chain_id = $_GET['id'] ?? '';

// Consulta para obtener la cadena evolutiva
$sql = "SELECT * FROM evolution_chains WHERE id = ?";
// ... (similar a las anteriores, implementar según tu estructura de evoluciones)

// Devuelve el formato esperado por el JavaScript
echo json_encode($evolution_data);

$conn->close();
?>