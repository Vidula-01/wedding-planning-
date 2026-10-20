<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - newsletter subscribe endpoint
   Saves the email into `newsletter_subscribers`, or into a
   local CSV when MySQL is unavailable. Always answers JSON.
   ========================================================== */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

define('SUBSCRIBERS_FILE', __DIR__ . '/../database/subscribers.csv');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}

$email = strtolower(trim((string)($_POST['email'] ?? '')));

if ($email === '') {
    respond(422, ['success' => false, 'message' => 'Enter your email address first.']);
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    respond(422, ['success' => false, 'message' => 'That email address does not look right.']);
}

function saveSubscriberToFile(string $email, string $ip): void
{
    $dir = dirname(SUBSCRIBERS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $isNew = !file_exists(SUBSCRIBERS_FILE);
    $fp = fopen(SUBSCRIBERS_FILE, 'a');
    if ($fp) {
        if ($isNew) {
            fputcsv($fp, ['subscribed_at', 'email', 'ip_address']);
        }
        fputcsv($fp, [date('Y-m-d H:i:s'), $email, $ip]);
        fclose($fp);
    }
}

$ip = (string)($_SERVER['REMOTE_ADDR'] ?? '');

try {
    $pdo = db();

    $check = $pdo->prepare('SELECT id FROM newsletter_subscribers WHERE email = ? LIMIT 1');
    $check->execute([$email]);

    if ($check->fetch()) {
        respond(200, [
            'success' => true,
            'message' => 'You are already on the list. Nothing more to do.',
        ]);
    }

    $insert = $pdo->prepare(
        'INSERT INTO newsletter_subscribers (email, ip_address) VALUES (?, ?)'
    );
    $insert->execute([$email, $ip]);

    saveSubscriberToFile($email, $ip);

    respond(201, [
        'success' => true,
        'message' => 'Added. We will send one short note with planning tips.',
    ]);
} catch (PDOException $e) {
    if ($e->getCode() === '23000') {
        respond(200, [
            'success' => true,
            'message' => 'You are already on the list. Nothing more to do.',
        ]);
    }

    error_log('[WEDORA subscribe] DB error, using file fallback: ' . $e->getMessage());
    saveSubscriberToFile($email, $ip);

    respond(201, [
        'success' => true,
        'message' => 'Added. We will send one short note with planning tips.',
    ]);
}
