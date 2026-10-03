<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA – Budget REST API (per logged-in user)
     GET    budget.php            → items + summary
     POST   budget.php  (JSON)    → add expense {category, estimated, actual, is_paid}
     PUT    budget.php?id=5 (JSON)→ update any of the fields above
     DELETE budget.php?id=5       → delete expense
   ========================================================== */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once __DIR__ . '/config.php';

header('Content-Type: application/json; charset=utf-8');

function respond(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonBody(): array
{
    $data = json_decode(file_get_contents('php://input') ?: '{}', true);
    return is_array($data) ? $data : [];
}

function money($v): float
{
    return max(0.0, round((float)$v, 2));
}

function syncSpentBudget(PDO $pdo, int $uid): void
{
    $s = $pdo->prepare('SELECT COALESCE(SUM(actual),0) FROM budget_items WHERE user_id = ?');
    $s->execute([$uid]);
    $spent = (float)$s->fetchColumn();
    $w = $pdo->prepare('SELECT id FROM wedding_details WHERE user_id = ? LIMIT 1');
    $w->execute([$uid]);
    if ($w->fetch()) {
        $pdo->prepare('UPDATE wedding_details SET spent_budget = ? WHERE user_id = ?')->execute([$spent, $uid]);
    } else {
        $pdo->prepare('INSERT INTO wedding_details (user_id, spent_budget) VALUES (?, ?)')->execute([$uid, $spent]);
    }
}

/* Total budget = wedding_details.total_budget (set on Wedding Details page).
   If it is not set yet, fall back to the sum of the estimates. */
function summary(PDO $pdo, int $uid): array
{
    $s = $pdo->prepare('SELECT COALESCE(SUM(estimated),0) AS est, COALESCE(SUM(actual),0) AS act
                        FROM budget_items WHERE user_id = ?');
    $s->execute([$uid]);
    $r = $s->fetch();
    $est = (float)$r['est'];
    $act = (float)$r['act'];

    $total = 0.0;
    try {
        $t = $pdo->prepare('SELECT total_budget FROM wedding_details WHERE user_id = ? LIMIT 1');
        $t->execute([$uid]);
        $total = (float)($t->fetchColumn() ?: 0);
    } catch (Throwable $e) { /* wedding_details not created yet */ }
    if ($total <= 0) {
        $total = $est;
    }

    return [
        'total_budget' => $total,
        'total_spent'  => $act,
        'remaining'    => $total - $act,
        'percent_used' => $total > 0 ? (int)round($act / $total * 100) : 0,
    ];
}

if (empty($_SESSION['user_id'])) {
    respond(401, ['success' => false, 'message' => 'Not logged in. Please log in again.']);
}
$uid = (int)$_SESSION['user_id'];

try {
    $pdo = db();
    $pdo->exec("CREATE TABLE IF NOT EXISTS budget_items (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        category VARCHAR(100) NOT NULL,
        estimated DECIMAL(12,2) NOT NULL DEFAULT 0,
        actual DECIMAL(12,2) NOT NULL DEFAULT 0,
        is_paid TINYINT(1) NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id), KEY fk_budget_user (user_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    switch ($_SERVER['REQUEST_METHOD']) {

        case 'GET':
            $st = $pdo->prepare('SELECT id, category, estimated, actual, is_paid
                                 FROM budget_items WHERE user_id = ? ORDER BY id ASC');
            $st->execute([$uid]);
            $items = array_map(static fn($r) => [
                'id'        => (int)$r['id'],
                'category'  => $r['category'],
                'estimated' => (float)$r['estimated'],
                'actual'    => (float)$r['actual'],
                'is_paid'   => (bool)$r['is_paid'],
            ], $st->fetchAll());
            respond(200, ['success' => true, 'data' => $items, 'summary' => summary($pdo, $uid)]);

        case 'POST':
            $b = jsonBody();
            $category = trim((string)($b['category'] ?? ''));
            if ($category === '') {
                respond(400, ['success' => false, 'message' => 'Category is required.']);
            }
            $pdo->prepare('INSERT INTO budget_items (user_id, category, estimated, actual, is_paid)
                           VALUES (?, ?, ?, ?, ?)')
                ->execute([$uid, mb_substr($category, 0, 100), money($b['estimated'] ?? 0),
                           money($b['actual'] ?? 0), empty($b['is_paid']) ? 0 : 1]);
            syncSpentBudget($pdo, $uid);
            respond(201, ['success' => true, 'message' => 'Expense added.']);

        case 'PUT':
            $id = (int)($_GET['id'] ?? 0);
            $b  = jsonBody();
            $set = []; $params = [];
            if (isset($b['category']))  { $set[] = 'category = ?';  $params[] = mb_substr(trim((string)$b['category']), 0, 100); }
            if (isset($b['estimated'])) { $set[] = 'estimated = ?'; $params[] = money($b['estimated']); }
            if (isset($b['actual']))    { $set[] = 'actual = ?';    $params[] = money($b['actual']); }
            if (isset($b['is_paid']))   { $set[] = 'is_paid = ?';   $params[] = $b['is_paid'] ? 1 : 0; }
            if ($id <= 0 || !$set) {
                respond(400, ['success' => false, 'message' => 'Expense id and at least one field are required.']);
            }
            $params[] = $id; $params[] = $uid;
            $pdo->prepare('UPDATE budget_items SET ' . implode(', ', $set) . ' WHERE id = ? AND user_id = ?')
                ->execute($params);
            syncSpentBudget($pdo, $uid);
            respond(200, ['success' => true, 'message' => 'Expense updated.']);

        case 'DELETE':
            $id = (int)($_GET['id'] ?? 0);
            $st = $pdo->prepare('DELETE FROM budget_items WHERE id = ? AND user_id = ?');
            $st->execute([$id, $uid]);
            if ($st->rowCount() === 0) {
                respond(404, ['success' => false, 'message' => 'Expense not found.']);
            }
            syncSpentBudget($pdo, $uid);
            respond(200, ['success' => true, 'message' => 'Expense deleted.']);

        default:
            respond(405, ['success' => false, 'message' => 'Method not allowed.']);
    }
} catch (Throwable $e) {
    respond(500, ['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
}
