<?php
declare(strict_types=1);
require __DIR__ . '/config.php';
require __DIR__ . '/auth.php';
header('Content-Type: application/json; charset=utf-8');
require_login_json();
function respond(int $code,array $data):void{http_response_code($code);echo json_encode($data,JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES);exit;}
try{
 $pdo=db(); $uid=(int)$_SESSION['user_id'];
 $cols=$pdo->query("SELECT COLUMN_NAME FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='users'")->fetchAll(PDO::FETCH_COLUMN);
 if(!in_array('address',$cols,true)) $pdo->exec("ALTER TABLE users ADD COLUMN address VARCHAR(255) NULL AFTER phone");
 if(!in_array('date_of_birth',$cols,true)) $pdo->exec("ALTER TABLE users ADD COLUMN date_of_birth DATE NULL AFTER address");
 $s=$pdo->prepare('SELECT id,full_name,email,phone,address,date_of_birth,created_at FROM users WHERE id=:id LIMIT 1');$s->execute([':id'=>$uid]);$u=$s->fetch();
 if(!$u)respond(404,['success'=>false,'message'=>'Account not found.']);
 $s=$pdo->prepare('SELECT photo_path FROM wedding_details WHERE user_id=:uid LIMIT 1');$s->execute([':uid'=>$uid]);$wd=$s->fetch();
 respond(200,['success'=>true,'user'=>['full_name'=>$u['full_name'],'email'=>$u['email'],'phone'=>$u['phone'],'address'=>$u['address']??'','date_of_birth'=>$u['date_of_birth']??'','member_since'=>date('jS F Y',strtotime((string)$u['created_at'])),'photo_path'=>$wd['photo_path']??'', 'photo_url'=>'php/profile_photo.php?view=1&v='.time()]]);
}catch(Throwable $e){error_log('[WEDORA profile_data] '.$e->getMessage());respond(500,['success'=>false,'message'=>'Could not load your profile right now.']);}
