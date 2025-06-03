<?php

include_once('config/config.php');

$error_message = "";
$title_error = "";

if (isset($_POST['submit'])){

  $nome = $_POST['nome'];
  $email = $_POST['email'];
  $senha = $_POST['senha'];
  $confirm_senha = $_POST['confirmasenha'];
  $phonenumber = $_POST['phone'];

  $stmt = $conexao->prepare("SELECT id_user FROM tb_users WHERE email_user = ?");
  $stmt->bind_param("s", $email);
  $stmt->execute();
  $stmt->store_result();

  if ($stmt->num_rows > 0) {
    $title_error = "Usuário existente";
    $error_message = "Este e-mail já está cadastrado no where you Watch. Gostaria de realizar login? <a href=\"login.php\">Clique aqui</a>";
  } else if(empty($nome) || empty($senha) || empty($email)|| empty($phonenumber)){
    $title_error = "Campos vazios";
    $error_message = "Preencha todos os campos";
  } else if($senha !== $confirm_senha){
    $title_error = "Senhas diferentes";
    $error_message = "Senhas diferentes, insira a confimação de senha exatamente como a que você inseriu no campo \"Senha\"";
  } else{

  $hashed_password = password_hash($senha, PASSWORD_DEFAULT);

  $insert_stmt = $conexao->prepare("INSERT INTO tb_users (name_user, email_user, pswd_user, phone_number) VALUES (?, ?, ?, ?)");
  $insert_stmt->bind_param("ssss", $nome, $email, $senha, $phonenumber);
  
  if ($insert_stmt->execute()) {
    echo "Usuário cadastrado com sucesso!";
    header("Location: login.php");
    exit();
} else {
    $error_message = "Erro ao cadastrar: " . $stmt->error;
}

$stmt->close();
$conexao->close();

}  
}

?>

<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@4.5.3/dist/css/bootstrap.min.css" integrity="sha384-TX8t27EcRE3e/ihU7zmQxVncDAy5uIKz4rEkgIXeMed4M0jlfIDPvg6uqKI2xXr2" crossorigin="anonymous">
    <link rel="stylesheet" href="css/new-login.css">
    <title>Sign in with IMDb</title>
</head>
<body>  
  <div class="login-container">
    <div class="left-login">
      <div class="logo-div">
        <a href="index.php" class="home-header">
          <h2 class="logo-h2">
            <span class="logo-font">where you</span>
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
        <form action="new-login.php" method="POST">
          <hgroup>
            <h3> Criar conta </h3>
          </hgroup>

          <label for="name"> <b> Nome </b></label>
          <input type="text" name="nome" id="nome">

          <label for="email"><b> Email </b></label>
          <input type="text" name="email" id="email">

          <label for="phoneNumber"><b> Número de telefone </b></label>
          <input type="number" name="phone" id="phone">

          <label for="password"><b> Password </b></label>
          <input type="password" name="senha" id="senha">

          <label for="password"><b> Confirme a senha </b></label>
          <input type="password" name="confirmasenha" id="confirma_senha">

          <li class="accountExist">Ja tem uma conta?<a href="login.php"> Clique aqui</a></li></ul>

          <input type="submit" value="Sign in" name="submit" id="submit">
          
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
   loginInvalidDialog.close(); 
});

</script>

</html>