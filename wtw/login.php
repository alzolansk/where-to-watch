<?php
session_start();
include_once('config.php');

if(isset($_POST['submit'])) {

  $email = $_POST['email'];
  $senha = $_POST['senha'];

  $stmt = $conexao->prepare("SELECT idUser, nameUser, pswdUser FROM users WHERE emailUser = ?");
  $stmt->bind_param("s", $email);
  $stmt->execute();
  $stmt->store_result();

  // Verifica se o usuário foi encontrado
  if ($stmt->num_rows > 0) {
    $stmt->bind_result($id, $nome, $hashed_password);
    $stmt->fetch();

    if (password_verify($senha, $hashed_password)) {
      $_SESSION['id'] = $id;
      $_SESSION['nome'] = $nome;

      echo "Login realizado com sucesso!";
      header("Location: index.php"); 
      exit();
    } else {
      echo "Senha incorreta.";
    }
  } else {
    echo "Usuário não encontrado.";
  }

  $stmt->close();
  $conexao->close();
} 

?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="stylesheet" href="login.css">
    <title>Sign in with IMDb</title>
</head>
<body>

    <li><a href="index.php"> <img src="imagens/imdb_logo.png" class="logo"> </a></li>

   <div class="form">
      <form action="login.php" method="POST">
        <hgroup>
          <h3>Sign in</h3>
        </hgroup>

        <label for="email"><b> Email </b></label>
        <input type="text" name="email" id="email">
        <br>

        <label for="password"><b> Password </b></label>
        <input type="password" name="senha" id="senha">

        <input type="submit" value="Sign in" name="submit" id="submit">

   <div class="new-account">
        <p>Novo no Where To Watch?</p>

        <ul class="create-account">
        <li><a href="new-login.php">Crie uma nova conta</a></li></ul>
   </div>
  </form>
  </div>

</body>
</html>