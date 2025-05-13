<?php
$host = "localhost";
$user = "Manu";
$password = "Palma2006_";
$database = "Pokedex_";

// Conexión a la base de datos
$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    header('Content-Type: application/json');
    echo json_encode(["error" => "Error de conexión: " . $conn->connect_error]);
    exit;
}

// Obtener ID del Pokémon solicitado
$id = isset($_GET['id']) ? intval($_GET['id']) : 0;

// Consulta para obtener datos del Pokémon
$sql = "SELECT imagen, tipo, tipo_secundario, nombre, id, altura, peso FROM Pokemon WHERE id = $id";
$result = $conn->query($sql);

// Devolver resultados
header('Content-Type: application/json');

if ($result && $row = $result->fetch_assoc()) {
    echo json_encode([
        "id" => $row['id'],
        "nombre" => $row['nombre'],
        "tipo" => $row['tipo'],
        "tipo_secundario" => $row['tipo_secundario'],
        "imagen" => $row['imagen'],
        "altura" => $row['altura'],
        "peso" => $row['peso'],
    ]);
} else {
    echo json_encode(["error" => "No se encontró el Pokemon"]);
}

$conn->close();
?>