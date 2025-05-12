<?php
$host = "localhost";
$user = "Manu";
$password = "Palma2006_";
$database = "Pokedex_";
// usuario en la base de datos
$conn = new mysqli($host, $user, $password, $database);

if($conn->connect_error){
    die("Error de conexión: " . $conn->connect_error);
}
var_dump("hola");
?>