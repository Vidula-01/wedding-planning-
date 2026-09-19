<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - Social registration endpoint (Google & Facebook)
   Handles registration and login via Google and Facebook
   Saves to `users` table or database/registrations.csv fallback
   ========================================================== */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

define('REGISTRATIONS_FILE', __DIR__ . '/../database/registrations.csv');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}

$provider  = strtolower(trim((string)($_POST['provider'] ?? 'google')));
$fullName  = preg_replace('/\s+/u', ' ', trim((string)($_POST['full_name'] ?? '')));
$email     = strtolower(trim((string)($_POST['email'] ?? '')));
$phone     = trim((string)($_POST['phone'] ?? ''));

if ($provider !== 'google' && $provider !== 'facebook') {
    respond(400, ['success' => false, 'message' => 'Invalid social provider.']);
}

if ($fullName === '') {
    $fullName = ucfirst($provider) . ' User';
}

if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(422, ['success' => false, 'message' => 'Please provide a valid email address from ' . ucfirst($provider) . '.']);
}

if ($phone === '') {
    $phone = ucfirst($provider) . ' Auth';
}

/* Helper to save to fallback file */
function saveToFile(string $fullName, string $email, string $phone, string $passwordHash): void
{
    $dir = dirname(REGISTRATIONS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }
    $isNew = !file_exists(REGISTRATIONS_FILE);
    $fp = fopen(REGISTRATIONS_FILE, 'a');
    if ($fp) {
        if ($isNew) {
            fputcsv($fp, ['registered_at', 'full_name', 'email', 'phone', 'password_hash']);
        }
        fputcsv($fp, [date('Y-m-d H:i:s'), $fullName, $email, $phone, $passwordHash]);
        fclose($fp);
    }
}

$passwordHash = password_hash('social_oauth_' . bin2hex(random_bytes(16)), PASSWORD_DEFAULT);

try {
    $pdo = db();

    // Check if user already exists
    $check = $pdo->prepare('SELECT id, full_name FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    $existing = $check->fetch();

    if ($existing) {
        // User already has an account, log them in seamlessly
        respond(200, [
            'success' => true,
            'message' => 'Welcome back, ' . htmlspecialchars($existing['full_name'] ?: $fullName) . '! Signed in via ' . ucfirst($provider) . '.',
            'is_existing' => true,
        ]);
    }

    // Insert new user
    $insert = $pdo->prepare(
        'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)'
    );
    $insert->execute([$fullName, $email, $phone, $passwordHash]);

    saveToFile($fullName, $email, $phone, $passwordHash);

    respond(201, [
        'success' => true,
        'message' => 'Account created successfully with ' . ucfirst($provider) . '! Redirecting...',
        'is_existing' => false,
    ]);
} catch (PDOException $e) {
    // Duplicate email or DB issue
    if ($e->getCode() === '23000') {
        respond(200, [
            'success' => true,
            'message' => 'Welcome back! Signed in via ' . ucfirst($provider) . '.',
            'is_existing' => true,
        ]);
    }

    // DB unavailable — fallback to flat file
    error_log('[WEDORA social register] DB error, using file fallback: ' . $e->getMessage());

    saveToFile($fullName, $email, $phone, $passwordHash);

    respond(201, [
        'success' => true,
        'message' => 'Account created successfully with ' . ucfirst($provider) . '! Redirecting...',
        'is_existing' => false,
    ]);
}
