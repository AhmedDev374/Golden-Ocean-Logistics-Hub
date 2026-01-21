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

// --- DATA STORES (In Memory) ---

// 1. FLEET DATA
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

// 2. USER DATA
let USERS = [
    { username: "Admin", password: "123" }
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
    if (user) {
        res.json({ success: true, username: user.username });
    } else {
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

app.post('/api/users', (req, res) => {
    let { username, password } = req.body;
    if (!username || !password) return res.json({ success: false });
    username = username.trim().toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    const exists = USERS.find(u => u.username === username);
    if(exists) return res.json({ success: false, message: "User exists" });
    USERS.push({ username, password });
    res.json({ success: true });
});

app.delete('/api/users/:username', (req, res) => {
    const userToDelete = req.params.username;
    if(USERS.length <= 1) return res.json({ success: false, message: "Cannot delete last user" });
    USERS = USERS.filter(u => u.username !== userToDelete);
    res.json({ success: true });
});

app.get('/api/fleet', (req, res) => {
    res.json(FLEET);
});

app.post('/api/fleet', (req, res) => {
    const { name, captain, cargo } = req.body;
    const shipItems = cargo.map(entry => {
        const item = CATALOG.find(c => c.id === entry.id);
        return { 
            name: item.name, 
            qty: entry.qty, 
            cert: item.cert 
        };
    });
    const newShip = { id: Date.now(), name, captain, items: shipItems };
    FLEET.push(newShip);
    res.json({ success: true });
});

app.delete('/api/fleet/:id', (req, res) => {
    const idToDelete = parseInt(req.params.id);
    FLEET = FLEET.filter(ship => ship.id !== idToDelete);
    res.json({ success: true });
});

app.post('/api/deliver', async (req, res) => {
  const { shipName, signature, report } = req.body;
  try {
    await pool.query(
      `INSERT INTO orders (ship_name, status, signature_data, report_text, delivery_date) 
       VALUES ($1, 'DELIVERED', $2, $3, NOW())`,
      [shipName, signature, report]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
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
        body { font-family: 'Segoe UI', sans-serif; background: #121212; color: #e0e0e0; padding: 0; margin: 0; }
        header { background: #1f1f1f; padding: 20px 40px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #333; }
        h1 { margin: 0; color: #FFC107; font-size: 24px; }
        .container { max-width: 1200px; margin: 30px auto; padding: 0 20px; }
        .panel { background: #1e1e1e; padding: 25px; border-radius: 8px; border: 1px solid #333; margin-bottom: 30px; }
        input { background: #2a2a2a; border: 1px solid #444; color: white; padding: 10px; border-radius: 4px; }
        button { cursor: pointer; padding: 10px 20px; border-radius: 4px; border: none; font-weight: bold; }
        .btn-primary { background: #FFC107; color: black; }
        .btn-danger { background: #ef4444; color: white; padding: 4px 8px; font-size: 12px; }
        .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 20px; }
        .items-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 10px; margin-bottom: 15px; }
        .card { background: #252525; padding: 15px; border-radius: 6px; border-left: 3px solid #FFC107; position: relative; }
        table { width: 100%; border-collapse: collapse; background: #1e1e1e; margin-top: 15px; }
        th { background: #2a2a2a; color: #4CAF50; padding: 12px; text-align: left; }
        td { padding: 12px; border-bottom: 1px solid #333; }
        .user-list { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 15px; }
        .user-tag { background: #333; padding: 5px 10px; border-radius: 20px; display: flex; align-items: center; gap: 10px; border: 1px solid #444; }

        /* Certified Items Modal Styles */
        #certModal { display:none; position:fixed; z-index:999; left:0; top:0; width:100%; height:100%; background:rgba(0,0,0,0.9); align-items:center; justify-content:center; }
        .cert-paper { background:white; color:black; width:500px; padding:40px; border:15px double #c5a059; text-align:center; box-shadow:0 0 50px rgba(255,193,7,0.3); }
        .cert-icon { cursor:pointer; font-size:16px; transition: transform 0.2s; }
        .cert-icon:hover { transform: scale(1.2); }
      </style>
      <script>
        // Certificate Functions
        function showCert(itemName) {
            document.getElementById('modalItemName').innerText = itemName;
            document.getElementById('certDate').innerText = new Date().toLocaleDateString();
            document.getElementById('certModal').style.display = 'flex';
        }
        function closeCert() { document.getElementById('certModal').style.display = 'none'; }

        async function deleteOrder(id) {
            if(!confirm("Reset?")) return;
            await fetch('/api/orders/' + id, { method: 'DELETE' });
            window.location.reload();
        }
        async function deletePending(id) {
            if(!confirm("Remove?")) return;
            await fetch('/api/fleet/' + id, { method: 'DELETE' });
            window.location.reload();
        }
        async function addShip(e) {
            e.preventDefault();
            const name = document.getElementById('shipName').value;
            const captain = document.getElementById('captainName').value;
            const inputs = document.querySelectorAll('.qty-input');
            const cargo = [];
            inputs.forEach(i => { if(i.value > 0) cargo.push({ id: i.dataset.id, qty: parseInt(i.value) }); });
            if(!name || cargo.length === 0) return alert("Fill Name & Cargo");
            await fetch('/api/fleet', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, captain, cargo })
            });
            window.location.reload();
        }
        async function createUser(e) {
            e.preventDefault();
            const u = document.getElementById('newUser').value;
            const p = document.getElementById('newPass').value;
            if(!u || !p) return alert("Enter Username and Password");
            const res = await fetch('/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: u, password: p })
            });
            const data = await res.json();
            if(data.success) window.location.reload(); else alert(data.message || "Error");
        }
        async function deleteUser(username) {
            if(!confirm("Delete User " + username + "?")) return;
            const res = await fetch('/api/users/' + username, { method: 'DELETE' });
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
            <h2 id="modalItemName" style="text-transform:uppercase; color:black;"></h2>
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
           <div style="background:#2a2a2a; padding:5px 15px; border-radius:5px; text-align:center; min-width:60px;">
              <div style="color:#FFC107; font-weight:bold; font-size:18px;">${pendingShips.length}</div>
              <div style="color:#888; font-size:10px; font-weight:bold;">PENDING</div>
           </div>
           <div style="background:#2a2a2a; padding:5px 15px; border-radius:5px; text-align:center; min-width:60px;">
              <div style="color:#4CAF50; font-weight:bold; font-size:18px;">${deliveredOrders.length}</div>
              <div style="color:#888; font-size:10px; font-weight:bold;">DELIVERED</div>
           </div>
        </div>
      </header>

      <div class="container">
        <div class="panel" style="border-color: #2196F3;">
            <h2 style="color:#2196F3; margin-top:0;">👥 User Access Control</h2>
            <div style="display:flex; gap:30px; align-items:start;">
                <div style="flex:1;">
                    <form onsubmit="createUser(event)" style="background:#2a2a2a; padding:15px; border-radius:6px;">
                        <label style="display:block; color:#888; font-size:12px; margin-bottom:5px;">CREATE NEW APP USER</label>
                        <div style="display:flex; gap:10px;">
                            <input type="text" id="newUser" placeholder="Username" style="flex:1;">
                            <input type="text" id="newPass" placeholder="Password" style="flex:1;">
                            <button type="submit" style="background:#2196F3; color:white;">Add User</button>
                        </div>
                    </form>
                </div>
                <div style="flex:1;">
                    <label style="display:block; color:#888; font-size:12px;">ACTIVE USERS</label>
                    <div class="user-list">
                        ${USERS.map(u => `
                            <div class="user-tag">
                                <span>👤 <b>${u.username}</b></span>
                                <span style="color:#666; font-size:10px;">(Pass: ${u.password})</span>
                                <button class="btn-danger" onclick="deleteUser('${u.username}')">X</button>
                            </div>
                        `).join('')}
                    </div>
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
                        <div style="background:#2a2a2a; padding:5px; border-radius:4px; display:flex; justify-content:space-between; align-items:center; font-size:12px;">
                            <span>${i.name} ${i.cert ? `<span class="cert-icon" title="View Certificate" onclick="showCert('${i.name}')">📜</span>` : ''}</span>
                            <input type="number" class="qty-input" data-id="${i.id}" placeholder="0" style="width:40px; padding:2px; text-align:center;">
                        </div>
                    `).join('')}
                </div>
                <button type="submit" class="btn-primary">+ Add Ship</button>
            </form>
        </div>

        <h2 style="color:#FFC107">⏳ Pending Queue</h2>
        <div class="grid">
            ${pendingShips.map(s => `
                <div class="card">
                    <button onclick="deletePending(${s.id})" style="position:absolute; top:10px; right:10px; background:none; color:red; border:1px solid red; padding:2px 6px;">X</button>
                    <h3 style="margin-top:0;">${s.name}</h3>
                    <div style="color:#888; font-size:12px;">${s.captain}</div>
                    <div style="margin-top:10px; font-size:11px;">
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
                        <td style="color:white; font-weight:bold;">${o.ship_name}</td>
                        <td style="color:#aaa; font-style:italic;">"${o.report_text}"</td>
                        <td><img src="${o.signature_data}" height="30" style="background:white; padding:2px; border-radius:2px;"></td>
                        <td style="color:#888; font-size:12px;">${new Date(o.delivery_date).toLocaleString()}</td>
                        <td><button class="btn-danger" onclick="deleteOrder(${o.id})">Reset</button></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
      </div>
    </body>
    </html>
    `;
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
        app.listen(port, () => console.log(`Backend running on port ${port}`));
    } catch (err) { console.error(err); }
}
startServer();