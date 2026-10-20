(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const statusEl = $('dashStatus'), bodyEl = $('dashBody');

  function setStatus(el,msg,error=false){ if(!el)return; el.textContent=msg||''; el.classList.toggle('is-error',!!(msg&&error)); el.classList.toggle('is-success',!!(msg&&!error)); }
  function clearErrors(form){ if(!form)return; form.querySelectorAll('.field-error').forEach(e=>e.textContent=''); form.querySelectorAll('[aria-invalid="true"]').forEach(e=>e.removeAttribute('aria-invalid')); }
  function applyErrors(form, errors){ Object.entries(errors||{}).forEach(([k,msg])=>{ const input=form.querySelector(`[name="${CSS.escape(k)}"]`); const el=$('err_'+k); if(input)input.setAttribute('aria-invalid','true'); if(el)el.textContent=msg; }); }
  async function jsonFetch(url, options={}){
    const res=await fetch(url,{credentials:'same-origin',headers:{Accept:'application/json',...(options.headers||{})},...options});
    if(res.status===401){window.location.href='login.html';throw new Error('auth');}
    const text=await res.text(); let data; try{data=JSON.parse(text);}catch{throw new Error('Server returned an invalid response. Check the PHP file.');}
    return {res,data};
  }
  function initials(name){return (name||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'W';}

  async function loadProfile(){
    try{
      const {data}=await jsonFetch('php/profile_data.php');
      if(!data.success) throw new Error(data.message||'Could not load your profile.');
      $('fullName').value=data.user.full_name||'';
      $('email').value=data.user.email||'';
      $('phone').value=data.user.phone||'';
      $('address').value=data.user.address||'';
      $('dateOfBirth').value=data.user.date_of_birth||'';
      const photoUrl=data.user.photo_url || 'images/profile-default.png';
      $('profilePhoto').src=photoUrl;
      $('profilePhoto').onerror=()=>{ $('profilePhoto').src='images/profile-default.png'; };
      statusEl.style.display='none'; bodyEl.style.display='';
    }catch(e){ if(e.message!=='auth') statusEl.textContent=e.message||'Could not load your profile.'; }
  }

  $('profileForm').addEventListener('submit',async(e)=>{
    e.preventDefault(); clearErrors($('profileForm')); setStatus($('profileStatus'),''); $('saveProfileBtn').disabled=true;
    const payload={full_name:$('fullName').value.trim(),email:$('email').value.trim(),phone:$('phone').value.trim(),address:$('address').value.trim(),date_of_birth:$('dateOfBirth').value};
    try{
      const {data}=await jsonFetch('php/profile_update.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!data.success){applyErrors($('profileForm'),data.errors);setStatus($('profileStatus'),data.message||'Please fix the errors below.',true);return;}
      setStatus($('profileStatus'),data.message||'Profile saved.');
    }catch(e){if(e.message!=='auth')setStatus($('profileStatus'),e.message||'Could not save your profile.',true);}finally{$('saveProfileBtn').disabled=false;}
  });

  $('changePasswordBtn').addEventListener('click',()=>{$('passwordForm').hidden=false;$('changePasswordBtn').style.display='none';$('currentPassword').focus();});
  $('cancelPasswordBtn').addEventListener('click',()=>{$('passwordForm').reset();clearErrors($('passwordForm'));setStatus($('passwordStatus'),'');$('passwordForm').hidden=true;$('changePasswordBtn').style.display='flex';});
  $('passwordForm').addEventListener('submit',async(e)=>{
    e.preventDefault();clearErrors($('passwordForm'));setStatus($('passwordStatus'),'');$('savePasswordBtn').disabled=true;
    const payload={current_password:$('currentPassword').value,new_password:$('newPassword').value,confirm_password:$('confirmPassword').value};
    try{
      const {data}=await jsonFetch('php/change_password.php',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      if(!data.success){applyErrors($('passwordForm'),data.errors);setStatus($('passwordStatus'),data.message||'Please fix the errors below.',true);return;}
      setStatus($('passwordStatus'),data.message||'Password updated.');$('passwordForm').reset();
    }catch(e){if(e.message!=='auth')setStatus($('passwordStatus'),e.message||'Could not update password.',true);}finally{$('savePasswordBtn').disabled=false;}
  });

  $('changePhotoBtn').addEventListener('click',()=>$('photoInput').click());
  $('photoInput').addEventListener('change',async()=>{
    const file=$('photoInput').files[0]; if(!file)return;
    if(!/^image\/(jpeg|png|webp)$/.test(file.type)){setStatus($('photoStatus'),'Please choose a JPG, PNG, or WebP image.',true);return;}
    if(file.size>5*1024*1024){setStatus($('photoStatus'),'Photo must be smaller than 5 MB.',true);return;}
    const reader=new FileReader(); reader.onload=e=>$('profilePhoto').src=e.target.result; reader.readAsDataURL(file);
    const fd=new FormData(); fd.append('photo',file);
    setStatus($('photoStatus'),'Uploading…');
    try{
      const res=await fetch('php/profile_photo.php',{method:'POST',credentials:'same-origin',body:fd});
      if(res.status===401){window.location.href='login.html';return;}
      const responseText=await res.text();
      let data;
      try{
        data=JSON.parse(responseText);
      }catch(parseError){
        console.error('Profile photo server response:', responseText);
        throw new Error('Photo upload failed. Please check the PHP upload folder and server error.');
      }
      if(!res.ok || !data.success) throw new Error(data.message||'Could not upload photo.');
      $('profilePhoto').src=(data.photo_url || ('php/profile_photo.php?view=1&v='+Date.now()));
      setStatus($('photoStatus'),'Photo updated.');
    }catch(e){setStatus($('photoStatus'),e.message||'Could not upload photo.',true);}
  });

  const sidebar=$('sidebar'); const hamburger=$('hamburgerBtn'); if(sidebar&&hamburger)hamburger.addEventListener('click',()=>sidebar.classList.toggle('is-open'));
  $('logoutBtn').addEventListener('click',()=>{window.location.href='php/logout.php';});
  loadProfile();
})();
