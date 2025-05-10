<?php
require 'db.php'; // Incluye tu conexión

$sql = "SELECT * FROM pokemon";
$result = $conn->query($sql);
?>

<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Pokédex</title>
</head>
<body>
    <h1>Lista de Pokémon</h1>
    <ul>
        <?php
        if ($result->num_rows > 0) {
            while($row = $result->fetch_assoc()) {
                echo "<li><strong>" . htmlspecialchars($row['nombre']) . "</strong> - Tipo 1: " . htmlspecialchars($row['tipo1']);
                if (!empty($row['tipo2'])) {
                    echo " / Tipo 2: " . htmlspecialchars($row['tipo2']);
                }
                echo "</li>";
            }
        } else {
            echo "<li>No se encontraron Pokémon.</li>";
        }
        ?>
    </ul>
</body>
</html>
