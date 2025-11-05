<?php

include_once('config/config.php');

session_start();
$_SESSION = [];
session_destroy();

header("Location: index.php");
exit;

?>
