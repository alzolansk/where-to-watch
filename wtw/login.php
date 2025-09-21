<?php
session_start();
include_once('config/config.php');

$error_message = "";
$user_not_found = false;
$title_error = "";

if (isset($_POST['submit'])) {
  $email = filter_input(INPUT_POST, 'email', FILTER_VALIDATE_EMAIL);
  $senha_digitada = $_POST['senha'];

  if (!$email) {
    $error_message = "Email inválido.";
  } else {
    $stmt = $conexao->prepare("SELECT id_user, name_user, pswd_user FROM tb_users WHERE email_user = ?");
    $stmt->bind_param("s", $email);
    $stmt->execute();
    $stmt->store_result();

    if ($stmt->num_rows > 0) {
      $stmt->bind_result($id, $nome, $senha_hash);
      $stmt->fetch();

      if (password_verify($senha_digitada, $senha_hash)) {
        $_SESSION['id'] = $id;
        $_SESSION['nome'] = $nome;

        header("Location: index.php");
        exit();
      } else {
        $error_message = "Senha incorreta.";
      }
    } else {
      $title_error = "Usuário inexistente";
      $error_message = "Usuário não existe no where you WATCH. <br> Crie uma conta <a href='new-login.php'>aqui.</a>";
      $user_not_found = true;
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
    <title>Entrar - Where You Watch</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/login.css">
</head>
<body class="login-body">
    <dialog id="loginInvalid" class="alert-dialog">
        <div class="dialog-content">
            <p class="dialog-title"><?php echo $title_error; ?></p>
            <div class="dialog-message"><?php echo $error_message; ?></div>
            <button type="button" class="dialog-button" id="closeDialog">Fechar</button>
        </div>
    </dialog>

    <div class="login-page">
        <div class="login-shell">
            <a href="index.php" class="wyw-brand wyw-brand--badge wyw-brand--lg login-logo" aria-label="Ir para a página inicial">
                <span class="wyw-brand__where">where</span>
                <span class="wyw-brand__where wyw-brand__where--y">y</span>
                <img src="imagens/eye-icon2.svg" alt="o" class="wyw-brand__eye" />
                <span class="wyw-brand__where wyw-brand__where--u">u</span>
                <span class="wyw-brand__watch">WATCH</span>
            </a>

            <div class="login-card">
                <div class="card-header">
                    <h1 class="card-title">Entrar</h1>
                    <p class="card-subtitle">Acesse sua conta e continue descobrindo onde assistir.</p>
                </div>

                <form action="login.php" method="POST" class="login-form">
                    <div class="input-group">
                        <label for="email">Email</label>
                        <input type="email" name="email" id="email" class="input-control" placeholder="usuario@gmail.com" value="<?php echo isset($_POST['email']) ? htmlspecialchars($_POST['email'], ENT_QUOTES, 'UTF-8') : ''; ?>" required>
                    </div>

                    <div class="input-group">
                        <label for="senha">Senha</label>
                        <div class="password-field">
                            <input type="password" name="senha" id="senha" class="input-control" placeholder="Digite sua senha" required>
                            <button type="button" class="password-toggle" id="togglePassword" aria-label="Mostrar senha">
                                <svg class="icon-eye icon-eye-show" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"></path>
                                    <circle cx="12" cy="12" r="3"></circle>
                                </svg>
                                <svg class="icon-eye icon-eye-hide" viewBox="0 0 24 24" aria-hidden="true">
                                    <path d="M17.94 17.94A10.94 10.94 0 0 1 12 19c-7 0-11-7-11-7s4-7 11-7a10.94 10.94 0 0 1 5.94 1.94"></path>
                                    <path d="M10.73 6.12A10.94 10.94 0 0 1 12 5c7 0 11 7 11 7a21.82 21.82 0 0 1-4.06 5.94"></path>
                                    <line x1="1" y1="1" x2="23" y2="23"></line>
                                    <path d="M9.53 9.53a3.5 3.5 0 0 0 4.94 4.94"></path>
                                </svg>
                            </button>
                        </div>
                    </div>

                    <div class="login-options">
                        <label class="remember-option">
                            <input type="checkbox" name="remember" id="remember">
                            <span>Lembrar-me</span>
                        </label>
                        <a href="#" class="link-muted">Esqueci minha senha</a>
                    </div>

                    <button type="submit" value="Log in" name="submit" id="submit" class="login-primary">Entrar</button>

                    <div class="create-account">
                        <span>Ainda não tem conta?</span>
                        <a href="new-login.php" class="link-accent">Criar conta</a>
                    </div>

                    <p class="terms-note">
                        Ao continuar, você concorda com os <a href="#">Termos de uso</a> e com a <a href="#">Política de privacidade</a>.
                    </p>
                </form>
            </div>
        </div>

        <footer class="login-footer">
            <nav class="footer-links" aria-label="Links institucionais">
                <a href="#">Termos</a>
                <a href="#">Privacidade</a>
                <a href="#">Suporte</a>
            </nav>
        </footer>
    </div>

    <script>
        const loginInvalidDialog = document.getElementById('loginInvalid');
        const errorMessageElement = document.querySelector('.dialog-message');
        const closeDialogButton = document.getElementById('closeDialog');
        const togglePasswordButton = document.getElementById('togglePassword');
        const passwordInput = document.getElementById('senha');

        if (errorMessageElement && errorMessageElement.textContent.trim() !== '') {
            loginInvalidDialog.showModal();
        }

        if (closeDialogButton) {
            closeDialogButton.addEventListener('click', () => {
                loginInvalidDialog.close();
            });
        }

        if (loginInvalidDialog) {
            loginInvalidDialog.addEventListener('cancel', (event) => {
                event.preventDefault();
                loginInvalidDialog.close();
            });
        }

        if (togglePasswordButton && passwordInput) {
            togglePasswordButton.addEventListener('click', () => {
                const shouldReveal = passwordInput.type === 'password';
                passwordInput.type = shouldReveal ? 'text' : 'password';
                togglePasswordButton.classList.toggle('is-visible', shouldReveal);
                togglePasswordButton.setAttribute(
                    'aria-label',
                    shouldReveal ? 'Ocultar senha' : 'Mostrar senha'
                );
            });
        }
    </script>
</body>
</html>


