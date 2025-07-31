<?php
header('Content-Type: application/json');
$path = isset($_POST['path']) ? trim($_POST['path']) : '';
if (!isset($_FILES['file']) || $path === '') {
    http_response_code(400);
    echo json_encode(['error' => 'Missing file or path']);
    exit;
}
$target = __DIR__ . '/' . ltrim($path, '/');
$dir = dirname($target);
if (!is_dir($dir)) {
    if (!mkdir($dir, 0777, true)) {
        http_response_code(500);
        echo json_encode(['error' => 'Failed to create directory']);
        exit;
    }
}
if (move_uploaded_file($_FILES['file']['tmp_name'], $target)) {
    $protocol = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
    $host = $_SERVER['HTTP_HOST'];
    $base = rtrim(dirname($_SERVER['SCRIPT_NAME']), '/');
    $url = $protocol . '://' . $host . $base . '/' . ltrim($path, '/');
    echo json_encode(['url' => $url]);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to move uploaded file']);
}
