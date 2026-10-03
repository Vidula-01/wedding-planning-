<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
require_login_json();

function respond(int $status, array $data): void {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function body(): array {
    $raw = file_get_contents('php://input') ?: '{}';
    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}
try {
    $pdo = db();
    $uid = (int)$_SESSION['user_id'];
    $pdo->exec("CREATE TABLE IF NOT EXISTS payments (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT,
        user_id INT UNSIGNED NOT NULL,
        payment_name VARCHAR(200) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        due_date DATE NULL,
        status ENUM('upcoming','paid','overdue') NOT NULL DEFAULT 'upcoming',
        notes TEXT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (id), KEY idx_payments_user (user_id), KEY idx_payments_status (status), KEY idx_payments_due_date (due_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci");

    $method = $_SERVER['REQUEST_METHOD'];
    if ($method === 'GET') {
        $pdo->prepare("UPDATE payments SET status='overdue' WHERE user_id=:uid AND status='upcoming' AND due_date IS NOT NULL AND due_date < CURDATE()")->execute([':uid'=>$uid]);
        $stmt = $pdo->prepare("SELECT id,payment_name,amount,due_date,status,notes FROM payments WHERE user_id=:uid ORDER BY CASE status WHEN 'upcoming' THEN 1 WHEN 'overdue' THEN 2 ELSE 3 END, due_date IS NULL ASC, due_date ASC, id DESC");
        $stmt->execute([':uid'=>$uid]);
        respond(200, ['success'=>true,'payments'=>$stmt->fetchAll()]);
    }

    $data = body();
    if ($method === 'POST') {
        $name = trim((string)($data['payment_name'] ?? ''));
        $amount = (float)($data['amount'] ?? 0);
        $due = trim((string)($data['due_date'] ?? ''));
        $status = (string)($data['status'] ?? 'upcoming');
        $notes = trim((string)($data['notes'] ?? ''));
        if ($name === '') respond(422,['success'=>false,'message'=>'Payment name is required.']);
        if ($amount < 0) respond(422,['success'=>false,'message'=>'Amount cannot be negative.']);
        if ($due !== '' && !DateTime::createFromFormat('Y-m-d',$due)) respond(422,['success'=>false,'message'=>'Please select a valid due date.']);
        if (!in_array($status,['upcoming','paid','overdue'],true)) $status='upcoming';
        $stmt=$pdo->prepare('INSERT INTO payments(user_id,payment_name,amount,due_date,status,notes) VALUES(:uid,:name,:amount,:due,:status,:notes)');
        $stmt->execute([':uid'=>$uid,':name'=>$name,':amount'=>round($amount,2),':due'=>$due!==''?$due:null,':status'=>$status,':notes'=>$notes!==''?$notes:null]);
        respond(201,['success'=>true,'message'=>'Payment added successfully.','id'=>(int)$pdo->lastInsertId()]);
    }

    $id=(int)($_GET['id']??0);
    if ($id<=0) respond(422,['success'=>false,'message'=>'A valid payment id is required.']);
    if ($method === 'PUT') {
        $name=trim((string)($data['payment_name']??''));$amount=(float)($data['amount']??0);$due=trim((string)($data['due_date']??''));$status=(string)($data['status']??'upcoming');$notes=trim((string)($data['notes']??''));
        if($name==='')respond(422,['success'=>false,'message'=>'Payment name is required.']);
        if($amount<0)respond(422,['success'=>false,'message'=>'Amount cannot be negative.']);
        if($due!==''&&!DateTime::createFromFormat('Y-m-d',$due))respond(422,['success'=>false,'message'=>'Please select a valid due date.']);
        if(!in_array($status,['upcoming','paid','overdue'],true))$status='upcoming';
        $stmt=$pdo->prepare('UPDATE payments SET payment_name=:name,amount=:amount,due_date=:due,status=:status,notes=:notes WHERE id=:id AND user_id=:uid');
        $stmt->execute([':name'=>$name,':amount'=>round($amount,2),':due'=>$due!==''?$due:null,':status'=>$status,':notes'=>$notes!==''?$notes:null,':id'=>$id,':uid'=>$uid]);
        if(!$stmt->rowCount()){ $c=$pdo->prepare('SELECT id FROM payments WHERE id=:id AND user_id=:uid');$c->execute([':id'=>$id,':uid'=>$uid]);if(!$c->fetch())respond(404,['success'=>false,'message'=>'Payment not found.']); }
        respond(200,['success'=>true,'message'=>'Payment updated successfully.']);
    }
    if ($method === 'DELETE') {
        $stmt=$pdo->prepare('DELETE FROM payments WHERE id=:id AND user_id=:uid');$stmt->execute([':id'=>$id,':uid'=>$uid]);
        if(!$stmt->rowCount())respond(404,['success'=>false,'message'=>'Payment not found.']);
        respond(200,['success'=>true,'message'=>'Payment deleted successfully.']);
    }
    respond(405,['success'=>false,'message'=>'Method not allowed.']);
} catch(Throwable $e) {
    error_log('[WEDORA payments] '.$e->getMessage());
    respond(500,['success'=>false,'message'=>'Could not process payments right now.']);
}
