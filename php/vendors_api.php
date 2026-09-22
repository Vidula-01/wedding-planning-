<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - Vendors API
   One endpoint, several actions (?action=...):
     list    (GET)  - all vendors, or filtered by ?category=&q=
     get     (GET)  - single vendor by ?id=
     add     (POST) - create a vendor
     update  (POST) - update a vendor  (id in body)
     delete  (POST) - delete a vendor  (id in body)
   Always answers with JSON.
   ========================================================== */

require __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/* Allowed category values (keeps the filter tabs + dropdown in sync) */
const VENDOR_CATEGORIES = [
    'Photography', 'Videography', 'Venue', 'Catering',
    'Decorations', 'Florist', 'Others'
];

function readJsonOrPost(): array
{
    $raw = file_get_contents('php://input');
    if ($raw !== false && $raw !== '') {
        $decoded = json_decode($raw, true);
        if (is_array($decoded)) {
            return $decoded;
        }
    }
    return $_POST;
}

$action = $_GET['action'] ?? $_POST['action'] ?? '';

try {
    $pdo = db();
} catch (Throwable $e) {
    respond(503, ['success' => false, 'message' => 'Database unavailable. Please check the connection settings in php/config.php.']);
}

switch ($action) {

    /* ---------------------------------------------------- */
    case 'list': {
        $category = trim((string)($_GET['category'] ?? ''));
        $q        = trim((string)($_GET['q'] ?? ''));

        $sql    = 'SELECT id, name, category, contact, price, notes, created_at FROM vendors WHERE 1=1';
        $params = [];

        if ($category !== '' && $category !== 'All') {
            $sql .= ' AND category = :category';
            $params[':category'] = $category;
        }
        if ($q !== '') {
            $sql .= ' AND (name LIKE :q OR category LIKE :q OR contact LIKE :q)';
            $params[':q'] = '%' . $q . '%';
        }
        $sql .= ' ORDER BY created_at DESC, id DESC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $vendors = $stmt->fetchAll();

        respond(200, ['success' => true, 'vendors' => $vendors]);
    }

    /* ---------------------------------------------------- */
    case 'get': {
        $id = (int)($_GET['id'] ?? 0);
        if ($id <= 0) {
            respond(422, ['success' => false, 'message' => 'A valid vendor id is required.']);
        }
        $stmt = $pdo->prepare('SELECT id, name, category, contact, price, notes, created_at FROM vendors WHERE id = :id LIMIT 1');
        $stmt->execute([':id' => $id]);
        $vendor = $stmt->fetch();

        if (!$vendor) {
            respond(404, ['success' => false, 'message' => 'Vendor not found.']);
        }
        respond(200, ['success' => true, 'vendor' => $vendor]);
    }

    /* ---------------------------------------------------- */
    case 'add': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(405, ['success' => false, 'message' => 'Method not allowed.']);
        }
        $data = readJsonOrPost();

        [$clean, $errors] = validateVendorInput($data);
        if (!empty($errors)) {
            respond(422, ['success' => false, 'message' => 'Please fix the errors below.', 'errors' => $errors]);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO vendors (name, category, contact, price, notes)
             VALUES (:name, :category, :contact, :price, :notes)'
        );
        $stmt->execute([
            ':name'     => $clean['name'],
            ':category' => $clean['category'],
            ':contact'  => $clean['contact'],
            ':price'    => $clean['price'],
            ':notes'    => $clean['notes'],
        ]);

        respond(201, ['success' => true, 'message' => 'Vendor added successfully.', 'id' => (int)$pdo->lastInsertId()]);
    }

    /* ---------------------------------------------------- */
    case 'update': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(405, ['success' => false, 'message' => 'Method not allowed.']);
        }
        $data = readJsonOrPost();
        $id   = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            respond(422, ['success' => false, 'message' => 'A valid vendor id is required.']);
        }

        [$clean, $errors] = validateVendorInput($data);
        if (!empty($errors)) {
            respond(422, ['success' => false, 'message' => 'Please fix the errors below.', 'errors' => $errors]);
        }

        $stmt = $pdo->prepare(
            'UPDATE vendors
             SET name = :name, category = :category, contact = :contact, price = :price, notes = :notes
             WHERE id = :id'
        );
        $stmt->execute([
            ':name'     => $clean['name'],
            ':category' => $clean['category'],
            ':contact'  => $clean['contact'],
            ':price'    => $clean['price'],
            ':notes'    => $clean['notes'],
            ':id'       => $id,
        ]);

        if ($stmt->rowCount() === 0) {
            $check = $pdo->prepare('SELECT id FROM vendors WHERE id = :id');
            $check->execute([':id' => $id]);
            if (!$check->fetch()) {
                respond(404, ['success' => false, 'message' => 'Vendor not found.']);
            }
        }

        respond(200, ['success' => true, 'message' => 'Vendor updated successfully.']);
    }

    /* ---------------------------------------------------- */
    case 'delete': {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            respond(405, ['success' => false, 'message' => 'Method not allowed.']);
        }
        $data = readJsonOrPost();
        $id   = (int)($data['id'] ?? 0);
        if ($id <= 0) {
            respond(422, ['success' => false, 'message' => 'A valid vendor id is required.']);
        }

        $stmt = $pdo->prepare('DELETE FROM vendors WHERE id = :id');
        $stmt->execute([':id' => $id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ['success' => false, 'message' => 'Vendor not found.']);
        }

        respond(200, ['success' => true, 'message' => 'Vendor deleted successfully.']);
    }

    /* ---------------------------------------------------- */
    default:
        respond(400, ['success' => false, 'message' => 'Unknown or missing action.']);
}

/* ==========================================================
   Shared input validation for add / update
   ========================================================== */
function validateVendorInput(array $data): array
{
    $errors = [];

    $name     = trim((string)($data['name'] ?? ''));
    $category = trim((string)($data['category'] ?? ''));
    $contact  = trim((string)($data['contact'] ?? ''));
    $priceRaw = trim((string)($data['price'] ?? ''));
    $notes    = trim((string)($data['notes'] ?? ''));

    if ($name === '') {
        $errors['name'] = 'Vendor name is required.';
    } elseif (mb_strlen($name) > 150) {
        $errors['name'] = 'Vendor name is too long.';
    }

    if ($category === '' || !in_array($category, VENDOR_CATEGORIES, true)) {
        $errors['category'] = 'Please choose a valid category.';
    }

    if ($contact === '') {
        $errors['contact'] = 'Contact number is required.';
    } elseif (mb_strlen($contact) > 30) {
        $errors['contact'] = 'Contact number is too long.';
    }

    if ($priceRaw === '' || !is_numeric($priceRaw) || (float)$priceRaw < 0) {
        $errors['price'] = 'Enter a valid price.';
    }

    $clean = [
        'name'     => $name,
        'category' => $category,
        'contact'  => $contact,
        'price'    => $priceRaw !== '' && is_numeric($priceRaw) ? (float)$priceRaw : 0,
        'notes'    => $notes !== '' ? $notes : null,
    ];

    return [$clean, $errors];
}
