require('dotenv').config();
const express = require('express');
const Database = require('better-sqlite3');
const argon2 = require('argon2');
const fs = require('node:fs');
const path = require('node:path');
const {configureSecurity,requireAuth} = require('./security');
const {validatePurchase} = require('./validation');
const app=express();
const db=new Database(path.join(__dirname,'tracker.db'));
db.pragma('foreign_keys = ON');
db.exec(fs.readFileSync(path.join(__dirname,'schema.sql'),'utf8'));
app.use(express.json({limit:'16kb'}));
configureSecurity(app);
const asyncRoute = fn => (req,res,next) => Promise.resolve(fn(req,res,next)).catch(next);

// S1: Health check.
app.get('/api/health',(req,res)=>res.json({ok:true}));

const normalizeEmail = email => typeof email === 'string' ? email.trim().toLowerCase() : '';
const validEmail = email => email.length >= 3 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validPassword = password => typeof password === 'string' && password.length >= 8 && password.length <= 128;
const findUser = db.prepare('SELECT id,email,password_hash FROM users WHERE email=?');

// S2: Registration with parameterized queries and Argon2id.
app.post('/api/register',asyncRoute(async(req,res)=>{
  const email=normalizeEmail(req.body?.email);
  const password=req.body?.password;
  if (!validEmail(email) || !validPassword(password)) return res.status(400).json({error:'Enter a valid email and a password of 8–128 characters'});
  if (findUser.get(email)) return res.status(409).json({error:'Email is already registered'});
  const hash=await argon2.hash(password,{type:argon2.argon2id});
  try {
    const result=db.prepare('INSERT INTO users (email,password_hash) VALUES (?,?)').run(email,hash);
    return res.status(201).json({id:Number(result.lastInsertRowid),email});
  } catch(err) {
    if (err.code?.startsWith('SQLITE_CONSTRAINT')) return res.status(409).json({error:'Email is already registered'});
    throw err;
  }
}));

// S3: Login; session regeneration prevents session fixation.
app.post('/api/login',asyncRoute(async(req,res)=>{
  const email=normalizeEmail(req.body?.email);
  const password=req.body?.password;
  if (!validEmail(email) || !validPassword(password)) return res.status(401).json({error:'Invalid email or password'});
  const user=findUser.get(email);
  if (!user || !(await argon2.verify(user.password_hash,password))) return res.status(401).json({error:'Invalid email or password'});
  await new Promise((resolve,reject)=>req.session.regenerate(err=>err?reject(err):resolve()));
  req.session.userId=user.id;
  await new Promise((resolve,reject)=>req.session.save(err=>err?reject(err):resolve()));
  return res.json({id:user.id,email:user.email});
}));

// S4: Return only the logged-in user's public account fields.
app.get('/api/me',requireAuth,(req,res)=>{
  const user=db.prepare('SELECT id,email FROM users WHERE id=?').get(req.session.userId);
  if (!user) return res.status(401).json({error:'Login required'});
  res.json(user);
});

// S5: Destroy session and clear matching cookie.
app.post('/api/logout',requireAuth,(req,res,next)=>{
  req.session.destroy(err=>{
    if(err) return next(err);
    res.clearCookie('sid',{path:'/'});
    res.json({ok:true});
  });
});

// S6: Categories for authenticated users.
const categoryIds=()=>db.prepare('SELECT id FROM categories ORDER BY id').all().map(row=>row.id);
app.get('/api/categories',requireAuth,(req,res)=>{
  res.json(db.prepare('SELECT id,name FROM categories ORDER BY id').all());
});

// S7: Shared JOIN projection; always filter by owner.
const purchaseProjection=`SELECT p.id AS id, p.name AS name, p.quantity AS quantity,
 p.unit_price_cents AS unitPriceCents, p.category_id AS categoryId,
 c.name AS categoryName, (p.quantity * p.unit_price_cents) AS costCents
 FROM purchases p JOIN categories c ON c.id=p.category_id`;
const getOwned=db.prepare(`${purchaseProjection} WHERE p.id=? AND p.owner_id=?`);
const listOwned=db.prepare(`${purchaseProjection} WHERE p.owner_id=? ORDER BY p.id ASC`);
const validId=raw=>/^[1-9]\d*$/.test(raw) && Number.isSafeInteger(Number(raw));

// S8: List only owned purchases.
app.get('/api/purchases',requireAuth,(req,res)=>res.json(listOwned.all(req.session.userId)));

// S9: Validate and insert with server-owned user ID.
app.post('/api/purchases',requireAuth,(req,res)=>{
  const result=validatePurchase(req.body,categoryIds());
  if(result.error) return res.status(400).json({error:result.error});
  const {name,quantity,unitPriceCents,categoryId}=result.value;
  const inserted=db.prepare('INSERT INTO purchases (owner_id,name,quantity,unit_price_cents,category_id) VALUES (?,?,?,?,?)')
    .run(req.session.userId,name,quantity,unitPriceCents,categoryId);
  res.status(201).json(getOwned.get(inserted.lastInsertRowid,req.session.userId));
});

// S10: Ownership checked before validation and update.
app.put('/api/purchases/:id',requireAuth,(req,res)=>{
  if(!validId(req.params.id)) return res.status(400).json({error:'Invalid purchase ID'});
  const id=Number(req.params.id), owner=req.session.userId;
  if(!getOwned.get(id,owner)) return res.status(404).json({error:'Purchase not found'});
  const result=validatePurchase(req.body,categoryIds());
  if(result.error) return res.status(400).json({error:result.error});
  const {name,quantity,unitPriceCents,categoryId}=result.value;
  db.prepare('UPDATE purchases SET name=?,quantity=?,unit_price_cents=?,category_id=? WHERE id=? AND owner_id=?')
    .run(name,quantity,unitPriceCents,categoryId,id,owner);
  res.json(getOwned.get(id,owner));
});

// S11: Delete only an owned record.
app.delete('/api/purchases/:id',requireAuth,(req,res)=>{
  if(!validId(req.params.id)) return res.status(400).json({error:'Invalid purchase ID'});
  const result=db.prepare('DELETE FROM purchases WHERE id=? AND owner_id=?').run(Number(req.params.id),req.session.userId);
  if(result.changes===0) return res.status(404).json({error:'Purchase not found'});
  res.json({ok:true});
});

app.use('/api',(req,res)=>res.status(404).json({error:'API route not found'}));
app.use(express.static(path.join(__dirname,'public')));
app.use((err,req,res,next)=>{
  if(err.type==='entity.parse.failed') return res.status(400).json({error:'Invalid JSON'});
  if(err.type==='entity.too.large') return res.status(413).json({error:'Request too large'});
  console.error('Request failed',err.message);
  res.status(500).json({error:'Internal server error'});
});
app.listen(Number(process.env.PORT)||3000,()=>console.log('Open http://localhost:3000'));
