<?php
// Suporte a ambientes com/sem pasta public
$__candidateRoot = is_file(__DIR__ . '/../config/bootstrap.php') ? dirname(__DIR__) : __DIR__;
require_once $__candidateRoot . '/config/bootstrap.php';

// Inicializar conexão mysqli para código legado
if (!isset($conexao)) {
    $host = wyw_env('DB_HOST', 'localhost');
    $database = wyw_env('DB_NAME', 'db_login');
    $user = wyw_env('DB_USER', 'root');
    $password = wyw_env('DB_PASS', '');
    $conexao = new mysqli($host, $user, $password, $database);
    if ($conexao->connect_error) {
        die('Erro de conexão: ' . $conexao->connect_error);
    }
    $conexao->set_charset('utf8mb4');
}

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
        } elseif (strlen($senha) < 6 || !preg_match('/\d/', $senha)) {
            $title_error = 'Senha invalida';
            $error_message = 'A senha deve ter pelo menos 6 caracteres e conter ao menos um numero.';
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
                            $user_id = $insert_stmt->insert_id ?: $conexao->insert_id;
                            $_SESSION['id'] = $user_id;
                            $_SESSION['id_user'] = $user_id;
                            $_SESSION['nome'] = $name_value;
                            $_SESSION['onboarding_pending'] = true;
                            unset($_SESSION['onboarding_completed_at']);

                            header('Location: index.php');
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
<body class="login-body login-body--auth">
    <dialog id="loginInvalid" class="alert-dialog">
        <div class="dialog-content">
            <p class="dialog-title"><?php echo $title_error; ?></p>
            <div class="dialog-message"><?php echo $error_message; ?></div>
            <button type="button" class="dialog-button" id="closeDialog">Fechar</button>
        </div>
    </dialog>

    <div class="login-page">
        <div class="login-shell auth-shell auth-shell--register">
            <a href="index.php" class="wyw-brand wyw-brand--badge wyw-brand--lg login-logo" aria-label="Ir para a pagina inicial">
                <span class="wyw-brand__where">where</span>
                <span class="wyw-brand__where wyw-brand__where--y">y</span>
                <img src="imagens/eye-icon2.svg" alt="o" class="wyw-brand__eye" />
                <span class="wyw-brand__where wyw-brand__where--u">u</span>
                <span class="wyw-brand__watch">WATCH</span>
            </a>

            <div class="login-card auth-card">
                <div class="card-header">
                    <h1 class="card-title">Criar conta</h1>
                    <p class="card-subtitle">Cadastre-se para salvar favoritos e descobrir onde assistir seus filmes e series.</p>
                </div>

                <form action="new-login.php" method="POST" class="login-form auth-form">
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
                            <input type="password" name="senha" id="senha" class="input-control" placeholder="Crie uma senha segura" aria-describedby="passwordError" required>
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
                            <input type="password" name="confirmasenha" id="confirma_senha" class="input-control" placeholder="Repita sua senha" aria-describedby="passwordError" required>
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
                        <p id="passwordError" role="alert" aria-live="polite" class="error" hidden></p>
                    </div>

                    <button type="submit" value="Sign in" name="submit" id="submit" class="login-primary">Cadastrar</button>

                    <div class="create-account">
                        <span>Ja tem uma conta?</span>
                        <a href="login.php" class="link-accent">Entrar</a>
                    </div>

                    <p class="terms-note">
                        Ao criar sua conta, voce concorda com os <a href="#" class="terms-link">Termos de uso</a> e com a <a href="#" class="privacy-link">Politica de privacidade</a>.
                    </p>
                </form>
            </div>
        </div>

        <div id="termsModal" class="terms-modal" role="dialog" aria-modal="true" aria-labelledby="termsModalTitle" aria-hidden="true">
            <div class="terms-modal__content">
                <div class="terms-modal__body">
                    <h2 id="termsModalTitle">🧾 <strong>Termos de Uso — WYWatch</strong></h2>
                    <p><strong>Última atualização:</strong> outubro de 2025</p>
                    <p>Bem-vindo ao <strong>WYWatch</strong> — um site desenvolvido para ajudar você a descobrir <strong>onde assistir filmes e séries</strong> nas principais plataformas de streaming e serviços de aluguel.</p>
                    <p>Ao acessar ou usar o WYWatch, você concorda com os termos descritos abaixo. Recomendamos que leia atentamente antes de continuar.</p>
                    <hr>
                    <h3>1. Sobre o WYWatch</h3>
                    <p>O WYWatch é um projeto independente criado por pessoa física, sem vínculo com serviços de streaming, estúdios ou produtoras.</p>
                    <p>Nosso objetivo é facilitar a busca por conteúdos audiovisuais, mostrando informações de <strong>onde assistir</strong>, <strong>elenco</strong>, <strong>trailer</strong> e outros dados obtidos por meio de <strong>APIs públicas</strong>, como o The Movie Database (TMDB).</p>
                    <hr>
                    <h3>2. Uso do site</h3>
                    <ul>
                        <li>Você pode utilizar o WYWatch gratuitamente para fins pessoais e não comerciais.</li>
                        <li>É proibido copiar, distribuir, modificar ou utilizar o conteúdo do site para fins comerciais sem autorização.</li>
                        <li>O uso indevido ou que viole leis pode resultar em suspensão de acesso.</li>
                    </ul>
                    <hr>
                    <h3>3. Cadastro e conta de usuário</h3>
                    <p>Alguns recursos, como <strong>favoritar títulos</strong> ou <strong>receber recomendações personalizadas</strong>, exigem a criação de uma conta.</p>
                    <ul>
                        <li>Ao se cadastrar, você deve fornecer <strong>nome, e-mail e senha</strong> (armazenada de forma segura com hash).</li>
                        <li>É de sua responsabilidade manter a confidencialidade da senha.</li>
                        <li>Você pode solicitar a exclusão de sua conta a qualquer momento.</li>
                    </ul>
                    <hr>
                    <h3>4. Fontes de informação</h3>
                    <p>As informações sobre filmes, séries e provedores são obtidas de fontes públicas e confiáveis, especialmente <strong>TMDB</strong> e <strong>JustWatch</strong>.</p>
                    <p>O WYWatch não se responsabiliza por eventuais divergências, erros ou mudanças nas plataformas de streaming.</p>
                    <hr>
                    <h3>5. Limitação de responsabilidade</h3>
                    <p>O WYWatch é um projeto informativo e não realiza transmissão, aluguel ou venda de filmes.</p>
                    <p>Não garantimos disponibilidade contínua, ausência de erros ou compatibilidade com todos os dispositivos.</p>
                    <hr>
                    <h3>6. Alterações nos Termos</h3>
                    <p>Podemos atualizar estes Termos de Uso a qualquer momento.</p>
                    <p>Quando isso ocorrer, a data da última atualização será revisada no início do documento. O uso contínuo do site após alterações implica concordância com os novos termos.</p>
                    <hr>
                    <h3>7. Contato</h3>
                    <p>Para dúvidas, sugestões ou solicitações relacionadas a estes Termos, entre em contato pelo LinkedIn oficial:</p>
                    <p><a href="https://www.linkedin.com/in/joaoalvesz" target="_blank" rel="noopener noreferrer">linkedin.com/in/joaoalvesz</a></p>
                </div>
                <button type="button" class="terms-modal__close" id="termsModalClose">ciente dos termos de uso</button>
            </div>
        </div>

        <div id="privacyModal" class="terms-modal" role="dialog" aria-modal="true" aria-labelledby="privacyModalTitle" aria-hidden="true">
            <div class="terms-modal__content">
                <div class="terms-modal__body">
                    <h2 id="privacyModalTitle">🔒 <strong>Política de Privacidade — WYWatch</strong></h2>
                    <p><strong>Última atualização:</strong> outubro de 2025</p>
                    <p>O WYWatch valoriza sua privacidade e transparência. Este documento explica <strong>como coletamos, usamos e protegemos seus dados pessoais</strong> ao utilizar o site.</p>
                    <hr>
                    <h3>1. Dados que coletamos</h3>
                    <p>Ao criar uma conta ou interagir com o site, podemos coletar:</p>
                    <ul>
                        <li><strong>Nome e e-mail</strong> (para identificação do usuário).</li>
                        <li><strong>Senha</strong>, armazenada de forma criptografada (hash).</li>
                        <li><strong>Preferências</strong> de filmes, séries, gêneros, atores e provedores, para gerar recomendações personalizadas.</li>
                    </ul>
                    <p>Não coletamos dados sensíveis, financeiros ou biométricos.</p>
                    <hr>
                    <h3>2. Uso das informações</h3>
                    <p>Seus dados são utilizados para:</p>
                    <ul>
                        <li>Personalizar sua experiência no site.</li>
                        <li>Exibir recomendações de filmes e séries.</li>
                        <li>Manter e melhorar o funcionamento do WYWatch.</li>
                        <li>Enviar comunicações pontuais, caso aplicável (ex: aviso de manutenção ou mudanças).</li>
                    </ul>
                    <p>Nunca vendemos ou compartilhamos seus dados pessoais com terceiros.</p>
                    <hr>
                    <h3>3. Armazenamento e segurança</h3>
                    <p>Os dados são armazenados em servidores do <strong>InfinityFree</strong>, com medidas de segurança padrão de mercado.</p>
                    <p>A senha é criptografada, e o acesso ao banco de dados é restrito apenas ao desenvolvedor responsável.</p>
                    <hr>
                    <h3>4. Cookies e tecnologias similares</h3>
                    <p>O WYWatch <strong>pode utilizar cookies ou armazenamento local</strong> para lembrar suas preferências e melhorar a navegação.</p>
                    <p>Você pode limpar ou desativar cookies a qualquer momento no seu navegador.</p>
                    <hr>
                    <h3>5. Direitos do usuário</h3>
                    <p>Você pode, a qualquer momento:</p>
                    <ul>
                        <li>Solicitar a <strong>exclusão da sua conta</strong> e de todos os dados associados.</li>
                        <li>Solicitar <strong>acesso ou correção</strong> das informações cadastradas.</li>
                    </ul>
                    <p>Essas solicitações podem ser feitas pelo LinkedIn do desenvolvedor.</p>
                    <hr>
                    <h3>6. Alterações nesta política</h3>
                    <p>Esta política pode ser atualizada para refletir melhorias no site ou exigências legais.</p>
                    <p>A versão mais recente estará sempre disponível no WYWatch.</p>
                    <hr>
                    <h3>7. Contato</h3>
                    <p>Para dúvidas ou solicitações sobre privacidade, entre em contato:</p>
                    <p><a href="https://www.linkedin.com/in/joaoalvesz" target="_blank" rel="noopener noreferrer">linkedin.com/in/joaoalvesz</a></p>
                </div>
                <button type="button" class="terms-modal__close" id="privacyModalClose">Entendi a política de privacidade</button>
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

    <script src="js/script.js"></script>
    <script>
        const loginInvalidDialog = document.getElementById('loginInvalid');
        const errorMessageElement = document.querySelector('.dialog-message');
        const closeDialogButton = document.getElementById('closeDialog');
        let activeModalHideHandler = null;

        const removeBodyModalStateIfNoModalVisible = () => {
            if (!document.querySelector('.terms-modal.is-visible')) {
                document.body.classList.remove('modal-open');
            }
        };

        const createModalController = (modalId, closeButtonId, triggerSelector) => {
            const modal = document.getElementById(modalId);
            const closeButton = closeButtonId ? document.getElementById(closeButtonId) : null;
            const triggers = triggerSelector ? document.querySelectorAll(triggerSelector) : [];

            if (!modal) {
                return null;
            }

            let previouslyFocusedElement = null;

            const hide = () => {
                modal.classList.remove('is-visible');
                modal.setAttribute('aria-hidden', 'true');
                removeBodyModalStateIfNoModalVisible();

                if (previouslyFocusedElement) {
                    previouslyFocusedElement.focus();
                }

                if (activeModalHideHandler === hide) {
                    activeModalHideHandler = null;
                }
            };

            const show = () => {
                previouslyFocusedElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

                modal.classList.add('is-visible');
                modal.setAttribute('aria-hidden', 'false');
                document.body.classList.add('modal-open');

                const focusTarget = closeButton || modal.querySelector('.terms-modal__close');
                if (focusTarget) {
                    focusTarget.focus();
                }

                activeModalHideHandler = hide;
            };

            triggers.forEach((trigger) => {
                trigger.addEventListener('click', (event) => {
                    event.preventDefault();
                    show();
                });
            });

            if (closeButton) {
                closeButton.addEventListener('click', hide);
            }

            modal.addEventListener('click', (event) => {
                if (event.target === modal) {
                    hide();
                }
            });

            return { show, hide };
        };

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

        createModalController('termsModal', 'termsModalClose', '.terms-link');
        createModalController('privacyModal', 'privacyModalClose', '.privacy-link');

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && typeof activeModalHideHandler === 'function') {
                activeModalHideHandler();
            }
        });
    </script>
</body>
</html>
