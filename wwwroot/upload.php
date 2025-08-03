<?php
$path = $_POST['path'];
$target = __DIR__ . '/assets/' . $path;
$dir = dirname($target);
if (!is_dir($dir)) {
    mkdir($dir, 0777, true);
}
move_uploaded_file($_FILES['file']['tmp_name'], $target);
?>
