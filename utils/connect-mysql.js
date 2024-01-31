import mysql from "mysql2/promise";

// 將process.env 物件解構，賦予{DB_HOST,DB_USER,DB_PASS,DB_NAME}變數值
const {DB_HOST,DB_USER,DB_PASS,DB_NAME} = process.env;
console.log({DB_HOST,DB_USER,DB_PASS,DB_NAME});

// 這裡使用 mysql.createPool 創建了一個 MySQL 連接池
const db = await mysql.createPool({
  host:DB_HOST,
  user:DB_USER,
  password:DB_PASS,
  database:DB_NAME,
  waitForConnections:true,
  connectionLimit:5,
  queueLimit:0,
})

export default db;