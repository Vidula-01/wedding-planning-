<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - Wedding Details data endpoint
   Returns everything wedding-details.html needs as JSON,
   pulled live from the database for the logged-in user only.
   Mirrors the same pattern as dashboard_data.php / profile_data.php.
   ========================================================== */

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');

require_login_json();

$userId = (int)$_SESSION['user_id'];

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

try {
    $pdo = db();

    $stmt = $pdo->prepare('SELECT full_name FROM users WHERE id = :id LIMIT 1');
    $stmt->execute([':id' => $userId]);
    $user = $stmt->fetch();

    if (!$user) {
        respond(404, ['success' => false, 'message' => 'Account not found.']);
    }

    $stmt = $pdo->prepare('SELECT * FROM wedding_details WHERE user_id = :uid LIMIT 1');
    $stmt->execute([':uid' => $userId]);
    $wd = $stmt->fetch();

    if (!$wd) {
        /* first visit: create the blank row, same as dashboard_data.php does */
        $pdo->prepare(
            'INSERT INTO wedding_details (user_id, total_budget, spent_budget, guests_confirmed, vendors_saved)
             VALUES (:uid, 0, 0, 0, 0)'
        )->execute([':uid' => $userId]);

        $wd = [
            'partner_name'      => null,
            'wedding_date'      => null,
            'theme'             => null,
            'dress_code'        => null,
            'ceremony_venue'    => null,
            'ceremony_address'  => null,
            'ceremony_time'     => null,
            'reception_venue'   => null,
            'reception_address' => null,
            'reception_date'    => null,
            'reception_time'    => null,
            'notes'             => null,
        ];
    }

    /* ---------- days to go (same calculation as the Dashboard) ---------- */
    $daysToGo = null;
    if (!empty($wd['wedding_date'])) {
        $today    = new DateTime('today');
        $wedding  = new DateTime($wd['wedding_date']);
        $diff     = $today->diff($wedding);
        $daysToGo = $diff->invert ? 0 : (int)$diff->days;
    }

    $coupleName = $user['full_name'];
    if (!empty($wd['partner_name'])) {
        $coupleName = $user['full_name'] . ' & ' . $wd['partner_name'];
    }

    respond(200, [
        'success' => true,
        'user' => [
            'full_name'   => $user['full_name'],
            'couple_name' => $coupleName,
        ],
        'summary' => [
            'wedding_date' => !empty($wd['wedding_date']) ? date('jS F Y', strtotime((string)$wd['wedding_date'])) : 'Not set yet',
            'days_to_go'   => $daysToGo,
        ],
        'wedding' => [
            'partner_name'      => $wd['partner_name'] ?? '',
            'wedding_date'      => $wd['wedding_date'] ?? '',
            'theme'             => $wd['theme'] ?? '',
            'dress_code'        => $wd['dress_code'] ?? '',
            'ceremony_venue'    => $wd['ceremony_venue'] ?? '',
            'ceremony_address'  => $wd['ceremony_address'] ?? '',
            'ceremony_time'     => $wd['ceremony_time'] ?? '',
            'reception_venue'   => $wd['reception_venue'] ?? '',
            'reception_address' => $wd['reception_address'] ?? '',
            'reception_date'    => $wd['reception_date'] ?? '',
            'reception_time'    => $wd['reception_time'] ?? '',
            'notes'             => $wd['notes'] ?? '',
        ],
    ]);

} catch (Throwable $e) {
    error_log('[WEDORA wedding_details_data] ' . $e->getMessage());
    respond(503, ['success' => false, 'message' => 'Could not load your wedding details right now. Please make sure the database is set up (import database/wedora.sql) and try again.']);
}
