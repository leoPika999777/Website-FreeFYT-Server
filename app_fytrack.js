// 後端api
// 在您的項目目錄中創建一個名為 app.js 的文件，並將以下代碼寫入這個文件：
const express = require('express')
const mysql = require('mysql')

const app = express()
const port = 3000

// 營養數據的示例
const nutritionData = {
  fat: { current: 10, total: 150 },
  protein: { current: 20, total: 130 },
  carbs: { current: 30, total: 200 },
}

app.get('/nutrition-data', (req, res) => {
  res.json(nutritionData)
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

// 運行您的服務器:在終端中運行以下命令來啟動服務器：node app.js
// 現在，您的服務器正在監聽 3000 端口，並且 /nutrition-data 路徑將返回硬編碼的營養數據。
// 從前端連接到此 API，確保您的前端 JavaScript 代碼指向正確的 API 端點：
// 在您的 app.js 文件中，設置一個連接到您的 MySQL 數據庫的 Express 服務器。

// MySQL 數據庫配置
const db = mysql.createConnection({
  host: 'localhost', // 數據庫地址
  user: 'yourUsername', // 數據庫用戶名
  password: 'yourPassword', // 數據庫密碼
  database: 'yourDatabaseName', // 數據庫名稱
})

// 連接到數據庫
db.connect((err) => {
  if (err) throw err
  console.log('Connected to MySQL')
})

// 獲取營養數據的 API
app.get('/nutrition-data', (req, res) => {
  const query = 'SELECT * FROM nutrition'
  db.query(query, (err, results) => {
    if (err) throw err
    res.json(results)
  })
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})

/* 在這段 Node.js 和 Express 用於連接 MySQL 的代碼中，您需要根據您自己的環境和設置替換以下部分：

MySQL 數據庫配置：

host: 如果您的 MySQL 數據庫運行在本地機器上，通常設為 'localhost'。如果數據庫位於遠程服務器或雲服務器上，則需要提供相應的地址或主機名。
user: 這應該替換為您用來連接數據庫的 MySQL 用戶名。
password: 這是您用戶的密碼，請確保使用正確的密碼。
database: 這是您想要連接的 MySQL 數據庫的名稱。
SQL 查詢：

如果您的數據庫結構和表名與示例中的不同，您需要相應地修改 SQL 查詢。例如，如果您存儲營養數據的表名不是 nutrition，則需要將查詢中的表名更改為實際的表名。
埠號（Port）：

const port = 3000;：這裡的埠號設為 3000，這是一個常用的開發埠號。如果該埠號已經被其他應用使用，或者您有特定的埠號要求，請更改它。
其他配置：

根據您的需求，您可能還需要添加其他配置，例如 CORS 支持、路由處理、錯誤處理等。
安全性和性能：

請注意，此代碼僅適用於示例和學習目的。在生產環境中使用時，您需要考慮加強安全性（例如，避免 SQL 注入攻擊）、處理錯誤、優化性能等 */
