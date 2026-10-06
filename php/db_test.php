<?php
declare(strict_types=1);

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

try {
    $pdo = db();

    $stmt = $pdo->query("SELECT DATABASE() AS db_name");
    $row = $stmt->fetch();

    echo json_encode([
        'success' => true,
        'message' => 'Database connection is working!',
        'database' => $row['db_name'] ?? null
    ], JSON_UNESCAPED_UNICODE);

} catch (Throwable $e) {
    http_response_code(500);

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}