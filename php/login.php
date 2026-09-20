<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - login endpoint
   Receives the form (POST), validates credentials against
   the `users` table. Falls back to checking the flat CSV
   file if the DB is unavailable.
   Always answers with JSON.
   ========================================================== */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

/* ---- Flat-file fallback path ---- */
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
$email    = strtolower(trim((string)($_POST['email']    ?? '')));
$password = (string)($_POST['password'] ?? '');
$provider = trim((string)($_POST['provider'] ?? ''));  // social login

/* ---------- validate basic inputs ---------- */
$errors = [];

if ($email === '') {
    $errors['email'] = 'Please enter your email address.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Enter a valid email address.';
}

/* Social login bypasses password validation */
if ($provider === '') {
    if ($password === '') {
        $errors['password'] = 'Please enter your password.';
    } elseif (strlen($password) < 6) {
        $errors['password'] = 'Password must be at least 6 characters.';
    }
}

if (!empty($errors)) {
    respond(422, ['success' => false, 'message' => 'Please fix the errors below.', 'errors' => $errors]);
}

/* ==========================================================
   SOCIAL LOGIN FLOW
   ========================================================== */
if ($provider !== '') {
    $allowedProviders = ['google', 'facebook'];
    if (!in_array(strtolower($provider), $allowedProviders, true)) {
        respond(400, ['success' => false, 'message' => 'Invalid login provider.']);
    }

    /* Try DB first */
    try {
        $pdo  = db();
        $stmt = $pdo->prepare('SELECT id, full_name FROM users WHERE email = :email LIMIT 1');
        $stmt->execute([':email' => $email]);
        $user = $stmt->fetch();

        if ($user) {
            session_start();
            $_SESSION['user_id']   = $user['id'];
            $_SESSION['user_name'] = $user['full_name'];
            $_SESSION['user_email']= $email;
            respond(200, [
                'success' => true,
                'message' => 'Welcome back, ' . htmlspecialchars($user['full_name']) . '!'
            ]);
        } else {
            respond(401, ['success' => false, 'message' => 'No account found with this email. Please register first.']);
        }
    } catch (Throwable $e) {
        /* DB down — check flat file */
        if (file_exists(REGISTRATIONS_FILE)) {
            $handle = fopen(REGISTRATIONS_FILE, 'r');
            if ($handle) {
                $found = false;
                $name  = '';
                while (($row = fgetcsv($handle)) !== false) {
                    if (isset($row[1]) && strtolower(trim($row[1])) === $email) {
                        $found = true;
                        $name  = $row[0] ?? '';
                        break;
                    }
                }
                fclose($handle);
                if ($found) {
                    respond(200, ['success' => true, 'message' => 'Welcome back, ' . htmlspecialchars($name) . '!']);
                }
            }
        }
        respond(401, ['success' => false, 'message' => 'No account found with this email. Please register first.']);
    }
}

/* ==========================================================
   REGULAR EMAIL + PASSWORD LOGIN
   ========================================================== */
try {
    $pdo  = db();
    $stmt = $pdo->prepare('SELECT id, full_name, password_hash FROM users WHERE email = :email LIMIT 1');
    $stmt->execute([':email' => $email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        respond(401, ['success' => false, 'message' => 'Invalid email or password. Please try again.']);
    }

    /* Credentials OK */
    session_start();
    $_SESSION['user_id']   = $user['id'];
    $_SESSION['user_name'] = $user['full_name'];
    $_SESSION['user_email']= $email;

    respond(200, [
        'success' => true,
        'message' => 'Welcome back, ' . htmlspecialchars($user['full_name']) . '! Redirecting…'
    ]);

} catch (Throwable $e) {

    /* ---- DB unavailable: fall back to flat CSV ---- */
    if (!file_exists(REGISTRATIONS_FILE)) {
        respond(503, ['success' => false, 'message' => 'Service temporarily unavailable. Please try again later.']);
    }

    $handle = fopen(REGISTRATIONS_FILE, 'r');
    if (!$handle) {
        respond(503, ['success' => false, 'message' => 'Service temporarily unavailable. Please try again later.']);
    }

    $found       = false;
    $name        = '';
    $storedHash  = '';

    while (($row = fgetcsv($handle)) !== false) {
        // CSV columns: full_name, email, phone, password_hash, created_at
        if (isset($row[1]) && strtolower(trim($row[1])) === $email) {
            $found      = true;
            $name       = $row[0] ?? '';
            $storedHash = $row[3] ?? '';
            break;
        }
    }
    fclose($handle);

    if (!$found || !password_verify($password, $storedHash)) {
        respond(401, ['success' => false, 'message' => 'Invalid email or password. Please try again.']);
    }

    respond(200, [
        'success' => true,
        'message' => 'Welcome back, ' . htmlspecialchars($name) . '! Redirecting…'
    ]);
}
