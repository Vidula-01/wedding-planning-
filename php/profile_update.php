<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - Profile update endpoint
   Receives the profile form (JSON, POST) and saves it to the
   `users` and `wedding_details` tables for the logged-in user.
   Always answers with JSON, same shape as the rest of the app.
   ========================================================== */

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');

require_login_json();

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}

$userId = (int)$_SESSION['user_id'];

/* ---------- read input (JSON body) ---------- */
$raw  = file_get_contents('php://input');
$body = json_decode($raw, true);
if (!is_array($body)) {
    $body = $_POST; // fallback if sent as a normal form post
}

$fullName    = trim((string)($body['full_name'] ?? ''));
$email       = strtolower(trim((string)($body['email'] ?? '')));
$phone       = trim((string)($body['phone'] ?? ''));
$partnerName = trim((string)($body['partner_name'] ?? ''));
$weddingDate = trim((string)($body['wedding_date'] ?? ''));
$totalBudget = $body['total_budget'] ?? '';
$spentBudget = $body['spent_budget'] ?? '';
$guests      = $body['guests_confirmed'] ?? '';
$vendors     = $body['vendors_saved'] ?? '';

/* ---------- validate ---------- */
$errors = [];

if ($fullName === '') {
    $errors['full_name'] = 'Please enter your full name.';
} elseif (mb_strlen($fullName) > 100) {
    $errors['full_name'] = 'Full name is too long.';
}

if ($email === '') {
    $errors['email'] = 'Please enter your email address.';
} elseif (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $errors['email'] = 'Enter a valid email address.';
}

if ($phone === '') {
    $errors['phone'] = 'Please enter your phone number.';
} elseif (!preg_match('/^[0-9+\-\s()]{7,20}$/', $phone)) {
    $errors['phone'] = 'Enter a valid phone number.';
}

if ($partnerName !== '' && mb_strlen($partnerName) > 100) {
    $errors['partner_name'] = 'Partner\'s name is too long.';
}

if ($weddingDate !== '' && !DateTime::createFromFormat('Y-m-d', $weddingDate)) {
    $errors['wedding_date'] = 'Enter a valid date.';
}

if ($totalBudget === '' || $totalBudget === null) {
    $totalBudget = 0;
}
if (!is_numeric($totalBudget) || (float)$totalBudget < 0) {
    $errors['total_budget'] = 'Enter a valid budget amount.';
}

if ($spentBudget === '' || $spentBudget === null) {
    $spentBudget = 0;
}
if (!is_numeric($spentBudget) || (float)$spentBudget < 0) {
    $errors['spent_budget'] = 'Enter a valid amount spent.';
}

if ($guests === '' || $guests === null) {
    $guests = 0;
}
if (!is_numeric($guests) || (int)$guests < 0) {
    $errors['guests_confirmed'] = 'Enter a valid number of guests.';
}

if ($vendors === '' || $vendors === null) {
    $vendors = 0;
}
if (!is_numeric($vendors) || (int)$vendors < 0) {
    $errors['vendors_saved'] = 'Enter a valid number of vendors.';
}

if (!empty($errors)) {
    respond(422, ['success' => false, 'message' => 'Please fix the errors below.', 'errors' => $errors]);
}

try {
    $pdo = db();

    /* ---------- email must stay unique across accounts ---------- */
    $stmt = $pdo->prepare('SELECT id FROM users WHERE email = :email AND id <> :id LIMIT 1');
    $stmt->execute([':email' => $email, ':id' => $userId]);
    if ($stmt->fetch()) {
        respond(422, [
            'success' => false,
            'message' => 'Please fix the errors below.',
            'errors'  => ['email' => 'That email is already used by another account.'],
        ]);
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'UPDATE users SET full_name = :full_name, email = :email, phone = :phone WHERE id = :id'
    );
    $stmt->execute([
        ':full_name' => $fullName,
        ':email'     => $email,
        ':phone'     => $phone,
        ':id'        => $userId,
    ]);

    $stmt = $pdo->prepare(
        'INSERT INTO wedding_details
            (user_id, partner_name, wedding_date, total_budget, spent_budget, guests_confirmed, vendors_saved)
         VALUES
            (:uid, :partner_name, :wedding_date, :total_budget, :spent_budget, :guests, :vendors)
         ON DUPLICATE KEY UPDATE
            partner_name     = VALUES(partner_name),
            wedding_date     = VALUES(wedding_date),
            total_budget     = VALUES(total_budget),
            spent_budget     = VALUES(spent_budget),
            guests_confirmed = VALUES(guests_confirmed),
            vendors_saved    = VALUES(vendors_saved)'
    );
    $stmt->execute([
        ':uid'          => $userId,
        ':partner_name' => $partnerName !== '' ? $partnerName : null,
        ':wedding_date' => $weddingDate !== '' ? $weddingDate : null,
        ':total_budget' => (float)$totalBudget,
        ':spent_budget' => (float)$spentBudget,
        ':guests'       => (int)$guests,
        ':vendors'      => (int)$vendors,
    ]);

    $pdo->commit();

    /* keep the session in sync so the sidebar / greetings stay correct */
    $_SESSION['user_name']  = $fullName;
    $_SESSION['user_email'] = $email;

    respond(200, [
        'success' => true,
        'message' => 'Your profile has been saved.',
    ]);

} catch (Throwable $e) {
    if ($pdo instanceof PDO && $pdo->inTransaction()) {
        $pdo->rollBack();
    }
    error_log('[WEDORA profile_update] ' . $e->getMessage());
    respond(503, ['success' => false, 'message' => 'Could not save your profile right now. Please try again.']);
}
