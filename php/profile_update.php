<?php
declare(strict_types=1);
require __DIR__ . '/config.php'; require __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8'); require_login_json();
function respond(int $code,array $data):void{http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE);exit;}
if($_SERVER['REQUEST_METHOD']!=='POST')respond(405,['success'=>false,'message'=>'Method not allowed.']);
$body=json_decode(file_get_contents('php://input')?:'{}',true); if(!is_array($body))$body=$_POST;
$uid=(int)$_SESSION['user_id'];
$pdo=db();
$cols=$pdo->query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users'")->fetchAll(PDO::FETCH_COLUMN);
if(!in_array('address',$cols,true)) $pdo->exec("ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL AFTER phone");
if(!in_array('date_of_birth',$cols,true)) $pdo->exec("ALTER TABLE users ADD COLUMN date_of_birth DATE NULL AFTER address");
$name=trim((string)($body['full_name']??'')); $email=strtolower(trim((string)($body['email']??''))); $phone=trim((string)($body['phone']??'')); $address=trim((string)($body['address']??'')); $dob=trim((string)($body['date_of_birth']??'')); $errors=[];
if($name==='')$errors['full_name']='Please enter your full name.'; elseif(mb_strlen($name)>100)$errors['full_name']='Full name is too long.';
if($email===''||!filter_var($email,FILTER_VALIDATE_EMAIL))$errors['email']='Enter a valid email address.';
if($phone===''||!preg_match('/^[0-9+\-\s()]{7,20}$/',$phone))$errors['phone']='Enter a valid phone number.';
if(mb_strlen($address)>255)$errors['address']='Address is too long.';
if($dob!==''){ $dt=DateTime::createFromFormat('Y-m-d',$dob); if(!$dt || $dt->format('Y-m-d')!==$dob || $dt>new DateTime('today')) $errors['date_of_birth']='Enter a valid date of birth.'; }
if($errors)respond(422,['success'=>false,'message'=>'Please fix the errors below.','errors'=>$errors]);
try{
 $s=$pdo->prepare('SELECT id FROM users WHERE email=:email AND id<>:id LIMIT 1');$s->execute([':email'=>$email,':id'=>$uid]);if($s->fetch())respond(422,['success'=>false,'message'=>'Please fix the errors below.','errors'=>['email'=>'That email is already used by another account.']]);
 $s=$pdo->prepare('UPDATE users SET full_name=:name,email=:email,phone=:phone,address=:address,date_of_birth=:dob WHERE id=:id');$s->execute([':name'=>$name,':email'=>$email,':phone'=>$phone,':address'=>$address!==''?$address:null,':dob'=>$dob!==''?$dob:null,':id'=>$uid]);
 $_SESSION['user_name']=$name;$_SESSION['user_email']=$email;respond(200,['success'=>true,'message'=>'Profile saved successfully.']);
}catch(Throwable $e){error_log('[WEDORA profile_update] '.$e->getMessage());respond(500,['success'=>false,'message'=>'Could not save your profile right now.']);}
