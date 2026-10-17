<?php
declare(strict_types=1);
require __DIR__ . '/config.php'; require __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8'); require_login_json();
function respond(int $code,array $data):void{http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE);exit;}
if($_SERVER['REQUEST_METHOD']!=='POST')respond(405,['success'=>false,'message'=>'Method not allowed.']);
$body=json_decode(file_get_contents('php://input')?:'{}',true); if(!is_array($body))$body=$_POST;
$current=(string)($body['current_password']??'');$new=(string)($body['new_password']??'');$confirm=(string)($body['confirm_password']??'');$errors=[];
if($current==='')$errors['current_password']='Enter your current password.';
if(strlen($new)<8)$errors['new_password']='New password must be at least 8 characters.';
if($confirm===''||$new!==$confirm)$errors['confirm_password']='Passwords do not match.';
if($errors)respond(422,['success'=>false,'message'=>'Please fix the errors below.','errors'=>$errors]);
try{$pdo=db();$uid=(int)$_SESSION['user_id'];$s=$pdo->prepare('SELECT password_hash FROM users WHERE id=:id LIMIT 1');$s->execute([':id'=>$uid]);$u=$s->fetch();if(!$u||!password_verify($current,(string)$u['password_hash']))respond(422,['success'=>false,'message'=>'Please fix the errors below.','errors'=>['current_password'=>'Current password is incorrect.']]);$hash=password_hash($new,PASSWORD_DEFAULT);$pdo->prepare('UPDATE users SET password_hash=:hash WHERE id=:id')->execute([':hash'=>$hash,':id'=>$uid]);respond(200,['success'=>true,'message'=>'Password updated successfully.']);}catch(Throwable $e){error_log('[WEDORA change_password] '.$e->getMessage());respond(500,['success'=>false,'message'=>'Could not update your password right now.']);}
