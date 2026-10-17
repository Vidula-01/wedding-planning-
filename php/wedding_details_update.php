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

/* ================= READ JSON ================= */

$input = json_decode(
    file_get_contents('php://input'),
    true
);

if (!is_array($input)) {
    respond(400, [
        'success' => false,
        'message' => 'Invalid request.'
    ]);
}

/* ================= INPUT ================= */

$brideName = trim(
    (string)($input['bride_name'] ?? '')
);

$groomName = trim(
    (string)($input['groom_name'] ?? '')
);

$weddingDate = trim(
    (string)($input['wedding_date'] ?? '')
);

$weddingVenue = trim(
    (string)($input['wedding_venue'] ?? '')
);

$weddingType = trim(
    (string)($input['wedding_type'] ?? '')
);

$expectedGuests = (int)(
    $input['expected_guests'] ?? 0
);

$estimatedBudget = (float)(
    $input['estimated_budget'] ?? 0
);

$themeNotes = trim(
    (string)($input['theme_notes'] ?? '')
);

/* ================= VALIDATION ================= */

$errors = [];

if ($brideName === '') {
    $errors['bride_name'] =
        'Please enter bride name.';
}

if ($groomName === '') {
    $errors['groom_name'] =
        'Please enter groom name.';
}

if ($weddingDate === '' || !DateTime::createFromFormat('Y-m-d', $weddingDate)) {
    $errors['wedding_date'] = 'Please select a valid wedding date.';
}

if ($weddingVenue === '') {
    $errors['wedding_venue'] =
        'Please enter wedding venue.';
}

if ($expectedGuests < 0) {
    $errors['expected_guests'] =
        'Invalid guest count.';
}

if ($estimatedBudget < 0) {
    $errors['estimated_budget'] =
        'Invalid budget.';
}

if (!empty($errors)) {

    respond(422, [
        'success' => false,
        'message' =>
            'Please fix the errors below.',
        'errors' => $errors
    ]);
}

/* ================= SAVE ================= */

try {

    $pdo = db();

    /* Check whether this user already has wedding details */

    $check = $pdo->prepare(
        'SELECT id
         FROM wedding_details
         WHERE user_id = :user_id
         LIMIT 1'
    );

    $check->execute([
        ':user_id' => $userId
    ]);

    $existing = $check->fetch();

    if ($existing) {

        /* ================= UPDATE ================= */

        $stmt = $pdo->prepare(
            'UPDATE wedding_details
             SET
                bride_name = :bride_name,
                groom_name = :groom_name,
                wedding_date = :wedding_date,
                wedding_venue = :wedding_venue,
                wedding_type = :wedding_type,
                expected_guests = :expected_guests,
                estimated_budget = :estimated_budget,
                theme_notes = :theme_notes,

                partner_name = :partner_name,
                total_budget = :total_budget

             WHERE user_id = :user_id'
        );

    } else {

        /* ================= INSERT ================= */

        $stmt = $pdo->prepare(
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
                partner_name,
                total_budget,
                spent_budget,
                guests_confirmed,
                vendors_saved,
                photo_path
            )
            VALUES
            (
                :user_id,
                :bride_name,
                :groom_name,
                :wedding_date,
                :wedding_venue,
                :wedding_type,
                :expected_guests,
                :estimated_budget,
                :theme_notes,
                :partner_name,
                :total_budget,
                0,
                0,
                0,
                NULL
            )'
        );
    }

    $stmt->execute([

        ':user_id' =>
            $userId,

        ':bride_name' =>
            $brideName,

        ':groom_name' =>
            $groomName,

        ':wedding_date' =>
            $weddingDate,

        ':wedding_venue' =>
            $weddingVenue,

        ':wedding_type' =>
            $weddingType,

        ':expected_guests' =>
            $expectedGuests,

        ':estimated_budget' =>
            $estimatedBudget,

        ':theme_notes' =>
            $themeNotes,

        ':partner_name' =>
            $groomName,

        ':total_budget' =>
            $estimatedBudget
    ]);

    respond(200, [

        'success' => true,

        'message' =>
            'Wedding details saved successfully!'

    ]);

} catch (Throwable $e) {

    error_log(
        '[WEDORA wedding_details_update] ' .
        $e->getMessage()
    );

    respond(500, [

        'success' => false,

        'message' =>
            'Could not save wedding details.',

        'error' =>
            $e->getMessage()

    ]);
}