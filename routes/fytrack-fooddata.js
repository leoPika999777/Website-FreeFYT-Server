import express from 'express'
import db from '../utils/connect-mysql.js'
// eslint-disable-next-line import/no-unresolved
import dayjs from 'dayjs'
import upload from '../utils/upload-imgs.js'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 獲取所有食物種類
// 這是後端代碼中的一個路由處理程序，用於從資料庫獲取所有食品類別並將它們發送到前端。
// 當HTTP GET請求這個路徑時，將執行後面的異步回調函數

// 將查詢結果發送回前端。如果查詢成功，則返回包含食物數據的JSON響應；如果出錯，則返回一個錯誤消息。

router.get('/food-categories', async (req, res) => {
  try {
    const sql = 'SELECT * FROM food_category_reference'
    // 使用await關鍵字來異步執行SQL查詢。
    // 將查詢結果解構賦值到categories變數。這裡使用了數組解構，因為db.query返回的是一個包含結果集的數組。
    const [categories] = await db.query(sql)
    res.json({ success: true, data: categories })
  } catch (error) {
    console.error('Error fetching food categories:', error)
    res.status(500).json({ success: false, message: '內部服務器錯誤' })
  }
})

// 搜尋食物數據
router.get('/search-foods', async (req, res) => {
  try {
    // 從 HTTP 請求的 query 參數中獲取搜索條件，包括 category（食物類別）、keyword（搜索關鍵字）、page（當前頁碼）和 limit（每頁顯示數量）。
    const { category = '', keyword = '', page = 1, limit = 10 } = req.query

    // 打印出接收到的搜索參數，方便調試
    console.log('Received search parameters:', req.query)

    // 根據搜索參數構建SQL查詢
    // 執行SQL查詢，使用db.query與數據庫通信。SQL查詢使用LIKE操作符進行模糊匹配，並且如果提供了特定類別，它將包含一個過濾條件。
    const offset = (page - 1) * limit
    // 準備查詢參數
    const searchLike = `%${keyword}%`

    // 第一個查詢語句查詢符合條件的總食品數量
    // SELECT COUNT(*)：計算滿足查詢條件的行數。
    // AS totalItems：將計算結果命名為 totalItems，方便在查詢結果中引用。
    // FROM fytrack_food ff:從 fytrack_food 表中選擇數據。ff 是 fytrack_food 表的别名，用於簡化查詢語句。
    // 將 fytrack_food 表和 food_category_reference 表進行連接，fcr 是 food_category_reference 表的别名。連接的條件是 fytrack_food 表中的 food_category_id 與 food_category_reference 表中的 food_category_id 相等。
    // WHERE 子句用於指定查詢的條件。ff.food_name LIKE ?：選擇 food_name 字段與提供的參數相匹配的行。? 是一個占位符，用於在查詢執行時傳入實際的搜尋關鍵詞。

    /* SELECT COUNT(*) AS totalItems：這部分從資料庫中選擇（SELECT）數據，並計算（COUNT(*)）符合後續條件的行數。 AS totalItems 是給這個計數結果一個別名，這樣在查詢結果中就可以透過 totalItems 來引用它。
    
    FROM fytrack_food ff：指定了要查詢的主要資料表 fytrack_food，並給這個表指定了一個別名 ff，以便在後續的查詢中引用。
    
    JOIN food_category_reference fcr ON ff.food_category_id = fcr.food_category_id：這是一個連接（JOIN）操作，它將 fytrack_food 表和 food_category_reference 表基於共同的 food_category_id 字段進行了連接。 fcr 是 food_category_reference 表的別名。
    
    WHERE ff.food_name LIKE ?：這是一個條件語句（WHERE），用來限制查詢的結果。 這裡它檢查 fytrack_food 表中的 food_name 欄位是否符合某個特定模式（LIKE 後面的部分）。 ? 是一個參數佔位符，在實際執行這個 SQL 語句時，這個佔位符會被具體的值替換，這個值通常是由用戶提供的，用於搜尋匹配特定名稱的食物。
    
    總的來說，這個 SQL 查詢用來計算在 fytrack_food 表中，其食物名稱符合某個特定模式的行的數量，並將這個數量命名為 totalItems。 這種類型的查詢通常用於實現分頁功能，其中需要知道滿足某個搜尋條件的資料總量。 */
    let countSql = `
   SELECT COUNT(*) AS totalItems
   FROM fytrack_food ff
   JOIN food_category_reference fcr ON ff.food_category_id = fcr.food_category_id
   WHERE ff.food_name LIKE ? `

    // 如果指定了類別，則增加一個額外的條件來過濾結果
    if (category !== '') {
      countSql += 'AND fcr.food_category_id = ?'
    }

    const countQueryParams =
      category !== '' ? [searchLike, category] : [searchLike]
    // 添加的代碼，用於執行計算總數的SQL查詢
    const [[{ totalItems }]] = await db.query(countSql, countQueryParams)

    // 在這裡加入 console.log 來查看查詢結果
    // console.log(foods)

    // 執行獲取食品數據的查詢
    // 選擇 fytrack_food 表中的所有字段，同時選擇 food_category_reference 表中的 food_category_name 字段。
    // 從 fytrack_food 表中選擇數據並與 food_category_reference 表進行連接。
    // 選擇 food_name 與提供的搜索關鍵詞相匹配的行。
    let sql = `
    SELECT ff.food_id, ff.food_name, ff.food_calorie, ff.food_protein, ff.food_carb, ff.food_fat, ff.serving_size, ff.serving_size_unit
    FROM fytrack_food ff
    JOIN food_category_reference fcr ON ff.food_category_id = fcr.food_category_id
    WHERE ff.food_name LIKE ?`

    if (category !== '') {
      sql += 'AND fcr.food_category_id = ? '
    }
    // LIMIT 子句用於限制查詢結果的數量，實現分頁。
    // 第一個 ? 是偏移量（offset），即從哪一行開始獲取數據。第二個 ? 是限制數量（limit`），即從偏移量開始，要獲取多少行數據。
    // 例如，如果 page = 2 和 limit = 10，則 offset 將是 10（因為第一頁已經顯示了前 10 行，所以從第 11 行開始），查詢將傳回第 11 到第 20 行的資料。
    // 這兩個查詢是為了實現具有分頁功能的搜尋。 第一個查詢計算了符合搜尋條件的總食品數量，而第二個查詢獲取了符合條件的特定食品數據，限制在請求的頁面和頁面大小範圍內。
    sql += 'LIMIT ?, ?'

    const queryParams =
      category !== ''
        ? [searchLike, category, offset, +limit]
        : [searchLike, offset, +limit]

    console.log(sql)
    // 執行查詢
    const [foods] = await db.query(sql, queryParams)

    // 發送帶有食品數據和總數的響應
    // 後端返回的數據格式：在後端代碼中，您需要確保返回的數據格式與前端期望的一致。回應包括一個包含食品數據數組的對象：這樣，前端就可以正確接收並處理這些數據。
    const totalPage = Math.ceil(totalItems / limit)
    res.json({
      success: true,
      data: foods,
      totalItems,
      page: Number(page),
      limit: Number(limit),
      totalPage,
    })
  } catch (error) {
    // 捕獲並處理錯誤
    console.error('Error searching foods:', error)
    res.status(500).json({ success: false, message: '內部服務器錯誤' })
  }
})

export default router
