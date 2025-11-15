<?php

// Suporte a ambientes com/sem pasta public
$__candidateRoot = is_file(__DIR__ . '/../config/config.php') ? dirname(__DIR__) : __DIR__;
include_once($__candidateRoot . '/config/config.php');

session_start();
$_SESSION = [];
session_destroy();

header("Location: index.php");
exit;

?>
