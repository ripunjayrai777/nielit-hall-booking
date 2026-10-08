require('dotenv').config();
const express=require('express'),mongoose=require('mongoose'),bcrypt=require('bcryptjs'),jwt=require('jsonwebtoken'),cors=require('cors');
const nodemailer=require('nodemailer');
const {Schema,model}=mongoose;
const mailer=process.env.SMTP_USER?nodemailer.createTransport({host:process.env.SMTP_HOST,port:+process.env.SMTP_PORT||587,auth:{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}}):null;
// mail fail ho to booking ka kaam na ruke
const mail=async(to,subject,text)=>{try{if(!mailer)return console.log('[MAIL skipped - SMTP not set]',to,subject);await mailer.sendMail({from:process.env.MAIL_FROM,to,subject,text})}catch(e){console.error('Mail error:',e.message)}};
const CAP={'Seminar Hall':100,'Conference Hall':40},HALLS=Object.keys(CAP);
const FAC=['Projector','Mic & Sound','AC','Video Conferencing','Podium','Whiteboard','Extra Chairs','Refreshment Setup'];
const User=model('User',new Schema({name:String,email:{type:String,unique:true},employeeId:String,password:String,role:{type:String,default:'user'},approved:{type:Boolean,default:false}},{timestamps:true}));
const Booking=model('Booking',new Schema({hall:String,user:{type:Schema.Types.ObjectId,ref:'User'},title:String,attendees:Number,facilities:[String],notes:String,date:String,start:String,end:String,status:{type:String,default:'pending'},remark:String},{timestamps:true}));
const app=express();app.use(cors({origin:(process.env.CLIENT_URL||'').replace(/\/$/,'')||true}),express.json());
const sign=u=>jwt.sign({id:u._id,role:u.role},process.env.JWT_SECRET,{expiresIn:'1d'});
const auth=async(req,res,next)=>{try{const p=jwt.verify((req.headers.authorization||'').replace('Bearer ',''),process.env.JWT_SECRET);req.user=await User.findById(p.id);if(!req.user||!req.user.approved)throw 0;next()}catch{res.status(401).json({error:'Login required'})}};
const admin=(req,res,next)=>req.user.role==='admin'?next():res.status(403).json({error:'Admin only'});
const clash=(b,skip)=>Booking.findOne({_id:{$ne:skip},hall:b.hall,date:b.date,status:'approved',start:{$lt:b.end},end:{$gt:b.start}});
const wrap=f=>(q,s)=>f(q,s).catch(e=>s.status(500).json({error:e.message}));

app.post('/api/auth/register',wrap(async(req,res)=>{
  const {name,email,employeeId,password}=req.body;
  if(!name||!email||!employeeId||!password)return res.status(400).json({error:'All fields required'});
  if(!email.toLowerCase().endsWith('@'+process.env.ALLOWED_DOMAIN))return res.status(400).json({error:'Only NIELIT email allowed'});
  if(await User.findOne({email:email.toLowerCase()}))return res.status(400).json({error:'Already registered'});
  await User.create({name,email:email.toLowerCase(),employeeId,password:await bcrypt.hash(password,10)});
  res.json({message:'Registered. Admin approval ke baad login kar sakte hain.'});
}));
app.post('/api/auth/login',wrap(async(req,res)=>{
  const u=await User.findOne({email:(req.body.email||'').toLowerCase()});
  if(!u||!(await bcrypt.compare(req.body.password||'',u.password)))return res.status(400).json({error:'Wrong email/password'});
  if(!u.approved)return res.status(403).json({error:'Account abhi approve nahi hua'});
  res.json({token:sign(u),user:{name:u.name,role:u.role}});
}));
app.get('/',(q,r)=>r.send('NIELIT Hall Booking API is running'));
app.get('/api/halls',(q,s)=>s.json({halls:HALLS.map(name=>({name,capacity:CAP[name]})),facilities:FAC}));
// calendar: mahine ki saari pending/approved bookings
app.get('/api/calendar',auth,wrap(async(req,res)=>{
  const {hall,month}=req.query;
  res.json(await Booking.find({hall,date:{$regex:'^'+month},status:{$in:['pending','approved']}}).select('date start end status')) }));
// slots: koi bhi logged-in user dekh sakta hai
app.get('/api/slots',auth,wrap(async(req,res)=>{
  const {hall,date}=req.query;
  res.json(await Booking.find({hall,date,status:{$in:['pending','approved']}}).populate('user','name').select('start end status title user'));
}));
app.post('/api/bookings',auth,wrap(async(req,res)=>{
  const b={hall:req.body.hall,title:req.body.title,attendees:+req.body.attendees,facilities:(req.body.facilities||[]).filter(x=>FAC.includes(x)),notes:(req.body.notes||'').slice(0,500),date:req.body.date,start:req.body.start,end:req.body.end};
  if(!HALLS.includes(b.hall)||!b.title||!b.date||!b.start||!b.end||b.start>=b.end)return res.status(400).json({error:'Invalid details'});
  if(!(b.attendees>0))return res.status(400).json({error:'Attendees ki sankhya daalein'});
  if(b.attendees>CAP[b.hall])return res.status(400).json({error:`${b.hall} ki capacity ${CAP[b.hall]} hai`});
  if(b.date<new Date().toISOString().slice(0,10))return res.status(400).json({error:'Past date not allowed'});
  if(await clash(b))return res.status(409).json({error:'Is time par hall already occupied hai'});
  const nb=await Booking.create({...b,user:req.user._id});
  const admins=(await User.find({role:'admin'}).select('email')).map(a=>a.email);
  mail(admins,`New hall request: ${b.hall} on ${b.date}`,`${req.user.name} (${req.user.employeeId}) ne ${b.hall} ke liye request ki hai.\n\nEvent: ${b.title}\nDate: ${b.date}\nTime: ${b.start} - ${b.end}\nAttendees: ${b.attendees}\nFacilities: ${b.facilities.join(', ')||'None'}\nNotes: ${b.notes||'-'}\n\nApprove/Reject karne ke liye login karein: ${process.env.CLIENT_URL}/admin`);
  res.json(nb);
}));
app.get('/api/bookings/mine',auth,wrap(async(req,res)=>res.json(await Booking.find({user:req.user._id}).sort('-createdAt'))));
app.patch('/api/bookings/:id/cancel-own',auth,wrap(async(req,res)=>{
  const b=await Booking.findOne({_id:req.params.id,user:req.user._id,status:'pending'});
  if(!b)return res.status(404).json({error:'Not found'});b.status='cancelled';b.remark='Cancelled by user';res.json(await b.save());
}));
// admin
app.get('/api/admin/bookings',auth,admin,wrap(async(req,res)=>res.json(await Booking.find().populate('user','name email employeeId').sort('-createdAt'))));
app.patch('/api/admin/bookings/:id/:action',auth,admin,wrap(async(req,res)=>{
  const b=await Booking.findById(req.params.id);if(!b)return res.status(404).json({error:'Not found'});
  const a=req.params.action;
  if(a==='approve'){if(await clash(b,b._id))return res.status(409).json({error:'Clash with another approved booking'});b.status='approved'}
  else if(a==='reject')b.status='rejected';else if(a==='cancel')b.status='cancelled';else return res.status(400).json({error:'Bad action'});
  b.remark=req.body.remark||'';await b.save();
  const u=await User.findById(b.user);const st={approve:'APPROVED',reject:'REJECTED',cancel:'CANCELLED'}[a];
  mail(u.email,`Your hall booking is ${st}`,`${b.hall} | ${b.title}\n${b.date} ${b.start}-${b.end}\nStatus: ${st}${b.remark?'\nReason: '+b.remark:''}`);
  res.json(b);
}));
app.get('/api/admin/users',auth,admin,wrap(async(req,res)=>res.json(await User.find({role:'user'}).select('-password').sort('-createdAt'))));
app.patch('/api/admin/users/:id',auth,admin,wrap(async(req,res)=>res.json(await User.findByIdAndUpdate(req.params.id,{approved:!!req.body.approved},{new:true}).select('-password'))));

mongoose.connect(process.env.MONGO_URI).then(async()=>{
  if(!(await User.findOne({email:process.env.ADMIN_EMAIL})))await User.create({name:'Hall Incharge',email:process.env.ADMIN_EMAIL,employeeId:'ADMIN',password:await bcrypt.hash(process.env.ADMIN_PASSWORD,10),role:'admin',approved:true});
  const port=process.env.PORT||5000;app.listen(port,()=>console.log('API on :'+port));
});
