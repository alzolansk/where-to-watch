<?php
include_once('config.php');

try {
    $pdo = new PDO("mysql:host=$host;dbname=$database", $usuario, $senha);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Recebe os dados JSON
    $data = json_decode(file_get_contents("php://input"), true);

    $title = $data['title'];
    $idTmdb = $data['idTmdb'];
    $genre = $data['genre'];
    $poster = $data['poster'];
    $mediaType = (int) $data['media_type']; // Capturando media_type (1 para filme, 2 para série)

    // Inserir dados no banco de dados
    $stmt = $pdo->prepare("INSERT INTO items (title_item, tmdb_id, genre, img_url, type_item) VALUES (:title, :idTmdb, :genre, :poster, :medyaType)");
    $stmt->bindParam(':title', $title);
    $stmt->bindParam(':idTmdb', $idTmdb);
    $stmt->bindParam(':genre', $genre);
    $stmt->bindParam(':poster', $poster);
    $stmt->bindParam(':media_type', $mediaType);  // media_type como 1 ou 2
    
    if ($stmt->execute()) {
        echo json_encode(['success' => true]);
    } else {
        echo json_encode(['success' => false]);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
