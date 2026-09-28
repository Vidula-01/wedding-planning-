<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - Wedding Details update endpoint
   Receives the wedding-details.html form (JSON, POST) and
   saves it to the `wedding_details` table for the logged-in
   user. Always answers with JSON, same shape as the rest of
   the app (see php/profile_update.php).
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

$partnerName      = trim((string)($body['partner_name'] ?? ''));
$weddingDate      = trim((string)($body['wedding_date'] ?? ''));
$theme            = trim((string)($body['theme'] ?? ''));
$dressCode        = trim((string)($body['dress_code'] ?? ''));
$ceremonyVenue    = trim((string)($body['ceremony_venue'] ?? ''));
$ceremonyAddress  = trim((string)($body['ceremony_address'] ?? ''));
$ceremonyTime     = trim((string)($body['ceremony_time'] ?? ''));
$receptionVenue   = trim((string)($body['reception_venue'] ?? ''));
$receptionAddress = trim((string)($body['reception_address'] ?? ''));
$receptionDate    = trim((string)($body['reception_date'] ?? ''));
$receptionTime    = trim((string)($body['reception_time'] ?? ''));
$notes            = trim((string)($body['notes'] ?? ''));

/* ---------- validate ---------- */
$errors = [];

if ($partnerName !== '' && mb_strlen($partnerName) > 100) {
    $errors['partner_name'] = "Partner's name is too long.";
}

if ($weddingDate !== '' && !DateTime::createFromFormat('Y-m-d', $weddingDate)) {
    $errors['wedding_date'] = 'Enter a valid date.';
}

if ($theme !== '' && mb_strlen($theme) > 100) {
    $errors['theme'] = 'Theme is too long.';
}

if ($dressCode !== '' && mb_strlen($dressCode) > 100) {
    $errors['dress_code'] = 'Dress code is too long.';
}

if ($ceremonyVenue !== '' && mb_strlen($ceremonyVenue) > 150) {
    $errors['ceremony_venue'] = 'Venue name is too long.';
}
if ($ceremonyAddress !== '' && mb_strlen($ceremonyAddress) > 255) {
    $errors['ceremony_address'] = 'Address is too long.';
}
if ($ceremonyTime !== '' && !DateTime::createFromFormat('H:i', $ceremonyTime)) {
    $errors['ceremony_time'] = 'Enter a valid time.';
}

if ($receptionVenue !== '' && mb_strlen($receptionVenue) > 150) {
    $errors['reception_venue'] = 'Venue name is too long.';
}
if ($receptionAddress !== '' && mb_strlen($receptionAddress) > 255) {
    $errors['reception_address'] = 'Address is too long.';
}
if ($receptionDate !== '' && !DateTime::createFromFormat('Y-m-d', $receptionDate)) {
    $errors['reception_date'] = 'Enter a valid date.';
}
if ($receptionTime !== '' && !DateTime::createFromFormat('H:i', $receptionTime)) {
    $errors['reception_time'] = 'Enter a valid time.';
}

if (mb_strlen($notes) > 2000) {
    $errors['notes'] = 'Notes are too long (max 2000 characters).';
}

if (!empty($errors)) {
    respond(422, ['success' => false, 'message' => 'Please fix the errors below.', 'errors' => $errors]);
}

try {
    $pdo = db();

    $stmt = $pdo->prepare(
        'INSERT INTO wedding_details
            (user_id, partner_name, wedding_date, theme, dress_code,
             ceremony_venue, ceremony_address, ceremony_time,
             reception_venue, reception_address, reception_date, reception_time, notes)
         VALUES
            (:uid, :partner_name, :wedding_date, :theme, :dress_code,
             :ceremony_venue, :ceremony_address, :ceremony_time,
             :reception_venue, :reception_address, :reception_date, :reception_time, :notes)
         ON DUPLICATE KEY UPDATE
            partner_name      = VALUES(partner_name),
            wedding_date      = VALUES(wedding_date),
            theme             = VALUES(theme),
            dress_code        = VALUES(dress_code),
            ceremony_venue    = VALUES(ceremony_venue),
            ceremony_address  = VALUES(ceremony_address),
            ceremony_time     = VALUES(ceremony_time),
            reception_venue   = VALUES(reception_venue),
            reception_address = VALUES(reception_address),
            reception_date    = VALUES(reception_date),
            reception_time    = VALUES(reception_time),
            notes             = VALUES(notes)'
    );
    $stmt->execute([
        ':uid'               => $userId,
        ':partner_name'      => $partnerName !== '' ? $partnerName : null,
        ':wedding_date'      => $weddingDate !== '' ? $weddingDate : null,
        ':theme'             => $theme !== '' ? $theme : null,
        ':dress_code'        => $dressCode !== '' ? $dressCode : null,
        ':ceremony_venue'    => $ceremonyVenue !== '' ? $ceremonyVenue : null,
        ':ceremony_address'  => $ceremonyAddress !== '' ? $ceremonyAddress : null,
        ':ceremony_time'     => $ceremonyTime !== '' ? $ceremonyTime : null,
        ':reception_venue'   => $receptionVenue !== '' ? $receptionVenue : null,
        ':reception_address' => $receptionAddress !== '' ? $receptionAddress : null,
        ':reception_date'    => $receptionDate !== '' ? $receptionDate : null,
        ':reception_time'    => $receptionTime !== '' ? $receptionTime : null,
        ':notes'             => $notes !== '' ? $notes : null,
    ]);

    respond(200, [
        'success' => true,
        'message' => 'Your wedding details have been saved.',
    ]);

} catch (Throwable $e) {
    error_log('[WEDORA wedding_details_update] ' . $e->getMessage());
    respond(503, ['success' => false, 'message' => 'Could not save your wedding details right now. Please try again.']);
}
