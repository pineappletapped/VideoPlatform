<?php
header('Content-Type: application/json');
require_once __DIR__ . '/square-config.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input || empty($input['nonce']) || empty($input['tier']) || empty($input['email'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid request']);
    exit;
}
$nonce = $input['nonce'];
$tier = $input['tier'];
$email = $input['email'];
$planId = $SQUARE_PLANS[$tier] ?? '';
if (!$planId) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid tier']);
    exit;
}
$headers = [
    "Authorization: Bearer $SQUARE_ACCESS_TOKEN",
    "Content-Type: application/json",
    "Square-Version: 2024-06-12"
];

function sq_post($path, $body, $headers) {
    $ch = curl_init('https://connect.squareup.com' . $path);
    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $resp = curl_exec($ch);
    if ($resp === false) {
        curl_close($ch);
        return false;
    }
    $code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    return [$code, json_decode($resp, true)];
}

// Create customer
list($code, $data) = sq_post('/v2/customers', ['email_address' => $email], $headers);
if ($code >= 300 || empty($data['customer']['id'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create customer']);
    exit;
}
$customerId = $data['customer']['id'];

// Create card on file
list($code, $data) = sq_post("/v2/customers/$customerId/cards", ['card_nonce' => $nonce], $headers);
if ($code >= 300 || empty($data['card']['id'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to store card']);
    exit;
}
$cardId = $data['card']['id'];

$body = [
    'idempotency_key' => uniqid(),
    'location_id' => $SQUARE_LOCATION_ID,
    'plan_id' => $planId,
    'customer_id' => $customerId,
    'card_id' => $cardId,
    'start_date' => date('Y-m-d')
];
list($code, $data) = sq_post('/v2/subscriptions', $body, $headers);
if ($code >= 300 || empty($data['subscription']['id'])) {
    http_response_code(500);
    echo json_encode(['error' => 'Failed to create subscription']);
    exit;
}

echo json_encode(['subscription_id' => $data['subscription']['id']]);
?>
