<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA - Dashboard data endpoint
   Returns everything dashboard.html needs as JSON, pulled
   live from the database for the logged-in user only.
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

    /* ---------- account + wedding details (create a blank row the first time) ---------- */
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

    /* ---------- days to go ---------- */
    $daysToGo = null;
    if (!empty($wd['wedding_date'])) {
        $today   = new DateTime('today');
        $wedding = new DateTime($wd['wedding_date']);
        $diff    = $today->diff($wedding);
        $daysToGo = $diff->invert ? 0 : (int)$diff->days;
    }

    /* ---------- tasks ---------- */
    $stmt = $pdo->prepare('SELECT COUNT(*) AS total, SUM(is_done) AS done FROM tasks WHERE user_id = :uid');
    $stmt->execute([':uid' => $userId]);
    $taskCounts    = $stmt->fetch();
    $tasksTotal    = (int)($taskCounts['total'] ?? 0);
    $tasksDone     = (int)($taskCounts['done'] ?? 0);
    $tasksProgress = $tasksTotal > 0 ? round(($tasksDone / $tasksTotal) * 100) : 0;

    $stmt = $pdo->prepare(
        'SELECT title, due_date, is_done FROM tasks
         WHERE user_id = :uid AND is_done = 0
         ORDER BY due_date IS NULL, due_date ASC, sort_order ASC
         LIMIT 5'
    );
    $stmt->execute([':uid' => $userId]);
    $upcomingTasks = array_map(function ($row) {
        return [
            'title'    => $row['title'],
            'due_date' => $row['due_date'] ? date('d M Y', strtotime($row['due_date'])) : '',
            'is_done'  => (bool)$row['is_done'],
        ];
    }, $stmt->fetchAll());

    /* ---------- budget ---------- */
    $totalBudget = (float)$wd['total_budget'];
    $spentBudget = (float)$wd['spent_budget'];
    $remaining   = max($totalBudget - $spentBudget, 0);
    $spentPct    = $totalBudget > 0 ? round(($spentBudget / $totalBudget) * 100) : 0;

    /* ---------- upcoming payments ---------- */
    $stmt = $pdo->prepare(
        "SELECT payment_name, amount, due_date FROM payments
         WHERE user_id = :uid AND status = 'upcoming'
         ORDER BY due_date IS NULL, due_date ASC
         LIMIT 5"
    );
    $stmt->execute([':uid' => $userId]);
    $upcomingPayments = array_map(function ($row) {
        return [
            'name'     => $row['payment_name'],
            'amount'   => 'Rs. ' . number_format((float)$row['amount']),
            'due_date' => $row['due_date'] ? date('d M Y', strtotime($row['due_date'])) : '',
        ];
    }, $stmt->fetchAll());

    /* ---------- assemble response ---------- */
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
        'wedding' => [
            'date'        => !empty($wd['wedding_date']) ? date('jS F Y', strtotime($wd['wedding_date'])) : 'Not set yet',
            'days_to_go'  => $daysToGo,
        ],
        'stats' => [
            'tasks_done'       => $tasksDone,
            'tasks_total'      => $tasksTotal,
            'tasks_progress'   => $tasksProgress,
            'budget_spent'     => 'Rs. ' . number_format($spentBudget),
            'budget_total'     => number_format($totalBudget),
            'budget_pct'       => $spentPct,
            'guests_confirmed' => (int)$wd['guests_confirmed'],
            'vendors_saved'    => (int)$wd['vendors_saved'],
        ],
        'budget_overview' => [
            'total'     => 'Rs. ' . number_format($totalBudget),
            'spent'     => 'Rs. ' . number_format($spentBudget),
            'remaining' => 'Rs. ' . number_format($remaining),
            'spent_pct' => $spentPct,
        ],
        'upcoming_tasks'    => $upcomingTasks,
        'upcoming_payments' => $upcomingPayments,
    ]);

} catch (Throwable $e) {
    error_log('[WEDORA dashboard_data] ' . $e->getMessage());
    respond(503, ['success' => false, 'message' => 'Could not load your dashboard right now. Please make sure the database is set up (import database/wedora.sql) and try again.']);
}
