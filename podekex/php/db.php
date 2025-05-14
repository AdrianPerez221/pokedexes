<?php
$host = "localhost";
$user = "Manu";
$password = "Palma2006_";
$database = "Pokedex_";


$conn = new mysqli($host, $user, $password, $database);
if ($conn->connect_error) {
    header('Content-Type: application/json');
    echo json_encode(["error" => "Error de conexión: " . $conn->connect_error]);
    exit;
}


$id = isset($_GET['id']) ? intval($_GET['id']) : 0;


$sql = "SELECT imagen, tipo, tipo_secundario, nombre, id, descripcion, altura, peso, hp, ataque_f, ataque_e, defensa_f, defensa_e, velocidad FROM Pokemon WHERE id = $id";
$result = $conn->query($sql);

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
        "hp" => $row['hp'],
        "ataque_f" => $row['ataque_f'],
        "ataque_e" => $row['ataque_e'],
        "defensa_f" => $row['defensa_f'],
        "defensa_e" => $row['defensa_e'],
        "velocidad" => $row['velocidad'],
        "descripcion" => $row['descripcion'],
    ]);
} else {
    echo json_encode(["error" => "No se encontró el Pokemon"]);
}

$conn->close();
?>