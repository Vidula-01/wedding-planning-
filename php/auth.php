<?php
declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

function require_login_json(): void
{
    if (empty($_SESSION['user_id'])) {
        http_response_code(401);

        header('Content-Type: application/json; charset=utf-8');

        echo json_encode([
            'success' => false,
            'message' => 'You must be logged in to access this data.'
        ], JSON_UNESCAPED_UNICODE);

        exit;
    }
}
?>