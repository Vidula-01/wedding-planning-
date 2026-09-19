<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - register endpoint
   Receives the form (POST), validates it again on the server,
   hashes the password and saves the user in the `users` table.
   Falls back to saving in a local file if the DB is unavailable.
   Always answers with JSON.
   ========================================================== */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

/* ---- Path where registrations are saved as a flat file (fallback) ---- */
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

/* ---------- read input ---------- */
$fullName = preg_replace('/\s+/u', ' ', trim((string)($_POST['full_name'] ?? '')));
$email    = strtolower(trim((string)($_POST['email'] ?? '')));
$phoneRaw = trim((string)($_POST['phone'] ?? ''));
$phone    = preg_replace('/[\s\-()]/', '', $phoneRaw);
$password = (string)($_POST['password'] ?? '');
$confirm  = (string)($_POST['confirm_password'] ?? '');
$terms    = !empty($_POST['terms']);

/* ---------- validate ---------- */
$errors = [];

if ($fullName === '') {
    $errors['full_name'] = 'Please enter your full name.';
} elseif (!preg_match('/^[\p{L}][\p{L}\p{M}\s.\'-]{1,99}$/u', $fullName)) {
    $errors['full_name'] = 'Use letters only, at least 2 characters.';
}

if ($email === '') {
    $errors['email'] = 'Please enter your email address.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    $errors['email'] = 'Enter a valid email address.';
}

if ($phone === '') {
    $errors['phone'] = 'Please enter your phone number.';
} elseif (!preg_match('/^\+?\d{9,15}$/', $phone)) {
    $errors['phone'] = 'Enter a valid phone number, e.g. 0771234567.';
}

if ($password === '') {
    $errors['password'] = 'Please create a password.';
} elseif (strlen($password) < 8) {
    $errors['password'] = 'Use at least 8 characters.';
} elseif (strlen($password) > 72) {
    $errors['password'] = 'Use at most 72 characters.';
} elseif (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
    $errors['password'] = 'Include at least one letter and one number.';
}

if ($confirm !== $password) {
    $errors['confirm_password'] = 'Passwords do not match.';
}

if (!$terms) {
    $errors['terms'] = 'Please accept the Terms of Service and Privacy Policy.';
}

if ($errors) {
    respond(422, [
        'success' => false,
        'message' => 'Please fix the highlighted fields.',
        'errors'  => $errors,
    ]);
}

/* ---------- Helper: save to flat file ---------- */
function saveToFile(string $fullName, string $email, string $phone, string $passwordHash): void
{
    $dir = dirname(REGISTRATIONS_FILE);
    if (!is_dir($dir)) {
        @mkdir($dir, 0755, true);
    }

    // Write CSV header if file doesn't exist yet
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

/* ---------- save ---------- */
$passwordHash = password_hash($password, PASSWORD_DEFAULT);

try {
    $pdo = db();

    $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        respond(409, [
            'success' => false,
            'message' => 'This email is already registered.',
            'errors'  => ['email' => 'This email is already registered. Try logging in.'],
        ]);
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)'
    );
    $insert->execute([$fullName, $email, $phone, $passwordHash]);

    // Also save to file as backup
    saveToFile($fullName, $email, $phone, $passwordHash);

    respond(201, [
        'success' => true,
        'message' => 'Account created successfully! Redirecting you now…',
    ]);
} catch (PDOException $e) {
    // 23000 = duplicate email slipped in between the check and the insert
    if ($e->getCode() === '23000') {
        respond(409, [
            'success' => false,
            'message' => 'This email is already registered.',
            'errors'  => ['email' => 'This email is already registered. Try logging in.'],
        ]);
    }

    // DB unavailable — fall back to flat file
    error_log('[WEDORA register] DB error, falling back to file: ' . $e->getMessage());

    // Check for duplicate in file
    if (file_exists(REGISTRATIONS_FILE)) {
        $lines = file(REGISTRATIONS_FILE, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
        foreach (array_slice($lines, 1) as $line) { // skip header
            $row = str_getcsv($line);
            if (isset($row[2]) && strtolower($row[2]) === $email) {
                respond(409, [
                    'success' => false,
                    'message' => 'This email is already registered.',
                    'errors'  => ['email' => 'This email is already registered. Try logging in.'],
                ]);
            }
        }
    }

    saveToFile($fullName, $email, $phone, $passwordHash);

    respond(201, [
        'success' => true,
        'message' => 'Account created successfully! Redirecting you now…',
    ]);
}


header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}

/* ---------- read input ---------- */
$fullName = preg_replace('/\s+/u', ' ', trim((string)($_POST['full_name'] ?? '')));
$email    = strtolower(trim((string)($_POST['email'] ?? '')));
$phoneRaw = trim((string)($_POST['phone'] ?? ''));
$phone    = preg_replace('/[\s\-()]/', '', $phoneRaw);
$password = (string)($_POST['password'] ?? '');
$confirm  = (string)($_POST['confirm_password'] ?? '');
$terms    = !empty($_POST['terms']);

/* ---------- validate ---------- */
$errors = [];

if ($fullName === '') {
    $errors['full_name'] = 'Please enter your full name.';
} elseif (!preg_match('/^[\p{L}][\p{L}\p{M}\s.\'-]{1,99}$/u', $fullName)) {
    $errors['full_name'] = 'Use letters only, at least 2 characters.';
}

if ($email === '') {
    $errors['email'] = 'Please enter your email address.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($email) > 150) {
    $errors['email'] = 'Enter a valid email address.';
}

if ($phone === '') {
    $errors['phone'] = 'Please enter your phone number.';
} elseif (!preg_match('/^\+?\d{9,15}$/', $phone)) {
    $errors['phone'] = 'Enter a valid phone number, e.g. 0771234567.';
}

if ($password === '') {
    $errors['password'] = 'Please create a password.';
} elseif (strlen($password) < 8) {
    $errors['password'] = 'Use at least 8 characters.';
} elseif (strlen($password) > 72) {
    $errors['password'] = 'Use at most 72 characters.';
} elseif (!preg_match('/[A-Za-z]/', $password) || !preg_match('/\d/', $password)) {
    $errors['password'] = 'Include at least one letter and one number.';
}

if ($confirm !== $password) {
    $errors['confirm_password'] = 'Passwords do not match.';
}

if (!$terms) {
    $errors['terms'] = 'Please accept the Terms of Service and Privacy Policy.';
}

if ($errors) {
    respond(422, [
        'success' => false,
        'message' => 'Please fix the highlighted fields.',
        'errors'  => $errors,
    ]);
}

/* ---------- save ---------- */
try {
    $pdo = db();

    $check = $pdo->prepare('SELECT id FROM users WHERE email = ? LIMIT 1');
    $check->execute([$email]);
    if ($check->fetch()) {
        respond(409, [
            'success' => false,
            'message' => 'This email is already registered.',
            'errors'  => ['email' => 'This email is already registered. Try logging in.'],
        ]);
    }

    $insert = $pdo->prepare(
        'INSERT INTO users (full_name, email, phone, password_hash) VALUES (?, ?, ?, ?)'
    );
    $insert->execute([$fullName, $email, $phone, password_hash($password, PASSWORD_DEFAULT)]);

    respond(201, [
        'success' => true,
        'message' => 'Account created successfully! Redirecting you now…',
    ]);
} catch (PDOException $e) {
    // 23000 = duplicate email slipped in between the check and the insert
    if ($e->getCode() === '23000') {
        respond(409, [
            'success' => false,
            'message' => 'This email is already registered.',
            'errors'  => ['email' => 'This email is already registered. Try logging in.'],
        ]);
    }

    error_log('[WEDORA register] ' . $e->getMessage());
    respond(500, [
        'success' => false,
        'message' => 'We could not create your account right now. Please try again in a moment.',
    ]);
}
