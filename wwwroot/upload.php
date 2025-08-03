<?php
$path = $_POST['path'];
move_uploaded_file($_FILES['file']['tmp_name'], __DIR__.'/assets/'.$path);
?>
