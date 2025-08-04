<?php
session_start();

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(16));
    }
    setcookie('csrf_token', $_SESSION['csrf_token'], 0, '/', '', false, true);
    header('Content-Type: text/plain');
    echo $_SESSION['csrf_token'];
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit;
}

$token = $_POST['csrf'] ?? '';
if (empty($_SESSION['csrf_token']) || !hash_equals($_SESSION['csrf_token'], $token)) {
    http_response_code(403);
    exit('CSRF validation failed');
}

$path = $_POST['path'] ?? '';
if (!preg_match('/^[A-Za-z0-9_\/-]+\.(jpg|png)$/i', $path)) {
    http_response_code(400);
    exit('Invalid path');
}

$baseDir = realpath(__DIR__ . '/assets');
$target = $baseDir . '/' . $path;
$dir = dirname($target);
if (strpos(realpath($dir), $baseDir) !== 0) {
    http_response_code(400);
    exit('Invalid directory');
}
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}
if (!isset($_FILES['file']) || !is_uploaded_file($_FILES['file']['tmp_name'])) {
    http_response_code(400);
    exit('No file');
}
$finfo = new finfo(FILEINFO_MIME_TYPE);
$mime = $finfo->file($_FILES['file']['tmp_name']);
$allowed = ['image/jpeg' => 'jpg', 'image/png' => 'png'];
if (!isset($allowed[$mime])) {
    http_response_code(415);
    exit('Unsupported file type');
}
if (strtolower(pathinfo($target, PATHINFO_EXTENSION)) !== $allowed[$mime]) {
    http_response_code(415);
    exit('File extension mismatch');
}
move_uploaded_file($_FILES['file']['tmp_name'], $target);
header('Cache-Control: public, max-age=31536000');
?>
