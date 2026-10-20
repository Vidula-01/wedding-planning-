<?php
declare(strict_types=1);
if(session_status()===PHP_SESSION_NONE)session_start();
$_SESSION=[];
if(ini_get('session.use_cookies')){$p=session_get_cookie_params();setcookie(session_name(),'',['expires'=>time()-42000,'path'=>$p['path'],'domain'=>$p['domain'],'secure'=>$p['secure'],'httponly'=>$p['httponly'],'samesite'=>$p['samesite']??'Lax']);}
session_destroy();
if(strtoupper($_SERVER['HTTP_ACCEPT']??'')==='APPLICATION/JSON'||stripos($_SERVER['HTTP_ACCEPT']??'','application/json')!==false){header('Content-Type: application/json; charset=utf-8');echo json_encode(['success'=>true]);exit;}
header('Location: ../login.html');exit;
