<?php
declare(strict_types=1);

/* ==========================================================
   WEDORA – Tasks REST API
   Auto-creates tasks table and seeds sample rows if empty.
   Endpoints:
     GET    tasks.php                  → list all tasks (optional: ?status=To+Do&priority=High)
     GET    tasks.php?id=5             → fetch single task
     POST   tasks.php   (JSON body)    → create task
     PUT    tasks.php?id=5 (JSON body) → update task
     DELETE tasks.php?id=5             → delete task
   ========================================================== */

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

require_once __DIR__ . '/config.php';

// ---------- CORS / headers ----------
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

// ---------- Helper: send JSON response ----------
function respond(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit;
}

// ---------- Helper: read JSON body ----------
function jsonBody(): array
{
    $raw = file_get_contents('php://input');
    $data = json_decode($raw ?: '{}', true);
    return is_array($data) ? $data : [];
}

// ---------- Validate & sanitise priority / status ----------
function validPriority(string $v): string
{
    return in_array($v, ['Low', 'Medium', 'High'], true) ? $v : 'Medium';
}

function validStatus(string $v): string
{
    return in_array($v, ['To Do', 'In Progress', 'Completed'], true) ? $v : 'To Do';
}

// ---------- Format date: 2026-05-25 -> 25 May 2026 ----------
function formatDate(?string $date): string
{
    if (!$date || $date === '0000-00-00') {
        return '';
    }
    $ts = strtotime($date);
    return $ts ? date('d M Y', $ts) : $date;
}

// ---------- Ensure tasks table & initial sample rows exist ----------
function ensureTasksTable(PDO $pdo): void
{
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS tasks (
          id          INT UNSIGNED   NOT NULL AUTO_INCREMENT,
          user_id     INT UNSIGNED   NULL,
          title       VARCHAR(200)   NOT NULL,
          category    VARCHAR(100)   NOT NULL DEFAULT 'General',
          due_date    DATE           NULL,
          priority    ENUM('Low','Medium','High') NOT NULL DEFAULT 'Medium',
          status      ENUM('To Do','In Progress','Completed') NOT NULL DEFAULT 'To Do',
          notes       TEXT           NULL,
          created_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at  TIMESTAMP      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          KEY fk_tasks_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ");

    // Check count
    $count = (int) $pdo->query("SELECT COUNT(*) FROM tasks")->fetchColumn();
    if ($count === 0) {
        $pdo->exec("
            INSERT INTO tasks (user_id, title, category, due_date, priority, status) VALUES
            (NULL, 'Book Wedding Hotel',   'Venue',         '2026-05-25', 'High',   'Completed'),
            (NULL, 'Select Photographer',  'Photography',   '2026-05-30', 'High',   'Completed'),
            (NULL, 'Order Wedding Cake',   'Food',          '2026-06-05', 'Medium', 'To Do'),
            (NULL, 'Send Invitations',     'Stationery',    '2026-06-10', 'Medium', 'To Do'),
            (NULL, 'Bridal Dress Fitting', 'Attire',        '2026-06-15', 'Low',    'To Do'),
            (NULL, 'Book DJ / Band',       'Entertainment', '2026-06-20', 'Low',    'To Do');
        ");
    }
}

// ==========================================================
//  Route
// ==========================================================
$method = $_SERVER['REQUEST_METHOD'];

try {
    $pdo = db();
    ensureTasksTable($pdo);
} catch (Throwable $e) {
    respond(500, ['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()]);
}

switch ($method) {

    // -------------------------------------------------------
    //  GET – list tasks OR fetch single task
    // -------------------------------------------------------
    case 'GET':
        // Single task by id
        if (isset($_GET['id'])) {
            $id   = (int) $_GET['id'];
            $stmt = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
            $stmt->execute([$id]);
            $task = $stmt->fetch();
            if (!$task) {
                respond(404, ['success' => false, 'message' => 'Task not found']);
            }
            $task['formatted_due_date'] = formatDate($task['due_date'] ?? null);
            respond(200, ['success' => true, 'data' => $task]);
        }

        // List tasks
        $userId   = isset($_GET['user_id']) ? (int) $_GET['user_id'] : (int) ($_SESSION['user_id'] ?? 0);
        $status   = trim((string) ($_GET['status']   ?? ''));
        $priority = trim((string) ($_GET['priority'] ?? ''));
        $search   = trim((string) ($_GET['search']   ?? ''));

        $sql    = 'SELECT * FROM tasks WHERE 1=1';
        $params = [];

        if ($userId > 0) {
            $sql .= ' AND (user_id = ? OR user_id IS NULL)';
            $params[] = $userId;
        }

        if ($status !== '' && strtolower($status) !== 'all') {
            $sql .= ' AND status = ?';
            $params[] = validStatus($status);
        }

        if ($priority !== '' && strtolower($priority) !== 'all') {
            $sql .= ' AND priority = ?';
            $params[] = validPriority($priority);
        }

        if ($search !== '') {
            $sql .= ' AND (title LIKE ? OR category LIKE ?)';
            $params[] = "%$search%";
            $params[] = "%$search%";
        }

        $sql .= ' ORDER BY due_date ASC, id ASC';

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $tasks = $stmt->fetchAll();

        foreach ($tasks as &$task) {
            $task['formatted_due_date'] = formatDate($task['due_date'] ?? null);
        }
        unset($task);

        respond(200, [
            'success' => true,
            'data'    => $tasks,
            'count'   => count($tasks)
        ]);
        break;

    // -------------------------------------------------------
    //  POST – create a new task
    // -------------------------------------------------------
    case 'POST':
        $body = jsonBody();

        $userId   = isset($body['user_id']) && (int)$body['user_id'] > 0
                    ? (int)$body['user_id']
                    : ($_SESSION['user_id'] ?? null);
        $title    = trim((string) ($body['title']    ?? ''));
        $category = trim((string) ($body['category'] ?? 'General'));
        $dueDate  = trim((string) ($body['due_date'] ?? ''));
        $priority = validPriority((string) ($body['priority'] ?? 'Medium'));
        $status   = validStatus((string)   ($body['status']   ?? 'To Do'));
        $notes    = trim((string) ($body['notes']    ?? ''));

        if ($title === '') {
            respond(400, ['success' => false, 'message' => 'Task title is required.']);
        }

        $stmt = $pdo->prepare(
            'INSERT INTO tasks (user_id, title, category, due_date, priority, status, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?)'
        );
        $stmt->execute([
            $userId ?: null,
            $title,
            $category ?: 'General',
            $dueDate ?: null,
            $priority,
            $status,
            $notes ?: null,
        ]);

        $newId = (int) $pdo->lastInsertId();
        $row   = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
        $row->execute([$newId]);
        $task  = $row->fetch();
        if ($task) {
            $task['formatted_due_date'] = formatDate($task['due_date'] ?? null);
        }

        respond(201, ['success' => true, 'message' => 'Task created successfully', 'data' => $task]);
        break;

    // -------------------------------------------------------
    //  PUT – update an existing task (or toggle status)
    // -------------------------------------------------------
    case 'PUT':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            $body = jsonBody();
            $id = (int) ($body['id'] ?? 0);
        }

        if ($id <= 0) {
            respond(400, ['success' => false, 'message' => 'Task id is required.']);
        }

        $body = jsonBody();
        $allowed = ['title', 'category', 'due_date', 'priority', 'status', 'notes'];
        $setClauses = [];
        $params     = [];

        foreach ($allowed as $field) {
            if (array_key_exists($field, $body)) {
                $val = $body[$field];
                if ($field === 'priority') $val = validPriority((string) $val);
                if ($field === 'status')   $val = validStatus((string)   $val);
                $setClauses[] = "`$field` = ?";
                $params[]     = ($val === '' ? null : $val);
            }
        }

        if (empty($setClauses)) {
            respond(400, ['success' => false, 'message' => 'No fields provided to update.']);
        }

        $params[] = $id;
        $sql = 'UPDATE tasks SET ' . implode(', ', $setClauses) . ' WHERE id = ?';
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);

        $row = $pdo->prepare('SELECT * FROM tasks WHERE id = ?');
        $row->execute([$id]);
        $task = $row->fetch();
        if ($task) {
            $task['formatted_due_date'] = formatDate($task['due_date'] ?? null);
        }

        respond(200, ['success' => true, 'message' => 'Task updated successfully', 'data' => $task]);
        break;

    // -------------------------------------------------------
    //  DELETE – remove a task
    // -------------------------------------------------------
    case 'DELETE':
        $id = (int) ($_GET['id'] ?? 0);
        if ($id <= 0) {
            $body = jsonBody();
            $id = (int) ($body['id'] ?? 0);
        }

        if ($id <= 0) {
            respond(400, ['success' => false, 'message' => 'Task id is required.']);
        }

        $stmt = $pdo->prepare('DELETE FROM tasks WHERE id = ?');
        $stmt->execute([$id]);

        if ($stmt->rowCount() === 0) {
            respond(404, ['success' => false, 'message' => 'Task not found.']);
        }

        respond(200, ['success' => true, 'message' => 'Task deleted successfully.']);
        break;

    default:
        respond(405, ['success' => false, 'message' => 'Method not allowed.']);
}
