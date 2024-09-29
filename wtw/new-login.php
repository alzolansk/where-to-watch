<?php

include_once('config.php');

if (isset($_POST['submit'])){

  $nome = $_POST['nome'];
  $email = $_POST['email'];
  $senha = $_POST['senha'];
  $confirm_senha = $_POST['confirmasenha'];

  $hashed_password = password_hash($senha, PASSWORD_DEFAULT);

  $stmt = $conexao->prepare("INSERT INTO users (nameuser, emailuser, pswdUser) VALUES (?, ?, ?)");
  $stmt->bind_param("sss", $nome, $email, $hashed_password);
  
  if ($stmt->execute()) {
    echo "Usuário cadastrado com sucesso!";
    header("Location: login.php");
    exit();
} else {
    echo "Erro ao cadastrar: " . $stmt->error;
}

/*  if($senha !== $confirm_senha){
    echo "Senhas diferentes";
  } else{
    $res = mysqli_query($conexao, "INSERT INTO users(nameUser, emailUser, pswdUser) VALUES ('$nome', '$email', '$senha')");

    header("Location: login.php");
    
*/

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
      <form action="new-login.php" method="POST">
        <hgroup>
          <h3> Criar conta </h3>
        </hgroup>

        <label for="name"> <b> Nome </b></label>
        <input type="text" name="nome" id="nome">

        <label for="email"><b> Email </b></label>
        <input type="text" name="email" id="email">
        <br>

        <label for="password"><b> Password </b></label>
        <input type="password" name="senha" id="senha">

        <label for="password"><b> Confirme a senha </b></label>
        <input type="password" name="confirmasenha" id="confirmasenha">

        <input type="submit" value="Sign in" name="submit" id="submit">
        
  </form>
  </div>

</body>
</html>