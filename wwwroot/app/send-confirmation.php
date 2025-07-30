<?php
header('Content-Type: application/json');
$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}
$email = $input['email'];
$subject = 'Registration Confirmation';
$message = "Thanks for registering with our platform.";
$headers = 'From: no-reply@coconuttapped.com';
if (@mail($email, $subject, $message, $headers)) {
    echo json_encode(['status' => 'sent']);
} else {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to send email']);
}
?>
