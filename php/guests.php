<?php
declare(strict_types=1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') { http_response_code(204); exit; }

require_once __DIR__ . '/config.php';

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

/* ── helper ── */
function respond(array $data, int $status = 200): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Resolve the logged-in user's id from the PHP session only.
 * Never trust a user_id sent via $_GET/$_POST/JSON body — the
 * session (populated by php/login.php) is the sole source of truth.
 * Returns null when nobody is logged in.
 */
function getSessionUserId(): ?int {
    if (empty($_SESSION['user_id'])) {
        return null;
    }
    return (int)$_SESSION['user_id'];
}

/* ────────────────────────────── ROUTER ────────────────────────────── */
try {
    $uid = getSessionUserId();
    if ($uid === null) {
        respond(['success' => false, 'message' => 'Not logged in. Please log in again.'], 401);
    }

    $pdo = db();

    switch ($action) {

        /* ── GET /php/guests.php?action=list ── */
        case 'list':
            $where   = 'WHERE g.user_id = :uid';
            $params  = [':uid' => $uid];

            if (!empty($_GET['search'])) {
                $where  .= ' AND g.name LIKE :search';
                $params[':search'] = '%' . $_GET['search'] . '%';
            }
            if (!empty($_GET['side']) && $_GET['side'] !== 'All Side') {
                $where  .= ' AND g.side = :side';
                $params[':side'] = $_GET['side'];
            }
            if (!empty($_GET['status']) && $_GET['status'] !== 'All Status') {
                $where  .= ' AND g.rsvp = :rsvp';
                $params[':rsvp'] = $_GET['status'];
            }
            if (!empty($_GET['category']) && $_GET['category'] !== 'All Category') {
                $where  .= ' AND g.category = :category';
                $params[':category'] = $_GET['category'];
            }

            $stmt = $pdo->prepare("SELECT * FROM guests g $where ORDER BY g.created_at DESC");
            $stmt->execute($params);
            $guests = $stmt->fetchAll();

            // summary counts
            $cStmt = $pdo->prepare("
                SELECT
                    COUNT(*) AS total,
                    SUM(rsvp = 'Confirmed')     AS confirmed,
                    SUM(rsvp = 'Pending')       AS pending,
                    SUM(rsvp = 'Not Attending') AS not_attending
                FROM guests WHERE user_id = :uid
            ");
            $cStmt->execute([':uid' => $uid]);
            $counts = $cStmt->fetch();

            respond(['success' => true, 'guests' => $guests, 'counts' => $counts]);

        /* ── POST /php/guests.php?action=add ── */
        case 'add':
            $data = json_decode(file_get_contents('php://input'), true);
            if (empty($data['name'])) respond(['success' => false, 'message' => 'Name is required.'], 422);

            $stmt = $pdo->prepare("
                INSERT INTO guests (user_id, name, side, category, invitation, rsvp, phone, email, notes)
                VALUES (:uid, :name, :side, :category, :invitation, :rsvp, :phone, :email, :notes)
            ");
            $stmt->execute([
                ':uid'        => $uid,
                ':name'       => trim($data['name']),
                ':side'       => $data['side']       ?? 'Bride Side',
                ':category'   => $data['category']   ?? 'Family',
                ':invitation' => $data['invitation'] ?? 'Not Sent',
                ':rsvp'       => $data['rsvp']       ?? 'Pending',
                ':phone'      => $data['phone']      ?? null,
                ':email'      => $data['email']      ?? null,
                ':notes'      => $data['notes']      ?? null,
            ]);
            respond(['success' => true, 'id' => (int)$pdo->lastInsertId(), 'message' => 'Guest added.']);

        /* ── PUT /php/guests.php?action=update&id=X ── */
        case 'update':
            $id   = (int)($_GET['id'] ?? 0);
            $data = json_decode(file_get_contents('php://input'), true);
            if (!$id) respond(['success' => false, 'message' => 'Invalid id.'], 422);

            $stmt = $pdo->prepare("
                UPDATE guests SET
                    name = :name, side = :side, category = :category,
                    invitation = :invitation, rsvp = :rsvp,
                    phone = :phone, email = :email, notes = :notes
                WHERE id = :id AND user_id = :uid
            ");
            $stmt->execute([
                ':name'       => trim($data['name']),
                ':side'       => $data['side']       ?? 'Bride Side',
                ':category'   => $data['category']   ?? 'Family',
                ':invitation' => $data['invitation'] ?? 'Not Sent',
                ':rsvp'       => $data['rsvp']       ?? 'Pending',
                ':phone'      => $data['phone']      ?? null,
                ':email'      => $data['email']      ?? null,
                ':notes'      => $data['notes']      ?? null,
                ':id'         => $id,
                ':uid'        => $uid,
            ]);
            respond(['success' => true, 'message' => 'Guest updated.']);

        /* ── DELETE /php/guests.php?action=delete&id=X ── */
        case 'delete':
            $id = (int)($_GET['id'] ?? 0);
            if (!$id) respond(['success' => false, 'message' => 'Invalid id.'], 422);
            $stmt = $pdo->prepare("DELETE FROM guests WHERE id = :id AND user_id = :uid");
            $stmt->execute([':id' => $id, ':uid' => $uid]);
            respond(['success' => true, 'message' => 'Guest deleted.']);

        default:
            respond(['success' => false, 'message' => 'Unknown action.'], 400);
    }
} catch (PDOException $e) {
    respond(['success' => false, 'message' => 'Database error: ' . $e->getMessage()], 500);
}
