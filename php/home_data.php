<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - home page data endpoint
   Returns the live number of registered couples and, if the
   visitor is signed in, their name for the header.
   Falls back to the CSV backup when MySQL is unavailable.
   ========================================================== */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

define('REGISTRATIONS_FILE', __DIR__ . '/../database/registrations.csv');

session_start();

$user = null;
if (!empty($_SESSION['user_email'])) {
    $name  = (string)($_SESSION['user_name'] ?? 'there');
    $parts = preg_split('/\s+/u', trim($name)) ?: ['there'];
    $user  = [
        'first_name' => $parts[0],
        'email'      => (string)$_SESSION['user_email'],
    ];
}

$couples = 0;
$source  = 'file';

try {
    $pdo = db();
    $couples = (int)$pdo->query('SELECT COUNT(*) FROM users')->fetchColumn();
    $source  = 'database';
} catch (Throwable $e) {
    // MySQL not running — count the rows in the CSV backup instead.
    if (is_readable(REGISTRATIONS_FILE)) {
        $fp = fopen(REGISTRATIONS_FILE, 'r');
        if ($fp) {
            $first = true;
            while (($row = fgetcsv($fp)) !== false) {
                if ($first) { $first = false; continue; }   // header row
                if ($row !== [null] && count(array_filter($row)) > 0) {
                    $couples++;
                }
            }
            fclose($fp);
        }
    }
}

echo json_encode([
    'success' => true,
    'source'  => $source,
    'user'    => $user,
    'stats'   => [
        'couples' => $couples,
        'tools'   => 4,
    ],
], JSON_UNESCAPED_UNICODE);
