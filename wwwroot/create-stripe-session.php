<?php
header('Content-Type: application/json');
require_once __DIR__ . '/stripe-config.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['tier']) || empty($input['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}
$tier = $input['tier'];
$email = $input['email'];
$priceId = $STRIPE_PRICE_IDS[$tier] ?? '';
if (!$priceId) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid tier']);
    exit;
}

$data = http_build_query([
    'success_url' => 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
    'cancel_url' => 'https://example.com/cancel',
    'mode' => 'subscription',
    'payment_method_types[]' => 'card',
    'line_items[0][price]' => $priceId,
    'line_items[0][quantity]' => 1,
    'customer_email' => $email
]);

$ch = curl_init('https://api.stripe.com/v1/checkout/sessions');
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
curl_setopt($ch, CURLOPT_HTTPAUTH, CURLAUTH_BASIC);
curl_setopt($ch, CURLOPT_USERPWD, $STRIPE_SECRET_KEY . ':');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$resp = curl_exec($ch);
if ($resp === false) {
    http_response_code(500);
    echo json_encode(['error' => 'Connection failed']);
    exit;
}
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$body = json_decode($resp, true);
if ($code >= 300 || empty($body['id'])) {
    http_response_code(500);
    $msg = isset($body['error']['message']) ? $body['error']['message'] : 'Failed to create session';
    echo json_encode(['error' => $msg]);
    exit;
}

echo json_encode(['session_id' => $body['id']]);
?>
