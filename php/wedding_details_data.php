<?php
declare(strict_types=1);

require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';

header('Content-Type: application/json; charset=utf-8');

require_login_json();

$userId = (int) $_SESSION['user_id'];

function respond(int $status, array $data): void
{
    http_response_code($status);

    echo json_encode(
        $data,
        JSON_UNESCAPED_UNICODE
    );

    exit;
}

try {

    $pdo = db();

    /*
     * Get wedding details for
     * currently logged-in user
     */

    $stmt = $pdo->prepare(
        'SELECT
            bride_name,
            groom_name,
            wedding_date,
            wedding_venue,
            wedding_type,
            expected_guests,
            estimated_budget,
            theme_notes,
            photo_path
         FROM wedding_details
         WHERE user_id = :user_id
         LIMIT 1'
    );

    $stmt->execute([
        ':user_id' => $userId
    ]);

    $wedding = $stmt->fetch();

    /*
     * If no record exists,
     * create one for this user.
     */

    if (!$wedding) {

        $insert = $pdo->prepare(
            'INSERT INTO wedding_details
            (
                user_id,
                bride_name,
                groom_name,
                wedding_date,
                wedding_venue,
                wedding_type,
                expected_guests,
                estimated_budget,
                theme_notes,
                photo_path
            )
            VALUES
            (
                :user_id,
                NULL,
                NULL,
                NULL,
                NULL,
                NULL,
                0,
                0,
                NULL,
                NULL
            )'
        );

        $insert->execute([
            ':user_id' => $userId
        ]);

        $wedding = [
            'bride_name'       => '',
            'groom_name'       => '',
            'wedding_date'     => '',
            'wedding_venue'    => '',
            'wedding_type'     => '',
            'expected_guests'  => 0,
            'estimated_budget' => 0,
            'theme_notes'      => '',
            'photo_path'       => ''
        ];
    }

    respond(200, [
        'success' => true,
        'wedding' => $wedding
    ]);

} catch (Throwable $e) {

    error_log(
        '[WEDORA wedding_details_data] ' .
        $e->getMessage()
    );

    respond(500, [
        'success' => false,
        'message' => 'Could not load wedding details.',
        'error'   => $e->getMessage()
    ]);
}