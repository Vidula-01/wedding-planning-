(() => {
  'use strict';
  const API='php/budget.php', PAY='php/payments.php';
  const CIRC=2*Math.PI*80;
  const $=id=>document.getElementById(id);
  const body=$('budgetBody'), modal=$('expenseModal'), form=$('expenseForm'), toast=$('toastMsg');
  let items=[], payments=[];
  const rs=n=>(n<0?'-Rs. ':'Rs. ')+Math.abs(Math.round(Number(n)||0)).toLocaleString('en-US');
  const num=n=>Math.round(Number(n)||0).toLocaleString('en-US');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  let timer;
  function showToast(msg){toast.textContent=msg;toast.classList.add('show');clearTimeout(timer);timer=setTimeout(()=>toast.classList.remove('show'),2600);}
  async function request(url,method='GET',payload=null){
    const opt={method,credentials:'same-origin',headers:{Accept:'application/json'}};
    if(payload!==null){opt.headers['Content-Type']='application/json';opt.body=JSON.stringify(payload);}
    const res=await fetch(url,opt); if(res.status===401){location.href='login.html';throw new Error('auth');}
    const text=await res.text(); let data; try{data=JSON.parse(text)}catch{throw new Error('Server returned an invalid response.');}
    if(!res.ok && data?.message) throw new Error(data.message); return data;
  }
  function renderSummary(s){
    $('totalBudget').textContent=rs(s.total_budget);$('totalSpent').textContent=rs(s.total_spent);$('remaining').textContent=rs(s.remaining);$('remaining').classList.toggle('over',s.remaining<0);
    const pct=Math.max(0,Math.min(100,Number(s.percent_used)||0));$('donutPct').textContent=pct+'%';$('donut').setAttribute('aria-label',pct+'% of the budget used');const used=pct/100*CIRC;$('donutUsed').setAttribute('stroke-dasharray',`${used} ${CIRC}`);
  }
  const CHECK='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" fill="#347a2a"/><path d="M7 12.5l3.5 3.5 7-7" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const EMPTY='<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.5" fill="none" stroke="#c0283a" stroke-width="1.6"/></svg>';
  const TRASH='<svg viewBox="0 0 24 24" fill="#b82d1f"><path d="M9 3h6l1 2h4v2H4V5h4l1-2zM5.5 9h13l-1 12h-11l-1-12z"/></svg>';
  function renderRows(){
    if(!items.length){body.innerHTML='<tr><td colspan="5" class="empty-row">No expenses yet. Use “+Add Expense” to start tracking your budget.</td></tr>';return;}
    body.innerHTML=items.map(it=>`<tr><td>${esc(it.category)}</td><td class="n">${num(it.estimated)}</td><td class="n">${num(it.actual)}</td><td class="c"><button type="button" class="paid-btn" data-action="paid" data-id="${it.id}" aria-pressed="${it.is_paid}">${it.is_paid?CHECK:EMPTY}</button></td><td class="c"><button type="button" class="del-btn" data-action="delete" data-id="${it.id}">${TRASH}</button></td></tr>`).join('');
  }
  function renderPayments(){
    const pbody=$('paymentsBody'); if(!pbody)return;
    if(!payments.length){pbody.innerHTML='<tr><td colspan="5" class="empty-row">No payments yet. Add an upcoming payment below.</td></tr>';return;}
    pbody.innerHTML=payments.map(p=>`<tr><td>${esc(p.payment_name)}</td><td class="n">${rs(p.amount)}</td><td>${p.due_date?esc(p.due_date):'—'}</td><td><span class="payment-status status-${esc(p.status)}">${esc(p.status.charAt(0).toUpperCase()+p.status.slice(1))}</span></td><td class="c"><button type="button" class="payment-edit" data-pay-action="edit" data-id="${p.id}">Edit</button><button type="button" class="del-btn" data-pay-action="delete" data-id="${p.id}">${TRASH}</button></td></tr>`).join('');
  }
  async function load(){
    try{const r=await request(API);if(!r.success)throw new Error(r.message);items=r.data||[];renderRows();renderSummary(r.summary||{});const pr=await request(PAY);payments=pr.payments||[];renderPayments();}
    catch(e){if(e.message==='auth')return;body.innerHTML=`<tr><td colspan="5" class="empty-row">${esc(e.message||'Unable to load the budget.')}</td></tr>`;}
  }
  const openModal=()=>{form.reset();modal.classList.add('is-open');modal.setAttribute('aria-hidden','false');$('expCategory').focus();};
  const closeModal=()=>{modal.classList.remove('is-open');modal.setAttribute('aria-hidden','true');};
  $('openAddModalBtn').addEventListener('click',openModal);$('closeModalBtn').addEventListener('click',closeModal);$('cancelModalBtn').addEventListener('click',closeModal);modal.addEventListener('click',e=>{if(e.target===modal)closeModal()});document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
  form.addEventListener('submit',async e=>{e.preventDefault();const category=$('expCategory').value.trim();if(!category){showToast('Enter a category for the expense.');return;}try{const r=await request(API,'POST',{category,estimated:Number($('expEstimated').value)||0,actual:Number($('expActual').value)||0,is_paid:$('expPaid').checked});if(!r.success){showToast(r.message||'Could not save the expense.');return;}closeModal();showToast('Expense added');await load();}catch(err){if(err.message!=='auth')showToast(err.message||'Could not reach the server.');}});
  body.addEventListener('click',async e=>{const btn=e.target.closest('[data-action]');if(!btn)return;const id=btn.dataset.id,it=items.find(x=>String(x.id)===id);if(!it)return;try{if(btn.dataset.action==='paid'){const r=await request(API+'?id='+encodeURIComponent(id), 'PUT', {is_paid:!it.is_paid});showToast(r.message||'Updated');}else if(confirm(`Delete "${it.category}" from your budget?`)){await request(API+'?id='+encodeURIComponent(id),'DELETE');showToast('Expense deleted');}else return;await load();}catch(err){if(err.message!=='auth')showToast(err.message||'Something went wrong.');}});
  const paymentModal=$('paymentModal'), paymentForm=$('paymentForm');
  function openPayment(p){paymentForm.reset();$('paymentId').value=p?.id||'';$('paymentName').value=p?.payment_name||'';$('paymentAmount').value=p?.amount||'';$('paymentDue').value=p?.due_date||'';$('paymentStatus').value=p?.status||'upcoming';$('paymentNotes').value=p?.notes||'';$('paymentModalTitle').textContent=p?'Edit Payment':'Add Payment';paymentModal.classList.add('is-open');paymentModal.setAttribute('aria-hidden','false');}
  function closePayment(){paymentModal.classList.remove('is-open');paymentModal.setAttribute('aria-hidden','true');}
  $('openPaymentModalBtn')?.addEventListener('click',()=>openPayment());$('closePaymentModalBtn')?.addEventListener('click',closePayment);$('cancelPaymentBtn')?.addEventListener('click',closePayment);paymentModal?.addEventListener('click',e=>{if(e.target===paymentModal)closePayment()});
  paymentForm?.addEventListener('submit',async e=>{e.preventDefault();const id=$('paymentId').value;const payload={payment_name:$('paymentName').value.trim(),amount:Number($('paymentAmount').value)||0,due_date:$('paymentDue').value,status:$('paymentStatus').value,notes:$('paymentNotes').value.trim()};try{const r=id?await request(PAY+'?id='+encodeURIComponent(id),'PUT',payload):await request(PAY,'POST',payload);if(!r.success)throw new Error(r.message||'Could not save payment.');closePayment();showToast(r.message||'Payment saved');await load();}catch(err){if(err.message!=='auth')showToast(err.message||'Could not save payment.');}});
  $('paymentsBody')?.addEventListener('click',async e=>{const btn=e.target.closest('[data-pay-action]');if(!btn)return;const p=payments.find(x=>String(x.id)===String(btn.dataset.id));if(!p)return;if(btn.dataset.payAction==='edit'){openPayment(p);return;}if(confirm(`Delete "${p.payment_name}"?`)){try{await request(PAY+'?id='+encodeURIComponent(p.id),'DELETE');showToast('Payment deleted');await load();}catch(err){if(err.message!=='auth')showToast(err.message||'Could not delete payment.');}}});
  $('logoutBtn')?.addEventListener('click',()=>{location.href='php/logout.php';});
  load();
})();
