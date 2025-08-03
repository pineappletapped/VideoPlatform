<?php
$path = $_POST['path'] ?? '';
if (!preg_match('/^[A-Za-z0-9_\/-]+\.jpg$/', $path)) {
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
move_uploaded_file($_FILES['file']['tmp_name'], $target);
?>
