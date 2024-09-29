<?php

include_once('config.php');

session_start();
unset($_SESSION['nome']);
session_destroy();

header("Location: index.php");
exit;

?>