const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

app.use(cors({ origin: '*' }));
app.use(bodyParser.json({ limit: '50mb' }));

const pool = new Pool({
  user: 'postgres',
  host: 'db',
  database: 'golden_db',
  password: 'password',
  port: 5432,
});

// --- CATALOG OF AVAILABLE ITEMS ---
const CATALOG = [
    { id: 'i1', name: "Engine Oil 40W", cert: false },
    { id: 'i2', name: "Fresh Water (Tons)", cert: false },
    { id: 'i3', name: "Life Raft", cert: true },
    { id: 'i4', name: "Diesel Fuel (Tons)", cert: true },
    { id: 'i5', name: "Provisions (Food)", cert: false },
    { id: 'i6', name: "Hydraulic Oil", cert: false },
    { id: 'i7', name: "Spare Pistons", cert: true },
    { id: 'i8', name: "Medical Kit", cert: true },
    { id: 'i9', name: "Nav Charts", cert: false },
    { id: 'i10', name: "Pyrotechnics", cert: true },
    { id: 'i11', name: "Thermal Suits", cert: true },
    { id: 'i12', name: "Anti-Freeze", cert: false }
];

let FLEET = [
  { 
    id: 1, 
    name: "MV Golden Corn", 
    captain: "Capt. Ahmed",
    items: [ { name: "Engine Oil 40W", qty: 10, cert: false }, { name: "Life Raft", qty: 2, cert: true } ]
  },
  { 
    id: 2, 
    name: "MV Blue Whale", 
    captain: "Capt. John Smith",
    items: [ { name: "Diesel Fuel (Tons)", qty: 20, cert: true } ]
  }
];

let USERS = [
    { username: "Admin", password: "1234" }
];

// --- API ENDPOINTS ---

app.post('/api/login', (req, res) => {
    let { username, password } = req.body;
    if(username) {
        username = username.trim().toLowerCase()
            .split(' ')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }
    const user = USERS.find(u => u.username === username && u.password === password);
    if (user) res.json({ success: true, username: user.username });
    else res.status(401).json({ success: false, message: "Invalid Credentials" });
});

app.post('/api/users', (req, res) => {
    let { username, password } = req.body;
    if (!username || !password) return res.json({ success: false, message: "Missing fields" });
    if (password.length < 4) return res.json({ success: false, message: "Password must be at least 4 characters" });
    
    username = username.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const exists = USERS.find(u => u.username === username);
    if(exists) return res.json({ success: false, message: "User exists" });

    USERS.push({ username, password });
    res.json({ success: true });
});

app.delete('/api/users/:username', (req, res) => {
    if(USERS.length <= 1) return res.json({ success: false, message: "Cannot delete last user" });
    USERS = USERS.filter(u => u.username !== req.params.username);
    res.json({ success: true });
});

app.get('/api/fleet', (req, res) => res.json(FLEET));

app.post('/api/fleet', (req, res) => {
    const { name, captain, cargo } = req.body;
    const shipItems = cargo.map(entry => {
        const item = CATALOG.find(c => c.id === entry.id);
        return { name: item.name, qty: entry.qty, cert: item.cert };
    });
    const newShip = { id: Date.now(), name, captain, items: shipItems };
    FLEET.push(newShip);
    res.json({ success: true });
});

app.delete('/api/fleet/:id', (req, res) => {
    FLEET = FLEET.filter(ship => ship.id !== parseInt(req.params.id));
    res.json({ success: true });
});

app.post('/api/deliver', async (req, res) => {
  const { shipName, signature, report } = req.body;
  try {
    await pool.query(
      `INSERT INTO orders (ship_name, status, signature_data, report_text, delivery_date) VALUES ($1, 'DELIVERED', $2, $3, NOW())`,
      [shipName, signature, report]
    );
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

app.get('/api/orders', async (req, res) => {
  try {
    const result = await pool.query(`SELECT * FROM orders ORDER BY delivery_date DESC`);
    const deliveredOrders = result.rows;
    if (req.query.type === 'json') return res.json(deliveredOrders);

    const deliveredNames = deliveredOrders.map(o => o.ship_name);
    const pendingShips = FLEET.filter(ship => !deliveredNames.includes(ship.name));

    let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Golden Ocean | Logistics Hub</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #121212; color: #e0e0e0; margin: 0; }
        header { background: #1f1f1f; padding: 20px 40px; display: flex; justify-content: space-between; border-bottom: 1px solid #333; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .panel { background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; margin-bottom: 30px; }
        input { background: #2a2a2a; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; }
        button { cursor: pointer; padding: 10px 20px; border-radius: 4px; border: none; font-weight: bold; }
        .btn-primary { background: #FFC107; color: black; }
        .btn-danger { background: #ef4444; color: white; padding: 4px 8px; font-size: 12px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px; }
        .card { background: #252525; padding: 15px; border-radius: 6px; border-left: 4px solid #FFC107; position: relative; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th { background: #2a2a2a; color: #4CAF50; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #333; }
        
        /* Modal Style */
        #certModal { display:none; position:fixed; z-index:999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.9); align-items:center; justify-content:center; }
        .cert-paper { background:white; color:black; width:500px; padding:40px; border:15px double #c5a059; text-align:center; box-shadow:0 0 50px rgba(255,193,7,0.3); }
        .cert-icon { cursor:pointer; font-size:16px; transition: transform 0.2s; }
        .cert-icon:hover { transform: scale(1.2); }
      </style>
      <script>
        function showCert(itemName) {
            document.getElementById('modalItemName').innerText = itemName;
            document.getElementById('certDate').innerText = new Date().toLocaleDateString();
            document.getElementById('certModal').style.display = 'flex';
        }
        function closeCert() { document.getElementById('certModal').style.display = 'none'; }

        async function addShip(e) {
            e.preventDefault();
            const name = document.getElementById('shipName').value;
            const captain = document.getElementById('captainName').value;
            const inputs = document.querySelectorAll('.qty-input');
            const cargo = [];
            inputs.forEach(i => { if(i.value > 0) cargo.push({ id: i.dataset.id, qty: parseInt(i.value) }); });
            if(!name || cargo.length === 0) return alert("Fill Name & Cargo");
            await fetch('/api/fleet', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ name, captain, cargo })});
            window.location.reload();
        }
        async function deletePending(id) { if(confirm("Remove?")) { await fetch('/api/fleet/'+id, {method:'DELETE'}); window.location.reload(); }}
        async function deleteOrder(id) { if(confirm("Reset?")) { await fetch('/api/orders/'+id, {method:'DELETE'}); window.location.reload(); }}
        async function createUser(e) {
            e.preventDefault();
            const u = document.getElementById('newUser').value;
            const p = document.getElementById('newPass').value;
            const res = await fetch('/api/users', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ username:u, password:p })});
            const data = await res.json();
            if(data.success) window.location.reload(); else alert(data.message);
        }
      </script>
    </head>
    <body>
      <div id="certModal" onclick="closeCert()">
         <div class="cert-paper" onclick="event.stopPropagation()">
            <h1 style="color:#c5a059; margin:0;">ISO 9001:2015</h1>
            <p style="font-size:12px; letter-spacing:2px;">CERTIFICATE OF CONFORMITY</p>
            <hr style="border:1px solid #c5a059; width:50%;">
            <p style="margin-top:30px;">This is to certify that the product:</p>
            <h2 id="modalItemName" style="text-transform:uppercase;"></h2>
            <p>has been inspected and found to be in compliance with international maritime safety standards.</p>
            <div style="margin-top:40px; display:flex; justify-content:space-around;">
                <div>
                    <p style="font-size:10px; margin:0;">DATE OF ISSUE</p>
                    <b id="certDate"></b>
                </div>
                <div>
                    <p style="font-size:10px; margin:0;">AUTHORITY</p>
                    <b>GOLDEN OCEAN HUB</b>
                </div>
            </div>
            <button onclick="closeCert()" style="margin-top:30px; background:#c5a059; color:white;">Close</button>
         </div>
      </div>

      <header>
        <h1>⚓ Golden Ocean Hub</h1>
        <div style="display:flex; gap:10px;">
           <div style="background:#2a2a2a; padding:5px 15px; border-radius:5px; text-align:center;">
              <div style="color:#FFC107; font-weight:bold; font-size:18px;">${pendingShips.length}</div>
              <div style="color:#888; font-size:10px;">PENDING</div>
           </div>
           <div style="background:#2a2a2a; padding:5px 15px; border-radius:5px; text-align:center;">
              <div style="color:#4CAF50; font-weight:bold; font-size:18px;">${deliveredOrders.length}</div>
              <div style="color:#888; font-size:10px;">DELIVERED</div>
           </div>
        </div>
      </header>

      <div class="container">
        <div class="panel" style="border-color: #2196F3;">
            <h2 style="color:#2196F3; margin-top:0;">👥 User Access</h2>
            <div style="display:flex; gap:20px;">
                <form onsubmit="createUser(event)" style="flex:1; display:flex; gap:5px;">
                    <input type="text" id="newUser" placeholder="Username" style="flex:1;">
                    <input type="text" id="newPass" placeholder="Password" style="flex:1;">
                    <button type="submit" style="background:#2196F3; color:white;">Add</button>
                </form>
                <div style="flex:1; display:flex; gap:5px; flex-wrap:wrap;">
                    ${USERS.map(u => `<div style="background:#333; padding:5px 10px; border-radius:20px; font-size:12px;">${u.username}</div>`).join('')}
                </div>
            </div>
        </div>

        <div class="panel">
            <h2 style="color:#FFC107; margin-top:0;">🛠️ Fleet Manager</h2>
            <form onsubmit="addShip(event)">
                <div style="display:flex; gap:10px; margin-bottom:15px;">
                    <input type="text" id="shipName" placeholder="Ship Name" style="flex:1;">
                    <input type="text" id="captainName" placeholder="Captain Name" style="flex:1;">
                </div>
                <div class="items-grid">
                    ${CATALOG.map(i => `
                        <div style="background:#2a2a2a; padding:8px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                            <span>${i.name} ${i.cert ? `<span class="cert-icon" title="View Certificate" onclick="showCert('${i.name}')">📜</span>` : ''}</span>
                            <input type="number" class="qty-input" data-id="${i.id}" placeholder="0" style="width:40px;">
                        </div>
                    `).join('')}
                </div>
                <button type="submit" class="btn-primary">+ Add Ship to Queue</button>
            </form>
        </div>

        <h2 style="color:#FFC107">⏳ Pending Queue</h2>
        <div class="grid">
            ${pendingShips.map(s => `
                <div class="card">
                    <button onclick="deletePending(${s.id})" style="position:absolute; top:10px; right:10px; background:none; color:red;">X</button>
                    <h3 style="margin:0;">${s.name}</h3>
                    <small style="color:#888;">${s.captain}</small>
                    <div style="margin-top:15px; font-size:12px;">
                        ${s.items.map(i => `
                            <div style="display:flex; justify-content:space-between; border-bottom:1px solid #333; padding:2px 0;">
                                <span>${i.name} ${i.cert ? `<span class="cert-icon" onclick="showCert('${i.name}')">📜</span>` : ''}</span>
                                <b style="color:#FFC107">x${i.qty}</b>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>

        <h2 style="color:#4CAF50; margin-top:40px;">✅ Delivery History</h2>
        <table>
            <thead><tr><th>Ship</th><th>Report</th><th>Signature</th><th>Date</th><th>Action</th></tr></thead>
            <tbody>
                ${deliveredOrders.map(o => `
                    <tr>
                        <td><b>${o.ship_name}</b></td>
                        <td style="color:#aaa;"><i>${o.report_text}</i></td>
                        <td><img src="${o.signature_data}" height="30" style="background:white; border-radius:3px;"></td>
                        <td style="color:#888;">${new Date(o.delivery_date).toLocaleDateString()}</td>
                        <td><button class="btn-danger" onclick="deleteOrder(${o.id})">Reset</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
      </div>
    </body>
    </html>`;
    res.send(html);
  } catch (e) { res.send(e.message); }
});

app.delete('/api/orders/:id', async (req, res) => {
  try { await pool.query(`DELETE FROM orders WHERE id = $1`, [req.params.id]); res.json({ success: true }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

async function startServer() {
    try {
        await pool.query('DELETE FROM orders'); 
        app.listen(port, () => console.log(`Server on port ${port}`));
    } catch (err) { console.error(err); }
}
startServer();