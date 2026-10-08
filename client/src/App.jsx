import {useState,useEffect,useCallback} from 'react';
import {Routes,Route,Link,NavLink,Navigate,useNavigate} from 'react-router-dom';

const api=async(path,method='GET',body)=>{
  const r=await fetch((import.meta.env.VITE_API_URL||'').replace(/\/$/,'')+'/api'+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer '+(localStorage.token||'')},body:body&&JSON.stringify(body)});
  const d=await r.json();if(!r.ok)throw new Error(d.error||'Something went wrong');return d;
};
const today=new Date().toISOString().slice(0,10);
const Badge=({s})=><span className={'badge '+s}>{s}</span>;

/* ---------- Layout ---------- */
function Header({user,onLogout}){
  const [open,setOpen]=useState(false),close=()=>setOpen(false);
  return <header className="hdr"><div className="hdr-in">
    <Link to="/" className="brand" onClick={close}><span className="mark">N</span><span><b>NIELIT</b><small>Hall Booking Portal</small></span></Link>
    <button className="burger" aria-label="Menu" aria-expanded={open} onClick={()=>setOpen(!open)}><i/><i/><i/></button>
    <nav className={'nav'+(open?' open':'')} onClick={close}>
      <NavLink to="/" end>Home</NavLink>
      {user&&<><NavLink to="/book">Book a hall</NavLink><NavLink to="/mine">My bookings</NavLink>{user.role==='admin'&&<NavLink to="/admin">Admin panel</NavLink>}</>}
      <span className="sp"/>
      {user?<><span className="who">{user.name}{user.role==='admin'&&<em>Incharge</em>}</span><button className="btn ghost" onClick={onLogout}>Log out</button></>
      :<><Link className="btn ghost" to="/login">Log in</Link><Link className="btn" to="/signup">Sign up</Link></>}
    </nav></div></header>;
}
const Footer=()=><footer className="ftr"><div className="ftr-in"><div><b>NIELIT Hall Booking Portal</b><p>Seminar and conference hall reservations for authorised NIELIT staff.</p></div>
  <div><b>Need help?</b><p>Contact the hall incharge for approvals, cancellations and account access.</p></div></div><div className="copy">© {new Date().getFullYear()} NIELIT. All bookings are subject to incharge approval.</div></footer>;

/* ---------- Home ---------- */
function Home({user}){
  const rows=[['10:00 – 11:00','Booked','approved'],['11:00 – 12:00','Booked','approved'],['12:00 – 13:00','Awaiting approval','pending'],['13:00 – 14:00','Available','free'],['14:00 – 15:00','Available','free']];
  return <>
  <section className="hero"><div className="hero-in">
    <div><h1>Reserve the seminar or conference hall in a few clicks.</h1>
      <p className="lead">See which time slots are free, send your request, and get the incharge's decision by email. Every booking is recorded and approved before the hall is confirmed.</p>
      <div className="cta">{user?<Link className="btn lg" to="/book">Book a hall</Link>:<><Link className="btn lg" to="/signup">Create staff account</Link><Link className="btn lg ghost-w" to="/login">Log in</Link></>}</div></div>
    <div className="board" aria-hidden="true"><div className="board-h">Seminar Hall · sample day</div>
      {rows.map(r=><div key={r[0]} className={'slot '+r[2]}><span>{r[0]}</span><span>{r[1]}</span></div>)}</div>
  </div></section>
  <section className="sec"><h2>Our halls</h2><div className="halls">
    <article className="hall"><h3>Seminar Hall</h3><p>Large hall for lectures, workshops and training programmes.</p><dl><dt>Capacity</dt><dd>100 people</dd><dt>Facilities</dt><dd>Projector, sound system, AC, podium</dd></dl></article>
    <article className="hall"><h3>Conference Hall</h3><p>Compact room for meetings, reviews and video conferences.</p><dl><dt>Capacity</dt><dd>40 people</dd><dd className="f">Projector, video conferencing, whiteboard, AC</dd></dl></article></div></section>
  <section className="sec alt"><h2>How booking works</h2><ol className="steps">
    <li><b>Log in</b><span>Use your NIELIT email. New staff sign up and wait for authorisation.</span></li>
    <li><b>Check the calendar</b><span>Pick a hall and date to see free, pending and booked slots.</span></li>
    <li><b>Send your request</b><span>Add event title, attendees and the facilities you need.</span></li>
    <li><b>Get the decision</b><span>The incharge approves or rejects, and you receive an email.</span></li></ol></section></>;
}

/* ---------- Auth ---------- */
function AuthShell({title,sub,children,foot}){
  return <div className="auth"><aside><h2>NIELIT Hall Booking</h2><p>One portal for seminar and conference hall reservations, approvals and records.</p></aside>
    <main><h1>{title}</h1><p className="sub">{sub}</p>{children}<p className="foot">{foot}</p></main></div>;
}
function Login({onAuth}){
  const [f,setF]=useState({email:'',password:''}),[err,setErr]=useState(''),[busy,setBusy]=useState(false),nav=useNavigate();
  const go=async e=>{e.preventDefault();setErr('');setBusy(true);try{const d=await api('/auth/login','POST',f);onAuth(d);nav(d.user.role==='admin'?'/admin':'/book')}catch(x){setErr(x.message)}setBusy(false)};
  return <AuthShell title="Log in" sub="Enter your NIELIT email and password." foot={<>New staff member? <Link to="/signup">Create an account</Link></>}>
    <form onSubmit={go}><label>Email<input type="email" required value={f.email} onChange={e=>setF({...f,email:e.target.value})} placeholder="name@nielit.gov.in"/></label>
    <label>Password<input type="password" required value={f.password} onChange={e=>setF({...f,password:e.target.value})}/></label>
    {err&&<div className="alert err" role="alert">{err}</div>}<button className="btn lg full" disabled={busy}>{busy?'Logging in…':'Log in'}</button></form></AuthShell>;
}
function Signup(){
  const [f,setF]=useState({name:'',employeeId:'',email:'',password:''}),[err,setErr]=useState(''),[ok,setOk]=useState(''),[busy,setBusy]=useState(false);
  const set=k=>e=>setF({...f,[k]:e.target.value});
  const go=async e=>{e.preventDefault();setErr('');setBusy(true);try{const d=await api('/auth/register','POST',f);setOk(d.message)}catch(x){setErr(x.message)}setBusy(false)};
  return <AuthShell title="Create staff account" sub="Only NIELIT staff can register. The incharge must authorise your account before you can log in." foot={<>Already registered? <Link to="/login">Log in</Link></>}>
    {ok?<div className="alert ok">{ok}</div>:<form onSubmit={go}>
    <div className="two"><label>Full name<input required value={f.name} onChange={set('name')}/></label><label>Employee ID<input required value={f.employeeId} onChange={set('employeeId')}/></label></div>
    <label>NIELIT email<input type="email" required value={f.email} onChange={set('email')} placeholder="name@nielit.gov.in"/></label>
    <label>Password<input type="password" required minLength={6} value={f.password} onChange={set('password')}/></label>
    {err&&<div className="alert err" role="alert">{err}</div>}<button className="btn lg full" disabled={busy}>{busy?'Creating…':'Sign up'}</button></form>}</AuthShell>;
}

/* ---------- Booking ---------- */
const HOURS=Array.from({length:10},(_,i)=>i+9),pad=h=>String(h).padStart(2,'0')+':00';
function Calendar({hall,date,setDate,refresh}){
  const [m,setM]=useState(date.slice(0,7)),[bk,setBk]=useState([]);
  useEffect(()=>{api(`/calendar?hall=${hall}&month=${m}`).then(setBk).catch(()=>{})},[hall,m,refresh]);
  const [y,mo]=m.split('-').map(Number),first=new Date(y,mo-1,1).getDay(),days=new Date(y,mo,0).getDate();
  const shift=d=>{const n=new Date(y,mo-1+d,1);setM(`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}`)};
  const cells=[...Array(first).fill(null),...Array.from({length:days},(_,i)=>i+1)];
  return <div className="cal"><div className="calhead"><button className="btn ghost sm" onClick={()=>shift(-1)} aria-label="Previous month">‹</button><b>{new Date(y,mo-1).toLocaleString('en',{month:'long',year:'numeric'})}</b><button className="btn ghost sm" onClick={()=>shift(1)} aria-label="Next month">›</button></div>
    <div className="grid">{['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=><div key={d} className="dow">{d}</div>)}
    {cells.map((d,i)=>{if(!d)return <div key={i}/>;
      const ds=`${m}-${String(d).padStart(2,'0')}`,day=bk.filter(b=>b.date===ds),ap=day.filter(b=>b.status==='approved').length,pe=day.length-ap;
      return <button key={i} disabled={ds<today} className={'day '+(ap?'approved':pe?'pending':'free')+(ds===date?' sel':'')} onClick={()=>setDate(ds)}>
        <span>{d}</span><small>{ap?`${ap} booked`:pe?`${pe} pending`:''}</small></button>})}</div>
    <p className="legend"><i className="free"/>Available <i className="pending"/>Pending <i className="approved"/>Booked</p></div>;
}
function Book(){
  const [info,setInfo]=useState({halls:[],facilities:[]}),[hall,setHall]=useState('Seminar Hall'),[date,setDate]=useState(today);
  const [slots,setSlots]=useState([]),[f,setF]=useState({title:'',start:'10:00',end:'11:00',attendees:'',facilities:[],notes:''}),[msg,setMsg]=useState(null),[tick,setTick]=useState(0);
  const load=useCallback(()=>api(`/slots?hall=${hall}&date=${date}`).then(setSlots).catch(e=>setMsg({e:e.message})),[hall,date]);
  useEffect(()=>{api('/halls').then(setInfo)},[]);useEffect(()=>{load()},[load]);
  const cap=info.halls.find(h=>h.name===hall)?.capacity;
  const stat=h=>{const s=pad(h),e=pad(h+1);const b=slots.filter(x=>x.start<e&&x.end>s);return b.find(x=>x.status==='approved')||b[0]||null};
  const tog=x=>setF({...f,facilities:f.facilities.includes(x)?f.facilities.filter(y=>y!==x):[...f.facilities,x]});
  const submit=async e=>{e.preventDefault();setMsg(null);try{await api('/bookings','POST',{...f,hall,date});setMsg({ok:'Request sent. You will get an email once the incharge decides.'});load();setTick(tick+1)}catch(x){setMsg({e:x.message})}};
  return <div className="page"><h1>Book a hall</h1><p className="sub">Choose a hall and date, check the available slots, then send your request.</p>
    <div className="cols"><section className="panel"><label className="inl">Hall<select value={hall} onChange={e=>setHall(e.target.value)}>{info.halls.map(h=><option key={h.name} value={h.name}>{h.name} (capacity {h.capacity})</option>)}</select></label>
      <Calendar hall={hall} date={date} setDate={setDate} refresh={tick}/></section>
    <section className="panel"><h3>Time slots on {date}</h3><div className="slots">{HOURS.map(h=>{const b=stat(h);
      return <div key={h} className={'slot '+(b?b.status:'free')}><span>{pad(h)} – {pad(h+1)}</span>
      <span>{!b?'Available':b.status==='approved'?`Booked: ${b.title} (${b.user?.name})`:'Awaiting approval'}</span></div>})}</div></section></div>
    <form className="panel" onSubmit={submit}><h3>Booking request for {date}</h3>
      <div className="two"><label>Event title<input required value={f.title} onChange={e=>setF({...f,title:e.target.value})}/></label>
      <label>Number of attendees<input required type="number" min="1" max={cap} placeholder={`Up to ${cap||''}`} value={f.attendees} onChange={e=>setF({...f,attendees:e.target.value})}/></label>
      <label>Start time<input type="time" required value={f.start} onChange={e=>setF({...f,start:e.target.value})}/></label>
      <label>End time<input type="time" required value={f.end} onChange={e=>setF({...f,end:e.target.value})}/></label></div>
      <fieldset><legend>Facilities needed</legend><div className="chk">{info.facilities.map(x=><label key={x}><input type="checkbox" checked={f.facilities.includes(x)} onChange={()=>tog(x)}/>{x}</label>)}</div></fieldset>
      <label>Notes for the incharge<textarea value={f.notes} onChange={e=>setF({...f,notes:e.target.value})}/></label>
      {msg?.e&&<div className="alert err" role="alert">{msg.e}</div>}{msg?.ok&&<div className="alert ok">{msg.ok}</div>}
      <button className="btn lg">Send request</button></form></div>;
}
function Mine(){
  const [l,setL]=useState(null);const load=()=>api('/bookings/mine').then(setL);useEffect(()=>{load()},[]);
  return <div className="page"><h1>My bookings</h1><p className="sub">Track the status of every request you have made.</p>
    {l&&!l.length?<div className="empty">You have no bookings yet. <Link to="/book">Book a hall</Link></div>:<div className="panel scroll"><table><thead><tr><th>Hall</th><th>Event</th><th>Date and time</th><th>Status</th><th/></tr></thead><tbody>{(l||[]).map(b=><tr key={b._id}>
    <td>{b.hall}</td><td>{b.title}<small>{b.attendees} people{(b.facilities||[]).length?' · '+b.facilities.join(', '):''}</small></td><td>{b.date}<small>{b.start} – {b.end}</small></td>
    <td><Badge s={b.status}/>{b.remark&&<small>{b.remark}</small>}</td>
    <td>{b.status==='pending'&&<button className="btn danger sm" onClick={()=>api(`/bookings/${b._id}/cancel-own`,'PATCH').then(load)}>Cancel</button>}</td></tr>)}</tbody></table></div>}</div>;
}

/* ---------- Admin ---------- */
function Admin(){
  const [bk,setBk]=useState([]),[us,setUs]=useState([]),[tab,setTab]=useState('bookings'),[flt,setFlt]=useState('all');
  const load=()=>{api('/admin/bookings').then(setBk);api('/admin/users').then(setUs)};useEffect(load,[]);
  const act=async(id,a)=>{const remark=a==='approve'?'':prompt('Reason (optional)')||'';try{await api(`/admin/bookings/${id}/${a}`,'PATCH',{remark});load()}catch(e){alert(e.message)}};
  const n=s=>bk.filter(b=>b.status===s).length,list=bk.filter(b=>flt==='all'||b.status===flt);
  return <div className="page"><h1>Admin panel</h1><p className="sub">Review requests, manage bookings and authorise staff accounts.</p>
    <div className="stats"><div><b>{n('pending')}</b>Pending requests</div><div><b>{n('approved')}</b>Approved</div><div><b>{bk.length}</b>Total bookings</div><div><b>{us.filter(u=>!u.approved).length}</b>Accounts awaiting authorisation</div></div>
    <div className="tabs"><button className={tab==='bookings'?'on':''} onClick={()=>setTab('bookings')}>Bookings</button><button className={tab==='users'?'on':''} onClick={()=>setTab('users')}>Staff accounts</button></div>
    {tab==='bookings'?<div className="panel"><label className="inl">Show<select value={flt} onChange={e=>setFlt(e.target.value)}>{['all','pending','approved','rejected','cancelled'].map(x=><option key={x}>{x}</option>)}</select></label>
    <div className="scroll"><table><thead><tr><th>Staff</th><th>Hall and event</th><th>Date and time</th><th>Status</th><th>Actions</th></tr></thead><tbody>{list.map(b=><tr key={b._id}>
      <td>{b.user?.name}<small>{b.user?.employeeId}</small></td>
      <td>{b.hall}: {b.title}<small>{b.attendees} people · {(b.facilities||[]).join(', ')||'No extra facilities'}{b.notes&&` · Note: ${b.notes}`}</small></td>
      <td>{b.date}<small>{b.start} – {b.end}</small></td><td><Badge s={b.status}/>{b.remark&&<small>{b.remark}</small>}</td>
      <td className="acts">{b.status==='pending'&&<><button className="btn ok sm" onClick={()=>act(b._id,'approve')}>Approve</button><button className="btn danger sm" onClick={()=>act(b._id,'reject')}>Reject</button></>}
      {['pending','approved'].includes(b.status)&&<button className="btn ghost sm" onClick={()=>act(b._id,'cancel')}>Cancel</button>}</td></tr>)}</tbody></table></div></div>
    :<div className="panel scroll"><table><thead><tr><th>Name</th><th>Email</th><th>Employee ID</th><th>Access</th></tr></thead><tbody>{us.map(u=><tr key={u._id}><td>{u.name}</td><td>{u.email}</td><td>{u.employeeId}</td>
      <td><button className={'btn sm '+(u.approved?'danger':'ok')} onClick={()=>api('/admin/users/'+u._id,'PATCH',{approved:!u.approved}).then(load)}>{u.approved?'Revoke access':'Authorise'}</button></td></tr>)}</tbody></table></div>}</div>;
}

/* ---------- App ---------- */
export default function App(){
  const [user,setUser]=useState(JSON.parse(localStorage.user||'null')),nav=useNavigate();
  const onAuth=d=>{localStorage.token=d.token;localStorage.user=JSON.stringify(d.user);setUser(d.user)};
  const logout=()=>{localStorage.clear();setUser(null);nav('/')};
  const P=({children,admin})=>!user?<Navigate to="/login"/>:admin&&user.role!=='admin'?<Navigate to="/book"/>:children;
  return <><Header user={user} onLogout={logout}/><div className="body"><Routes>
    <Route path="/" element={<Home user={user}/>}/><Route path="/login" element={<Login onAuth={onAuth}/>}/><Route path="/signup" element={<Signup/>}/>
    <Route path="/book" element={<P><Book/></P>}/><Route path="/mine" element={<P><Mine/></P>}/><Route path="/admin" element={<P admin><Admin/></P>}/>
    <Route path="*" element={<Navigate to="/"/>}/></Routes></div><Footer/></>;
}
