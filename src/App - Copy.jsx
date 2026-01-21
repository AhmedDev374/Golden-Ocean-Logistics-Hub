import React, { useState, useRef, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Package, Ship, Lock, LogIn, LogOut, Anchor, Clock, CheckCircle } from 'lucide-react';

function App() {
  // --- 🔐 AUTH STATES ---
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [currentUser, setCurrentUser] = useState("");

  // --- APP STATES ---
  const [screen, setScreen] = useState('LIST'); 
  const [listTab, setListTab] = useState('PENDING'); 
  const [selectedShip, setSelectedShip] = useState(null); 
  const [report, setReport] = useState(""); 
  const [loading, setLoading] = useState(false);
  const [ships, setShips] = useState([]);
  const sigCanvas = useRef({});

  // --- 1. HANDLE LOGIN (UPDATED FOR CASE INSENSITIVITY) ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    
    try {
      const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // 👇 UPDATED: Convert input to lowercase and trim spaces before sending
        body: JSON.stringify({ 
            username: username.trim().toLowerCase(), 
            password: password 
        })
      });
      const data = await res.json();

      if (data.success) {
        // We set the user from the response (or we could use the local username state)
        setCurrentUser(data.username);
        setIsAuthenticated(true);
      } else {
        setLoginError("❌ Incorrect Username or Password");
      }
    } catch (err) {
      setLoginError("❌ Server Connection Error");
    }
  };

  // --- 2. SYNC DATA ---
  useEffect(() => {
    if(!isAuthenticated) return; 

    const syncStatus = async () => {
      try {
        const [fleetRes, orderRes] = await Promise.all([
            fetch('http://localhost:5000/api/fleet'),
            fetch('http://localhost:5000/api/orders?type=json')
        ]);
        
        const fleetData = await fleetRes.json();
        const orderData = await orderRes.json();
        
        // Merge Logic
        const deliveredNames = orderData.map(o => o.ship_name);
        const merged = fleetData.map(ship => ({
           ...ship, 
           status: deliveredNames.includes(ship.name) ? 'DELIVERED' : 'PENDING' 
        }));
        
        setShips(merged);
      } catch (err) { console.error(err); }
    };

    syncStatus();
    const interval = setInterval(syncStatus, 2000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // --- 3. DELIVERY ACTION ---
  const handleSign = async () => {
    if (sigCanvas.current.isEmpty()) return alert("Please sign first!");
    setLoading(true);
    
    try {
      await fetch('http://localhost:5000/api/deliver', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
           shipName: selectedShip.name,
           report: report,
           signature: sigCanvas.current.getTrimmedCanvas().toDataURL('image/png')
        })
      });
      setReport("");
      setSelectedShip(null);
      setScreen('LIST');
      setListTab('DELIVERED');
    } catch (error) { alert("Error"); } 
    finally { setLoading(false); }
  };

  // --- 4. RENDER LOGIN SCREEN ---
  if (!isAuthenticated) {
    return (
      <div className="mobile-container" style={{height:'100vh', display:'flex', alignItems:'center', justifyContent:'center'}}>
         <div className="card" style={{width:'100%', maxWidth:'350px', textAlign:'center', padding:'30px'}}>
            <div style={{background:'#222', width:'60px', height:'60px', borderRadius:'50%', margin:'0 auto 15px', display:'flex', alignItems:'center', justifyContent:'center', border:'2px solid #FFC107'}}>
                <Lock size={30} color="#FFC107"/>
            </div>
            <h2 style={{color:'white', marginTop:0}}>App Login</h2>
            <p style={{color:'#777', fontSize:'13px'}}>Enter credentials created in Logistics Hub</p>
            
            <form onSubmit={handleLogin} style={{marginTop:'20px'}}>
                <input 
                    type="text" placeholder="Username" value={username} onChange={e=>setUsername(e.target.value)}
                    style={{width:'100%', padding:'12px', marginBottom:'10px', background:'#333', border:'1px solid #444', color:'white', borderRadius:'5px', boxSizing:'border-box'}}
                />
                <input 
                    type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)}
                    style={{width:'100%', padding:'12px', marginBottom:'20px', background:'#333', border:'1px solid #444', color:'white', borderRadius:'5px', boxSizing:'border-box'}}
                />
                
                {loginError && <div style={{color:'#ff4444', marginBottom:'15px', fontSize:'13px'}}>{loginError}</div>}
                
                <button type="submit" className="btn-primary" style={{width:'100%', padding:'12px', display:'flex', justifyContent:'center', gap:'8px'}}>
                    <LogIn size={18}/> Login
                </button>
            </form>
         </div>
      </div>
    );
  }

  // --- 5. MAIN APP UI ---
  const filteredShips = ships.filter(s => s.status === listTab);

  return (
    <div className="mobile-container">
      {/* Header with LogOut Icon */}
      <header style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingBottom:'15px', borderBottom:'1px solid #333', marginBottom:'20px'}}>
        <div>
            <h1 style={{fontSize:'20px', margin:0}}>⚓ Golden Ocean</h1>
            {/* 👇 UPDATED: Capitalize first letter OF EACH WORD, rest lowercase */}
            <span style={{fontSize:'11px', color:'#2196F3'}}>
              User: {
                currentUser
                  .split(' ') // Split by space to get individual words
                  .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()) // Title Case each word
                  .join(' ') // Join back together
              }
            </span>
        </div>
        <button onClick={() => setIsAuthenticated(false)} style={{background:'transparent', border:'none', color:'#ef4444', cursor:'pointer'}}>
            <LogOut size={24} />
        </button>
      </header>

      {/* Screen 1: LIST */}
      {screen === 'LIST' && (
        <div>
            {/* Tabs */}
            <div style={{display:'flex', background:'#222', padding:'4px', borderRadius:'8px', marginBottom:'20px'}}>
                {['PENDING', 'DELIVERED'].map(tab => (
                    <button key={tab} onClick={()=>setListTab(tab)} style={{flex:1, padding:'10px', border:'none', borderRadius:'6px', background: listTab===tab ? (tab==='PENDING'?'#FFC107':'#4CAF50') : 'transparent', color: listTab===tab?'black':'#777', fontWeight:'bold', cursor:'pointer'}}>{tab}</button>
                ))}
            </div>

            {/* List */}
            {filteredShips.length === 0 && <div style={{textAlign:'center', padding:'40px', color:'#555'}}><Package size={40} style={{opacity:0.3}}/><p>No ships found.</p></div>}
            
            {filteredShips.map(ship => (
                <div key={ship.id} 
                     onClick={() => { if(ship.status === 'PENDING') { setSelectedShip(ship); setScreen('DETAILS'); }}} 
                     style={{
                         background: '#1e1e1e', 
                         borderRadius: '12px',
                         marginBottom: '16px',
                         position: 'relative',
                         overflow: 'hidden',
                         cursor: ship.status==='PENDING'?'pointer':'default',
                         padding: '16px',
                         boxShadow: '0 4px 6px rgba(0,0,0,0.2)'
                     }}>
                    
                    {/* COLORED STRIP (Left Side) */}
                    <div style={{
                        position: 'absolute', left: 0, top: 0, bottom: 0, width: '6px',
                        background: ship.status==='PENDING' ? '#FFC107' : '#4CAF50'
                    }}></div>

                    {/* TOP ROW: Name & Badge */}
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'start', marginBottom:'8px', paddingLeft:'10px'}}>
                        <h3 style={{margin:0, display:'flex', alignItems:'center', gap:'8px', fontSize:'18px'}}>
                            <Ship size={20} color={ship.status==='PENDING'?'#2196F3':'#4CAF50'}/> {ship.name}
                        </h3>

                        {/* STATUS BADGE (Top Right) */}
                        <div style={{
                            background: ship.status==='PENDING' ? 'rgba(255, 193, 7, 0.2)' : 'rgba(76, 175, 80, 0.2)',
                            color: ship.status==='PENDING' ? '#FFC107' : '#4CAF50',
                            padding: '4px 10px',
                            borderRadius: '20px',
                            fontSize: '11px',
                            fontWeight: 'bold',
                            display: 'flex', alignItems: 'center', gap: '5px'
                        }}>
                             {ship.status === 'PENDING' ? 
                                <><Clock size={12}/> PENDING</> : 
                                <><CheckCircle size={12}/> DELIVERED</>
                             }
                        </div>
                    </div>

                    {/* MIDDLE: Captain */}
                    <div style={{paddingLeft:'10px', color:'#aaa', fontSize:'13px', display:'flex', alignItems:'center', gap:'6px'}}>
                        <Anchor size={14}/> {ship.captain}
                    </div>

                    {/* BOTTOM ROW: Items & Completed Text */}
                    <div style={{
                        marginTop:'15px', paddingTop:'10px', borderTop:'1px solid #333', 
                        paddingLeft:'10px', display:'flex', justifyContent:'space-between', alignItems:'center'
                    }}>
                        <div style={{fontSize:'13px', color:'#777'}}>📦 {ship.items.length} Items</div>
                        
                        {/* "Completed" Text at Bottom Right */}
                        {ship.status === 'DELIVERED' && (
                            <div style={{color:'#4CAF50', fontSize:'13px'}}>Completed</div>
                        )}
                    </div>
                </div>
            ))}
        </div>
      )}

      {/* Screen 2: DETAILS */}
      {screen === 'DETAILS' && selectedShip && (
        <div className="card">
            <h2 style={{marginTop:0}}>{selectedShip.name}</h2>
            <div style={{marginBottom:'20px'}}>
                {selectedShip.items.map((item, i) => (
                    <div key={i} style={{background:'#2a2a2a', padding:'12px', marginBottom:'5px', borderRadius:'6px', display:'flex', justifyContent:'space-between'}}>
                        <span>{item.name}</span>
                        <b style={{color:'#FFC107'}}>x{item.qty}</b>
                    </div>
                ))}
            </div>
            <button className="btn-primary" onClick={()=>setScreen('SIGN')}>Proceed to Sign</button>
            <button style={{background:'transparent', color:'#aaa', border:'none', width:'100%', marginTop:'10px', cursor:'pointer'}} onClick={()=>{setScreen('LIST'); setSelectedShip(null)}}>Cancel</button>
        </div>
      )}

      {/* Screen 3: SIGN */}
      {screen === 'SIGN' && selectedShip && (
        <div className="card">
            <h3>📝 Report for {selectedShip.name}</h3>
            
            {/* DARK TEXT AREA */}
            <textarea 
                placeholder="Add remarks or notes..." 
                value={report} 
                onChange={e=>setReport(e.target.value)} 
                style={{
                    width:'100%', 
                    height:'100px', 
                    background:'#1a1a1a', 
                    border:'1px solid #333', 
                    color:'white', 
                    padding:'15px', 
                    borderRadius:'8px', 
                    boxSizing:'border-box', 
                    marginBottom:'20px',
                    fontSize: '14px',
                    resize: 'none'
                }}
            ></textarea>

            <div style={{background:'white', borderRadius:'4px', overflow:'hidden', marginBottom:'15px'}}>
                <SignatureCanvas ref={sigCanvas} penColor="black" canvasProps={{width: 320, height: 180}} />
            </div>
            <button className="btn-primary" onClick={handleSign} disabled={loading}>{loading ? 'Submitting...' : 'Confirm Delivery'}</button>
            <button style={{background:'transparent', color:'#aaa', border:'none', width:'100%', marginTop:'10px', cursor:'pointer'}} onClick={()=>setScreen('DETAILS')}>Back</button>
        </div>
      )}
    </div>
  );
}

export default App;