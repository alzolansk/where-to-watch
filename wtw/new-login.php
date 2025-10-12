<?php
include_once('config/config.php');

if (!function_exists('wywEnsureOnboardingColumn')) {
    function wywEnsureOnboardingColumn(mysqli $connection): void
    {
        try {
            $result = $connection->query("SHOW COLUMNS FROM tb_users LIKE 'onboarding_completed_at'");
            $exists = $result instanceof mysqli_result && $result->num_rows > 0;
            if ($result instanceof mysqli_result) {
                $result->free();
            }
            if (!$exists) {
                $connection->query("ALTER TABLE tb_users ADD COLUMN onboarding_completed_at DATETIME NULL DEFAULT NULL AFTER email_user");
            }
        } catch (Throwable $schemaError) {
            error_log('wyw_onboarding_column_error: ' . $schemaError->getMessage());
        }
    }
}

wywEnsureOnboardingColumn($conexao);

$error_message = '';
$title_error = '';
$name_value = '';
$email_value = '';
if (isset($_POST['submit'])) {
    $name_value = trim($_POST['nome'] ?? '');
    $email_value = trim($_POST['email'] ?? '');
    $senha = $_POST['senha'] ?? '';
    $confirm_senha = $_POST['confirmasenha'] ?? '';

    if ($name_value === '' || $email_value === '' || $senha === '' || $confirm_senha === '') {
        $title_error = 'Campos obrigatorios';
        $error_message = 'Preencha todos os campos obrigatorios para continuar.';
    } else {
        $email = filter_var($email_value, FILTER_VALIDATE_EMAIL);

        if (!$email) {
            $title_error = 'Email invalido';
            $error_message = 'Insira um endereco de email valido.';
        } elseif ($senha !== $confirm_senha) {
            $title_error = 'Senhas diferentes';
            $error_message = 'A confirmacao de senha precisa corresponder a senha informada.';
        } else {
            $stmt = $conexao->prepare('SELECT id_user FROM tb_users WHERE email_user = ?');
            if ($stmt) {
                $stmt->bind_param('s', $email);
                $stmt->execute();
                $stmt->store_result();

                $email_exists = $stmt->num_rows > 0;
                $stmt->close();

                if ($email_exists) {
                    $title_error = 'Usuario existente';
                    $error_message = 'Este email ja possui cadastro. Gostaria de entrar? <a href="login.php">Clique aqui</a>.';
                } else {
                    $hashed_password = password_hash($senha, PASSWORD_DEFAULT);
                    $insert_stmt = $conexao->prepare('INSERT INTO tb_users (name_user, email_user, pswd_user) VALUES (?, ?, ?)');
                    if ($insert_stmt) {
                        $insert_stmt->bind_param('sss', $name_value, $email, $hashed_password);
                        if ($insert_stmt->execute()) {
                            header('Location: login.php');
                            exit();
                        } else {
                            $title_error = 'Erro ao cadastrar';
                            $error_message = 'Nao foi possivel concluir seu cadastro. Tente novamente.';
                        }
                        $insert_stmt->close();
                    } else {
                        $title_error = 'Erro ao cadastrar';
                        $error_message = 'Nao foi possivel preparar o cadastro. Tente novamente mais tarde.';
                    }
                }
            } else {
                $title_error = 'Erro ao cadastrar';
                $error_message = 'Nao foi possivel verificar o email informado.';
            }
        }
    }
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Criar conta - Where You Watch</title>
    <link rel="icon" href="imagens/wywatch-favicon-iris-nobackground.png">
    <link rel="stylesheet" href="css/brand.css">
    <link rel="stylesheet" href="css/login.css">
    <link rel="stylesheet" href="css/new-login.css">
</head>
<body class="login-body login-body--register">
    <dialog id="loginInvalid" class="alert-dialog">
        <div class="dialog-content">
            <p class="dialog-title"><?php echo $title_error; ?></p>
            <div class="dialog-message"><?php echo $error_message; ?></div>
            <button type="button" class="dialog-button" id="closeDialog">Fechar</button>
        </div>
    </dialog>

    <div class="login-page">
        <div class="login-shell login-shell--register">
            <a href="index.php" class="wyw-brand wyw-brand--badge wyw-brand--lg login-logo" aria-label="Ir para a pagina inicial">
                <span class="wyw-brand__where">where</span>
                <span class="wyw-brand__where wyw-brand__where--y">y</span>
                <img src="imagens/eye-icon2.svg" alt="o" class="wyw-brand__eye" />
                <span class="wyw-brand__where wyw-brand__where--u">u</span>
                <span class="wyw-brand__watch">WATCH</span>
            </a>

            <div class="login-card register-card">
                <div class="card-header">
                    <h1 class="card-title">Criar conta</h1>
                    <p class="card-subtitle">Cadastre-se para salvar favoritos e descobrir onde assistir seus filmes e series.</p>
                </div>

                <form action="new-login.php" method="POST" class="login-form register-form">
                    <div class="input-group">
                        <label for="nome">Nome</label>
                        <input type="text" name="nome" id="nome" class="input-control" placeholder="Seu nome de usuário" value="<?php echo htmlspecialchars($name_value, ENT_QUOTES, 'UTF-8'); ?>" required>
                    </div>

                    <div class="input-group">
                        <label for="email">Email</label>
                        <input type="email" name="email" id="email" class="input-control" placeholder="usuario@email.com" value="<?php echo htmlspecialchars($email_value, ENT_QUOTES, 'UTF-8'); ?>" required>
                    </div>

                    <div class="input-group">
                        <label for="senha">Senha</label>
                        <div class="password-field">
                            <input type="password" name="senha" id="senha" class="input-control" placeholder="Crie uma senha segura" required>
                            <button type="button" class="password-toggle" data-target="senha" aria-label="Mostrar senha">
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

                    <div class="input-group">
                        <label for="confirma_senha">Confirme a senha</label>
                        <div class="password-field">
                            <input type="password" name="confirmasenha" id="confirma_senha" class="input-control" placeholder="Repita sua senha" required>
                            <button type="button" class="password-toggle" data-target="confirma_senha" aria-label="Mostrar senha">
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

                    <button type="submit" value="Sign in" name="submit" id="submit" class="login-primary">Cadastrar</button>

                    <div class="create-account">
                        <span>Ja tem uma conta?</span>
                        <a href="login.php" class="link-accent">Entrar</a>
                    </div>

                    <p class="terms-note">
                        Ao criar sua conta, voce concorda com os <a href="#">Termos de uso</a> e com a <a href="#">Politica de privacidade</a>.
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

        if (loginInvalidDialog && errorMessageElement && errorMessageElement.textContent.trim() !== '') {
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

        document.querySelectorAll('.password-toggle').forEach((button) => {
            const targetId = button.getAttribute('data-target');
            const input = document.getElementById(targetId);

            if (!input) {
                return;
            }

            button.addEventListener('click', () => {
                const shouldReveal = input.type === 'password';
                input.type = shouldReveal ? 'text' : 'password';
                button.classList.toggle('is-visible', shouldReveal);
                button.setAttribute(
                    'aria-label',
                    shouldReveal ? 'Ocultar senha' : 'Mostrar senha'
                );
            });
        });
    </script>
</body>
</html>
