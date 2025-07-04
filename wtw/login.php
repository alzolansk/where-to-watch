<?php
session_start();
include_once('config/config.php');

$error_message = "";
$user_not_found = false; // Usuário não encontrado
$title_error = "";

if(isset($_POST['submit'])) {

  $email = $_POST['email'];
  $senha = $_POST['senha'];

  $stmt = $conexao->prepare("SELECT id_user, name_user, pswd_user FROM tb_users WHERE email_user = ?");
  $stmt->bind_param("s", $email);
  $stmt->execute();
  $stmt->store_result();

  // Verifica se o usuário foi encontrado
  if ($stmt->num_rows > 0) {
    $stmt->bind_result($id, $nome, $senha);
    $stmt->fetch();

    if ($senha) {
      $_SESSION['id'] = $id;
      $_SESSION['nome'] = $nome;

      echo "Login realizado com sucesso!";
      header("Location: index.php"); 
      exit();
    } else {
      $error_message = "Senha incorreta.";
    }
  } else {
    $title_error = "Usúario Inexistente";
    $error_message = "Usuário não existe no where you WATCH. <br> Crie uma conta <a href='new-login.php'>aqui.</a>";
    $user_not_found = true; // Usuário não encontrado
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
    <link rel="stylesheet" href="css/login.css">
    <title>Sign in with IMDb</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">

</head>
<body>
  <div class="login-container">
      <div class="left-login">
        <div class="logo-div">
          <a href="index.php" class="home-header">
            <h2 class="logo">             
              <span class="logo-font">where</span>
              <span class="logo-font-y"> y </span>
              <img src="imagens/eye-icon2.svg" alt="o" class="logo-eye" />
              <span class="logo-font">u</span>
              <span class="logo-font2">WATCH</span>
            </h2>
          </a>
        </div>
      </div>

      <dialog id="loginInvalid">
        <p class="titleError"><?php echo $title_error; ?></p>
        <div class="divider"></div>
        <p id="errorMessage"><?php echo $error_message; ?></p>
        <button id="closeDialog">Fechar</button>
      </dialog>

    <div class="right-login">

      <div class="form">
          <form action="login.php" method="POST">
            <hgroup>
              <h3 class="login-label">Entrar no Where You Watch</h3>
            </hgroup>

            <label for="email"><b> Email </b></label>
            <input type="text" name="email" id="email">
            <br>

            <label for="password"><b> Password </b></label>
            <input type="password" name="senha" id="senha">

            <input type="submit" value="Log in" name="submit" id="submit">

            <div class="new-account">
              <p>Novo no where you Watch</p>

              <ul class="create-account">
              <li><a href="new-login.php">Crie uma nova conta</a></li></ul>
            </div>
          </form>
      </div>
    </div>
</div>

</body>

<script>
  
//Erro de login

const loginInvalidDialog = document.getElementById("loginInvalid");
const titleErrorElement = document.getElementsByClassName("titleError");
const createAccountElement = document.getElementById("createAccount");
const errorMessageElement = document.getElementById("errorMessage");
const closeDialogButton = document.getElementById("closeDialog");

// Verifica se há mensagem de erro no elemento do modal
if (errorMessageElement.innerText.trim() !== "") {
   console.log("Erro de login");
   loginInvalidDialog.showModal();
}

closeDialogButton.addEventListener("click", function() {
   loginInvalidDialog.removeAttribute('open'); // Remove a classe para resetar o estado
   loginInvalidDialog.remove(); 
   
});

</script>
</html>