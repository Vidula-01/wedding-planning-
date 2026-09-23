<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - Profile data endpoint
   Returns everything profile.html needs as JSON, pulled live
   from the database for the logged-in user only. Mirrors the
   same pattern as dashboard_data.php.
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

    $stmt = $pdo->prepare('SELECT id, full_name, email, phone, created_at FROM users WHERE id = :id LIMIT 1');
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
            'partner_name'     => null,
            'wedding_date'     => null,
            'total_budget'     => 0,
            'spent_budget'     => 0,
            'guests_confirmed' => 0,
            'vendors_saved'    => 0,
        ];
    }

    respond(200, [
        'success' => true,
        'user' => [
            'full_name'    => $user['full_name'],
            'email'        => $user['email'],
            'phone'        => $user['phone'],
            'member_since' => date('jS F Y', strtotime((string)$user['created_at'])),
        ],
        'wedding' => [
            'partner_name'     => $wd['partner_name'] ?? '',
            'wedding_date'     => $wd['wedding_date'] ?? '',
            'total_budget'     => (float)($wd['total_budget'] ?? 0),
            'spent_budget'     => (float)($wd['spent_budget'] ?? 0),
            'guests_confirmed' => (int)($wd['guests_confirmed'] ?? 0),
            'vendors_saved'    => (int)($wd['vendors_saved'] ?? 0),
        ],
    ]);

} catch (Throwable $e) {
    error_log('[WEDORA profile_data] ' . $e->getMessage());
    respond(503, ['success' => false, 'message' => 'Could not load your profile right now. Please make sure the database is set up (import database/wedora.sql) and try again.']);
}
