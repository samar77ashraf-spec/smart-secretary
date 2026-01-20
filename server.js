const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bcrypt = require('bcrypt');

const app = express();
app.use(cors());
app.use(express.json());

// الربط بالسحابة (Aiven)
const db = mysql.createConnection({
    host: 'mysql-fa2bf35-samar77ashraf-4a04.j.aivencloud.com',
    port: 23503,
    user: 'avnadmin',
    password: 'AVNS_VEyKFuyJY3wsqBuB6iy', 
    database: 'defaultdb',
    ssl: { rejectUnauthorized: false }
});

db.connect(err => {
    if (err) {
        console.log("خطأ في الربط: " + err.message);
    } else {
        console.log("تم الاتصال بنجاح بسيرفر Aiven السحابي! 🌍✅");
        
        // إنشاء الجداول
        db.query(`CREATE TABLE IF NOT EXISTS users (
            id INT AUTO_INCREMENT PRIMARY KEY,
            email VARCHAR(255) UNIQUE,
            password VARCHAR(255),
            company_name VARCHAR(255),
            phone VARCHAR(20)
        )`);

        db.query(`CREATE TABLE IF NOT EXISTS appointments (
            id INT AUTO_INCREMENT PRIMARY KEY,
            client_name VARCHAR(255),
            appointment_time DATETIME,
            status VARCHAR(50),
            phone VARCHAR(20),
            notes TEXT,
            user_id INT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);
    }
});

// المسارات الأساسية
app.post('/register', async (req, res) => {
    const { email, password, company_name, phone } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        db.query("INSERT INTO users (email, password, company_name, phone) VALUES (?, ?, ?, ?)", 
        [email, hashedPassword, company_name, phone], (err) => {
            if (err) return res.status(400).json({ success: false, message: "الإيميل مسجل مسبقاً" });
            res.json({ success: true });
        });
    } catch { res.status(500).send("Error"); }
});

app.post('/login', (req, res) => {
    const { email, password } = req.body;
    db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
        if (err || results.length === 0) return res.status(401).json({ success: false });
        const match = await bcrypt.compare(password, results[0].password);
        if (match) {
            res.json({ success: true, user: { id: results[0].id, name: results[0].company_name, phone: results[0].phone } });
        } else { res.status(401).json({ success: false }); }
    });
});

app.post('/add-appointment', (req, res) => {
    const { client_name, appointment_time, status, phone, notes, user_id } = req.body;
    db.query("INSERT INTO appointments (client_name, appointment_time, status, phone, notes, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    [client_name, appointment_time, status, phone, notes, user_id], (err) => {
        if (err) return res.status(500).json(err);
        res.json({ success: true });
    });
});

app.get('/get-appointments/:user_id', (req, res) => {
    db.query("SELECT * FROM appointments WHERE user_id = ? ORDER BY appointment_time ASC", [req.params.user_id], (err, results) => {
        if (err) return res.status(500).json(err);
        res.json(results);
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));