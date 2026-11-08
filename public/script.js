// F1–F7: The server owns all data; this array is only the current display cache.
const byId=id=>document.getElementById(id);
let csrfToken=null;
let editingId=null;
let purchases=[];
const form=byId('purchase-form');
const message=byId('message');
const saveButton=byId('save-button');
const loginButton=byId('login-button');
const registerButton=byId('register-button');
const logoutButton=byId('logout-button');
const money=cents=>'$'+(cents/100).toFixed(2);
const feedback=text=>{message.textContent=text;};

async function refreshCsrf(){
  const response=await fetch('/api/csrf',{credentials:'same-origin'});
  if(!response.ok) throw new Error('Could not initialize the session');
  csrfToken=(await response.json()).csrfToken;
}
async function api(path,options={}){
  const method=(options.method||'GET').toUpperCase();
  const mutation=['POST','PUT','PATCH','DELETE'].includes(method);
  if(mutation && !csrfToken) await refreshCsrf();
  const headers={...(options.headers||{})};
  if(mutation) headers['X-CSRF-Token']=csrfToken;
  let body=options.body;
  if(body!==undefined && body!==null && typeof body==='object'){
    headers['Content-Type']='application/json';
    body=JSON.stringify(body);
  }
  let response;
  try {response=await fetch(path,{...options,method,headers,body,credentials:'same-origin'});}
  catch {throw new Error('Cannot connect to the server. Check your connection. If a save may have completed, inspect your purchase list before retrying.');}
  let data;
  try {data=await response.json();}
  catch {throw new Error('The server returned an unreadable response');}
  if(!response.ok){
    const error=new Error(data?.error||`Request failed (${response.status})`);
    error.status=response.status;
    throw error;
  }
  return data;
}
async function loadPurchases(){
  purchases=await api('/api/purchases');
  renderHistory();
  updateSummary();
}
async function showTracker(user){
  const categories=await api('/api/categories');
  const select=byId('category');
  select.textContent='';
  for(const category of categories){
    const option=document.createElement('option');
    option.value=String(category.id);
    option.textContent=category.name;
    select.append(option);
  }
  byId('account-status').textContent=`Signed in as ${user.email}`;
  byId('tracker-panel').hidden=false;
  logoutButton.hidden=false;
  loginButton.hidden=true;
  registerButton.hidden=true;
  byId('email').disabled=true;
  byId('password').disabled=true;
  await loadPurchases();
}
function showSignedOut(){
  purchases=[]; editingId=null; csrfToken=null;
  byId('tracker-panel').hidden=true;
  byId('purchase-list').textContent='';
  byId('total-invested').textContent=money(0);
  byId('purchase-count').textContent='0';
  form.reset(); saveButton.textContent='Add purchase';
  byId('account-status').textContent='Sign in or register to see your private purchases.';
  logoutButton.hidden=true; loginButton.hidden=false; registerButton.hidden=false;
  byId('email').disabled=false; byId('password').disabled=false;
  byId('password').value='';
}
function resetEdit(){editingId=null;form.reset();saveButton.textContent='Add purchase';}
function renderHistory(){
  const list=byId('purchase-list');list.textContent='';
  for(const purchase of purchases){
    const li=document.createElement('li');
    const detail=document.createElement('span');
    detail.textContent=`${purchase.name} / Quantity: ${purchase.quantity} / Unit price: ${money(purchase.unitPriceCents)} / Cost: ${money(purchase.costCents)} / ${purchase.categoryName} `;
    const edit=document.createElement('button');edit.type='button';edit.textContent='Edit';
    edit.addEventListener('click',()=>beginEdit(purchase));
    const del=document.createElement('button');del.type='button';del.textContent='Delete';
    del.addEventListener('click',()=>deletePurchase(purchase.id));
    li.append(detail,edit,del);list.append(li);
  }
}
function updateSummary(){
  const total=purchases.reduce((sum,purchase)=>sum+purchase.costCents,0);
  byId('total-invested').textContent=money(total);
  byId('purchase-count').textContent=String(purchases.length);
}
function beginEdit(purchase){
  editingId=purchase.id;
  byId('investment-name').value=purchase.name;
  byId('quantity').value=String(purchase.quantity);
  byId('unit-price').value=(purchase.unitPriceCents/100).toFixed(2);
  byId('category').value=String(purchase.categoryId);
  saveButton.textContent='Save changes';
  feedback('Editing purchase. Select Save changes or Cancel edit.');
  byId('investment-name').focus();
}
async function deletePurchase(id){
  const buttonList=byId('purchase-list').querySelectorAll('button');
  buttonList.forEach(button=>button.disabled=true);
  try{
    await api(`/api/purchases/${id}`,{method:'DELETE'});
    if(editingId===id) resetEdit();
    await loadPurchases();
    feedback('Purchase deleted.');
  }catch(error){feedback(error.message);}
  finally{buttonList.forEach(button=>button.disabled=false);}
}
form.addEventListener('submit',async event=>{
  event.preventDefault();
  const name=byId('investment-name').value.trim();
  const quantity=Number(byId('quantity').value);
  const dollars=Number(byId('unit-price').value);
  const categoryId=Number(byId('category').value);
  if(!name || name.length>100) return feedback('Enter an investment name of 1–100 characters.');
  if(!byId('quantity').value.trim() || !Number.isInteger(quantity) || quantity<1 || quantity>10000 || byId('quantity').validity.stepMismatch) return feedback('Quantity must be a whole number from 1 to 10,000.');
  if(!byId('unit-price').value.trim() || !Number.isFinite(dollars) || dollars<=0 || dollars>1000000 || byId('unit-price').validity.stepMismatch || Math.abs(dollars*100-Math.round(dollars*100))>1e-7) return feedback('Unit price must be $0.01–$1,000,000.00 with at most two decimal places.');
  if(!Number.isInteger(categoryId) || categoryId<1) return feedback('Select a valid category.');
  const body={name,quantity,unitPriceCents:Math.round(dollars*100),categoryId};
  saveButton.disabled=true;
  try{
    const isEditing=editingId!==null;
    await api(isEditing?`/api/purchases/${editingId}`:'/api/purchases',{method:isEditing?'PUT':'POST',body});
    resetEdit();
    await loadPurchases();
    feedback(isEditing?'Purchase updated.':'Purchase added.');
  }catch(error){feedback(error.message);}
  finally{saveButton.disabled=false;}
});
byId('cancel-edit').addEventListener('click',()=>{resetEdit();feedback('Edit canceled.');});
byId('auth-form').addEventListener('submit',async event=>{
  event.preventDefault();
  loginButton.disabled=true;
  try{
    const user=await api('/api/login',{method:'POST',body:{email:byId('email').value,password:byId('password').value}});
    csrfToken=null; // Login regenerated the session; old CSRF token no longer applies.
    await refreshCsrf();
    await showTracker(user);
    byId('password').value='';
    feedback('Logged in successfully.');
  }catch(error){feedback(error.message);}
  finally{loginButton.disabled=false;}
});
registerButton.addEventListener('click',async()=>{
  registerButton.disabled=true;
  try{
    await api('/api/register',{method:'POST',body:{email:byId('email').value,password:byId('password').value}});
    byId('password').value='';
    feedback('Registration complete. Please log in.');
  }catch(error){feedback(error.message);}
  finally{registerButton.disabled=false;}
});
logoutButton.addEventListener('click',async()=>{
  logoutButton.disabled=true;
  try{
    await api('/api/logout',{method:'POST'});
    showSignedOut();
    feedback('Logged out.');
  }catch(error){feedback(error.message);}
  finally{logoutButton.disabled=false;}
});
async function initialize(){
  try{await showTracker(await api('/api/me'));}
  catch(error){if(error.status===401) showSignedOut();else feedback(error.message);}
}
initialize();
