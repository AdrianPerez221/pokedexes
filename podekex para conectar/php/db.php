<?php
$host = "localhost";
$user = "";
$password = "";
$database = "";
// usuario en la base de datos
$conn = new mysql($host, $user, $password, $database);

if($conn->connect_error){
    die("Error de conexión: " . $conn->connect_error);
}
?>