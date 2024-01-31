import express from 'express'

import db from '../utils/connect-mysql.js' // 從相對路徑導入資料庫連接模組，用於連接 MySQL 資料庫。
// eslint-disable-next-line import/no-unresolved
import dayjs from 'dayjs'
import upload from '../utils/upload-imgs.js'
import multer from 'multer' //導入 multer，一個用於處理 multipart/form-data 類型數據（主要用於上傳檔案）的中介軟體。
import { v4 as uuidv4 } from 'uuid' //從 uuid 函式庫導入 v4 方法，用於生成唯一的 UUID。
import path from 'path'

import { fileURLToPath } from 'url' // 導入 Node.js 中的 path 和 url 模組，用於處理檔案路徑。

// 設置當前檔案的檔案名和目錄名變數
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 建立 Express 路由器
const router = express.Router()

// 定義 GET 請求處理
// 定義根路徑('/')的 GET 請求處理。當訪問根路徑時，回傳一個包含 { a: 1, b: 2 } 的 JSON 物件。
router.get('/', async (req, res) => {
  res.json({ a: 1, b: 2 })
})

// 定義 '/nutrition' 路徑的 GET 請求處理。當訪問該路徑時，根據請求參數進行數據庫查詢並回傳結果。
router.get('/nutrition', async (req, res) => {
  /* 獲取和處理請求參數：從請求的查詢參數中提取 selected_date 和 member_id，若沒有提供，則使用預設值。 */
  const { selected_date = '2024-01-26', member_id = 56 } = req.query

  /*
  有修正
將fytrack_nutrition（別名fn）與fytrack_add（別名fa）進行連接。連接的條件是fytrack_nutrition表的ntdentry_sid欄位必須等於fytrack_add表的add_sid欄位。
繼續將前面的結果與fytrack_food（別名ff）表連接。連接的條件是fytrack_add表的food_id欄位必須等於fytrack_food表的food_id欄位。 
再將前面的結果與food_category_reference（別名fcr）表連接。連接的條件是food_category_reference表的food_category_id欄位必須等於fytrack_food表的food_category_id欄位。
這是一個篩選條件。它指定只返回fytrack_nutrition表中member_id為?（變數）的記錄，且fytrack_add表中ntdentry_date為（變數）的記錄。
*/
  // LEFT JOIN 返回左表（LEFT JOIN 語句左邊的表）的所有行，即使右表（LEFT JOIN 語句右邊的表）中沒有匹配。如果左表中的行在右表中沒有匹配，則結果中右表的部分將包含空值。
  const my_sql = `SELECT * FROM fytrack_add AS fa  LEFT JOIN fytrack_food AS ff ON fa.food_id = ff.food_id LEFT JOIN food_category_reference AS fcr ON fcr.food_category_id = ff.food_category_id WHERE fa.member_id =? AND fa.ntdentry_date=? ORDER BY fa.add_sid DESC`

  // 定義另一個 SQL 查詢語句，用於獲取會員的營養目標。
  const my_sql2 = `SELECT * FROM fytrack_nutrition AS fn WHERE fn.member_id = 56`

  /* console.log(`SELECT * 
FROM fytrack_nutrition AS fn
JOIN fytrack_add AS fa
    ON fn.ntdentry_sid = fa.add_sid
JOIN fytrack_food AS ff
  ON fa.food_id = ff.food_id
JOIN food_category_reference AS fcr
  ON fcr.food_category_id = ff.food_category_id
WHERE fn.member_id =${member_id} AND fa.ntdntry_date=${selected_date}  ORDER BY fn.ntdentry_date_time DESC`) */

  /* console.log(
    `SELECT * FROM fytrack_nutrition WHERE member_id =${member_id} ORDER BY ntdentry_date_time DESC LIMIT 1`
  ) */

  // 使用者當天吃哪些食物（執行第一個 SQL 查詢，獲取使用者當天的食物攝入情況。）
  const [rows] = await db.query(my_sql, [member_id, selected_date])
  // 使用者當天最新的目標（執行第二個 SQL 查詢，獲取使用者當天的最新目標。）
  const [rows2] = await db.query(my_sql2, [member_id])

  // return res.json(rows)
  console.log(rows, rows2)

  /* 資料處理和回應：
檢查查詢結果，如果有數據，則進一步處理並尋找匹配 selected_date 的行。
如果找到匹配的行，則以 JSON 格式回應該行數據。
如果沒有找到或沒有數據，則回應一個空的 JSON 物件。 */
  /* 這段代碼的功能是從資料庫查詢結果中尋找一個特定記錄，其日期與查詢參數 selected_date 匹配。以下是對這部分代碼的逐行解釋：
  1.檢查查詢結果是否存在：
  (1)if (rows && rows.length > 0) { ... }：這行代碼檢查 rows 是否存在並且其長度大於0。rows 是從資料庫查詢返回的結果陣列。
  2.尋找匹配的記錄：
  (1)const value = rows.find((v) => { ... })：使用陣列的 find 方法在 rows 中尋找第一個滿足條件的元素。find 方法接受一個回呼函數，該函數對陣列中的每個元素進行檢查，返回第一個使回呼函數返回 true 的元素。
  3.處理日期：
  (1)在 find 方法的回呼函數中，對每個元素 v 的 ntdentry_date_time 屬性進行處理。ntdentry_date_time 是一個日期物件。
  (2)const now = v.ntdentry_date_time：將當前元素的 ntdentry_date_time 屬性賦值給變數 now。
  (3)接下來，構造一個與 selected_date 格式相同的字串 dbDate：
  a.now.getFullYear() 獲取年份。
  b.now.getMonth() + 1 獲取月份（月份從0開始計數，因此加1）。
  c.now.getDate() 獲取日。
  d.使用三元運算符確保月份和日期始終是兩位數的格式，例如，'01', '02' 等。
  4.比較日期：
  (1)return dbDate.includes(selected_date)：檢查由 now 構造出的日期字串 dbDate 是否包含查詢參數 selected_date。如果包含，則 find 方法會返回當前的元素 v。
  5.總結，這段代碼的作用是在資料庫查詢結果中尋找第一個日期與給定查詢參數 selected_date 匹配的記錄。如果找到了匹配的記錄，value 將被賦值為該記錄；如果沒有找到，value 將是 undefined。
 */
  // if (rows && rows.length > 0) {
  //   const value = rows.find((v) => {
  //     const now = v.ntdentry_date_time
  //     const dbDate = `${now.getFullYear()}-${
  //       now.getMonth() + 1 < 10
  //         ? '0' + (now.getMonth() + 1)
  //         : now.getMonth() + 1
  //     }-${now.getDate() < 10 ? '0' + now.getDate() : now.getDate()}`

  //     return dbDate.includes(selected_date)
  //   })

  //   if (value) {
  //     res.json(value)
  //   } else {
  //     res.json({})
  //   }
  // } else {
  // res.json({})
  // }

  // 根據查詢結果進行數據處理，計算總熱量並準備回傳結果。
  // 這段代碼主要功能是處理從資料庫中查詢得到的數據，計算總熱量，並將處理結果作為響應返回給客戶端。
  let totalValue = {} // 初始化一個空物件 totalValue，用於稍後儲存計算後的總熱量值。
  // 檢查從資料庫查詢返回的 rows 數組是否存在且長度大於 0。
  if (rows && rows.length > 0) {
    let food_calorie = 0 // 如果條件滿足，則初始化 food_calorie 變數用於計算總熱量。
    // 使用 for 循環遍歷 rows 數組中的每一項。
    /* 
    1.food_calorie += rows[i].food_calorie 
    等於
    2.food_calorie = food_calorie + rows[i].food_calorie
    */
    for (let i = 0; i < rows.length; i++) {
      food_calorie += rows[i].food_calorie // 將當前項目的 food_calorie 值加到總熱量 food_calorie 上。
      console.log('tzu', rows[i].food_calorie)
    }
    totalValue = { food_calorie: food_calorie } // 將計算出的總熱量值存入 totalValue 物件。
  } else {
    totalValue = { food_calorie: 0 } // 如果 rows 數組不存在或長度為 0，則將總熱量設置為 0。
  }

  // 根據查詢結果進行數據處理，計算總蛋白質攝取並準備回傳結果。
  // 這段代碼主要功能是處理從資料庫中查詢得到的數據，計算總蛋白質攝取，並將處理結果作為響應返回給客戶端。
  let totalValue2 = {} // 初始化一個空物件 totalValue2，用於稍後儲存計算後的總蛋白質攝取。
  // 檢查從資料庫查詢返回的 rows 數組是否存在且長度大於 0。
  if (rows && rows.length > 0) {
    let food_protein = 0 // 如果條件滿足，則初始化 food_protein 變數用於計算總蛋白質攝取。
    // 使用 for 循環遍歷 rows 數組中的每一項。
    for (let i = 0; i < rows.length; i++) {
      food_protein += rows[i].food_protein // 將當前項目的 food_protein 值加到總蛋白質攝取 food_protein 上。
      console.log('tzu', rows[i].food_protein)
    }
    totalValue2 = { food_protein: food_protein } // 將計算出的總蛋白質攝取存入 totalValue2 物件。
  } else {
    totalValue2 = { food_protein: 0 } // 如果 rows 數組不存在或長度為 0，則將總蛋白質攝取設置為 0。
  }

  // 根據查詢結果進行數據處理，計算總碳水化合物攝取並準備回傳結果。
  // 這段代碼主要功能是處理從資料庫中查詢得到的數據，計算總碳水化合物攝取，並將處理結果作為響應返回給客戶端。
  let totalValue3 = {} // 初始化一個空物件 totalValue3，用於稍後儲存計算後的總碳水化合物攝取。
  // 檢查從資料庫查詢返回的 rows 數組是否存在且長度大於 0。
  if (rows && rows.length > 0) {
    let food_carb = 0 // 如果條件滿足，則初始化 food_carb 變數用於計算總碳水化合物攝取。
    // 使用 for 循環遍歷 rows 數組中的每一項。
    for (let i = 0; i < rows.length; i++) {
      food_carb += rows[i].food_carb // 將當前項目的 food_carb 值加到總碳水化合物攝取 food_carb 上。
      console.log('tzu', rows[i].food_carb)
    }
    totalValue3 = { food_carb: food_carb } // 將計算出的總碳水化合物攝取存入 totalValue3 物件。
  } else {
    totalValue3 = { food_carb: 0 } // 如果 rows 數組不存在或長度為 0，則將總碳水化合物攝取設置為 0。
  }

  // 根據查詢結果進行數據處理，計算總脂肪攝取並準備回傳結果。
  // 這段代碼主要功能是處理從資料庫中查詢得到的數據，計算總脂肪攝取，並將處理結果作為響應返回給客戶端。
  let totalValue4 = {} // 初始化一個空物件 totalValue4，用於稍後儲存計算後的總脂肪攝取。
  // 檢查從資料庫查詢返回的 rows 數組是否存在且長度大於 0。
  if (rows && rows.length > 0) {
    let food_fat = 0 // 如果條件滿足，則初始化 food_fat 變數用於計算總脂肪攝取。
    // 使用 for 循環遍歷 rows 數組中的每一項。
    for (let i = 0; i < rows.length; i++) {
      food_fat += rows[i].food_fat // 將當前項目的 food_fat 值加到總脂肪攝取 food_fat 上。
      console.log('tzu', rows[i].food_fat)
    }
    totalValue4 = { food_fat: food_fat } // 將計算出的總脂肪攝取存入 totalValue4 物件。
  } else {
    totalValue4 = { food_fat: 0 } // 如果 rows 數組不存在或長度為 0，則將總脂肪攝取設置為 0。
  }

  const resultData = [
    totalValue,
    rows2[0],
    totalValue2,
    totalValue3,
    totalValue4,
  ] // 將計算出的總熱量（totalValue）和另一個查詢結果（rows2 的第一項）組合成一個數組。
  res.json(resultData) // 使用 res.json 方法將 resultData 作為 JSON 格式的響應返回給客戶端。
})

/*
在 JavaScript 中，表達式 rows && rows.length 是一種常見的方式來檢查一個數組是否存在且其長度大於 0。這個表達式涉及兩個部分：

rows: 這是對 rows 變數的直接引用。在這個上下文中，rows 應該是一個數組，通常來自於某種數據查詢的結果。這個檢查確保 rows 變數已經被定義，換句話說，它不是 undefined 或 null。

rows.length: 在 JavaScript 中，一個數組的 length 屬性表示該數組中元素的數量。

當這兩部分組合起來時 (rows && rows.length)，它們形成了一個邏輯表達式，這個表達式將會：

返回 false，如果 rows 是 undefined、null 或一個空數組（因為 rows.length 為 0）。
返回 true，如果 rows 是一個非空數組（即有一個或多個元素）。
在條件語句中使用這種表達式是一種有效的方式來防止在一個未定義或空的數組上執行操作，從而避免潛在的錯誤或異常。 */

//營養追蹤表單編輯
// 定義 '/edit/:member_id' 路徑的 GET 請求處理。用於獲取特定會員的營養資料，以便進行編輯。
router.get('/edit/:member_id', async (req, res) => {
  // 從 URL 的路徑參數中獲取 member_id，如果未提供，則預設為 56。
  let member_id = +req.params.member_id || 56
  // 定義 SQL 查詢語句，用於獲取特定會員的營養資料。
  const sql = `SELECT * FROM fytrack_nutrition WHERE member_id=?`
  // 執行 SQL 查詢。
  const [rows] = await db.query(sql, [member_id])
  if (!rows.length) {
    return res.status(404).json({ message: '找不到該會員的數據。' })
  }
  // 返回查詢到的第一筆數據。
  res.json(rows[0])
})

// 定義 '/nutrition/targets/' 路徑的 POST 請求處理。用於更新會員的營養目標數據。
router.post('/nutrition/targets/', async (req, res) => {
  // 從請求體中獲取會員ID和目標數據。
  const { member_id, caloric_target, protein_target, carb_target, fat_target } =
    req.body

  try {
    // 構建更新目標數據的 SQL 語句。
    const update_sql = `
      UPDATE fytrack_nutrition
      SET caloric_target = ?, protein_target = ?, carb_target = ?, fat_target = ?
      WHERE member_id = ?;
    `

    // 執行更新操作
    await db.query(update_sql, [
      caloric_target,
      protein_target,
      carb_target,
      fat_target,
      member_id,
    ])

    res.json({ success: true, message: '目標數據更新成功' })
  } catch (error) {
    console.error('更新目標數據時發生錯誤:', error)
    res.status(500).json({ success: false, message: '目標數據更新失敗' })
  }
})

// POST 路由，用於新增食物日記
// 定義了一個 POST 路徑 /nutrition/add，用於處理食物日記的新增請求。
// 在請求體中獲取用戶提交的數據。
// 執行 SQL 查詢以將數據插入到 fytrack_add 表。
// 返回成功或錯誤響應給前端。
router.post('/nutrition/add', async (req, res) => {
  // 從請求體中獲取數據
  const { member_id, ntdentry_date, ntdentry_time, food_name, serving_size } =
    req.body
  console.log('Received data:', req.body)
  console.log('Received member_id:', req.body.member_id) // 單獨打印 member_id

  // 驗證接收到的數據
  if (
    !member_id ||
    !ntdentry_date ||
    !ntdentry_time ||
    !food_name ||
    !serving_size
  ) {
    return res.status(400).json({ message: '缺少必要的數據字段' })
  }

  // 用於從提交的 ntdentry_time 中提取小時數
  const time = new Date(`1970-01-01T${ntdentry_time}`)
  const hour = time.getHours()
  console.log('Hour extracted:', hour)

  // 根據時間確定 intake_timing_id
  let intake_timing_id
  if (hour < 12) {
    intake_timing_id = 1 // 早餐
  } else if (hour >= 12 && hour < 15) {
    intake_timing_id = 2 // 午餐
  } else if (hour >= 15 && hour < 18) {
    intake_timing_id = 4 // 點心
  } else {
    intake_timing_id = 3 // 晚餐
  }
  console.log('intake_timing_id set to:', intake_timing_id)

  // 進行數據處理，保存到數據庫
  try {
    // 從資料庫中查找與用戶提交的食物名稱相對應的 food_id。根據用戶提交的食物名稱在資料庫中查找相應的 food_id，這個 food_id 接下來將被用來在食物日記的新增操作中引用特定的食物。
    // 建立 SQL 查詢語句：這行代碼建立了一個 SQL 查詢語句，目的是從 fytrack_food 表中查找 food_id。food_name = ? 表示一個佔位符，稍後會被實際的食物名稱所替換。
    const foodQuery = `SELECT food_id FROM fytrack_food WHERE food_name = ?`
    // 執行 SQL 查詢：這行代碼執行 SQL 查詢。這是一個異步操作，使用 await 等待查詢完成。db.query 是執行 SQL 查詢的函數，foodQuery 是 SQL 語句，[food_name] 是一個數組，包含了將替換 SQL 查詢中的佔位符 ? 的實際參數。
    const [foodData] = await db.query(foodQuery, [food_name])

    // 驗證是否找到了對應的食物
    if (foodData.length === 0) {
      return res.status(400).json({ message: '食物名稱不存在' })
    }

    // 提取查詢結果中的 food_id：這行代碼從查詢結果中提取 food_id。foodData[0] 取出查詢結果的第一條記錄（因為預期只會有一條記錄匹配特定的食物名稱），然後 .food_id 取出這條記錄的 food_id 屬性。
    const food_id = foodData[0].food_id

    // 插入食物日記數據到 fytrack_add 表
    const insertSql = `
            INSERT INTO fytrack_add (member_id, ntdentry_date, ntdentry_time, intake_timing_id, food_id, serving_size)
            VALUES (?, ?, ?, ?, ?, ?);`
    console.log(insertSql)
    await db.query(insertSql, [
      member_id,
      ntdentry_date,
      ntdentry_time,
      intake_timing_id,
      food_id,
      serving_size,
    ])

    res.json({ success: true, message: '食物日記新增成功' })
  } catch (error) {
    console.error('新增食物日記時發生錯誤:', error)
    res.status(500).json({ success: false, message: '食物日記新增失敗' })
  }
})

// GET 路由，用於讀取新增食物日記，定義獲取 fytrack_add 表數據的 GET 路由，用於獲取特定會員在特定日期添加的所有食物數據
/* 
使用 selected_date 而非 ntdentry_date 作為查詢參數的原因主要是為了清晰和一致性。在您的路由設計中，selected_date 是從前端傳遞過來的查詢參數，它指定了用戶希望檢索食物數據的特定日期。
以下是使用 selected_date 而非 ntdentry_date 的原因：

清晰性：在 API 設計中，查詢參數的名稱應清晰地反映其用途。在這種情況下，selected_date 直接告訴 API 的使用者這個參數代表了被選擇用於查詢的日期。

一致性：如果您的 API 在其他地方已經使用了 selected_date 作為查詢特定日期的標準參數名稱，那麼在這裡也使用相同的參數名稱可以保持一致性。這有助於使用者更容易理解和使用您的 API。

與數據庫字段區分：ntdentry_date 可能是數據庫表中的一個字段名稱。在 API 的查詢參數中使用不同的名稱（如 selected_date）可以幫助區分 API 層的參數和數據庫層的字段。
*/

router.get('/nutrition/add', async (req, res) => {
  // 從查詢參數中獲取會員 ID 和日期
  const member_id = req.query.member_id
  const selected_date = req.query.selected_date

  // 如果沒有提供 member_id 或 selected_date，則返回錯誤
  if (!member_id || !selected_date) {
    return res.status(400).json({ message: '缺少會員 ID 或日期' })
  }

  try {
    // 構建查詢指定日期和會員的所有紀錄的 SQL 語句
    const sql = `
    SELECT 
    fa.ntdentry_date, 
    fa.ntdentry_time, 
    fa.intake_timing_id,
    fa.serving_size,
    ff.food_name, 
    ff.food_calorie * fa.serving_size AS food_calorie, 
    ff.food_protein * fa.serving_size AS food_protein, 
    ff.food_carb * fa.serving_size AS food_carb, 
    ff.food_fat * fa.serving_size AS food_fat 
FROM 
    fytrack_add AS fa 
JOIN 
    fytrack_food AS ff ON fa.food_id = ff.food_id 
WHERE 
    fa.member_id = ? AND fa.ntdentry_date = ?
ORDER BY 
    fa.ntdentry_time ASC;
` // 根據時間升序排列

    // 執行 SQL 查詢
    const [rows] = await db.query(sql, [member_id, selected_date])

    // 返回查詢到的數據
    res.json(rows)
  } catch (error) {
    console.error('查詢食物數據時發生錯誤:', error)
    res.status(500).json({ success: false, message: '無法獲取數據' })
  }
})

/****** 以下是 Ted 負責的部分 ******/

// TED
// TITLE: FETCHING WORKOUT PLAN
router.get('/track-training/workout-plan/api', async (req, res) => {
  const sql = 'SELECT * FROM `workout_plan`'
  const [row] = await db.query(sql)
  const workoutPlans = row
  // console.log(workoutPlans)

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, workoutPlans })
})

// TED
// TITLE: FETCHING WORKOUT VARIATION
router.get('/track-training/workout-variation/api', async (req, res) => {
  const { plan_id } = req.query
  // console.log(plan_id)

  if (!plan_id) {
    return res.json({ success: false })
  }

  const sql = `SELECT wv.*,
    wp.plan_name,
    wp.plan_intro,
    wp.plan_difficulty,
    wp.plan_pros,
    wp.plan_cons
  FROM workout_variation wv
  JOIN workout_plan wp ON wv.plan_id = wp.plan_id
  WHERE wv.plan_id=?`
  const [row] = await db.query(sql, [plan_id])
  const workoutVariations = row
  // console.log(workoutVariations)

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, workoutVariations })
})

// TED
// TITLE: CREATING WORKOUT LOG
router.post('/track-training/log-workout/create-log/api', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
  }

  const { member_id, variation_id } = req.body

  const sql =
    'INSERT INTO `workout_log`(`member_id`, `variation_id`) VALUES (?, ?)'

  try {
    const [result] = await db.query(sql, [member_id, variation_id])
    output.result = result
    output.success = !!result.affectedRows
    // console.log(output)

    if (output.success) {
      output.logID = result.insertId
    }
  } catch (ex) {
    output.exception = ex
  }
  res.json(output)
})

// TED
// TITLE: FETCH PLAN NAME OF SELECTED VARIATION
router.get('/track-training/get-plan/api/', async (req, res) => {
  const { variation_id } = req.query

  if (!variation_id) {
    return res.json({ success: false })
  }

  const sql = `SELECT wv.variation_id,
  wv.variation_name,
  wv.plan_id,
  wp.plan_id,
  wp.plan_name
  FROM workout_variation wv
  JOIN workout_plan wp ON wv.plan_id = wp.plan_id
  WHERE wv.variation_id=?`
  const [row] = await db.query(sql, [variation_id])
  const selectedPlan = row
  // console.log(exercises)

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, selectedPlan })
  console.log(selectedPlan)
})

// TED
// TITLE: FETCH EXERCISES OF SELECTED VARIATION
router.get('/track-training/get-exercises/api/', async (req, res) => {
  const { variation_id } = req.query

  if (!variation_id) {
    return res.json({ success: false })
  }

  const sql = `SELECT wve.*,
    we.exercise_name_cn
  FROM workout_variation_exercise wve
  JOIN workout_exercise we ON wve.exercise_id = we.exercise_id
  WHERE wve.variation_id=?`
  const [row] = await db.query(sql, [variation_id])
  const exercises = row
  // console.log(exercises)

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, exercises })
})

// TED
// TITLE: FETCH BEST PERFORMANCE
router.get('/track-training/get-best/api/', async (req, res) => {
  const { member_id } = req.query
  // console.log('member_id', member_id)

  if (!member_id) {
    return res.json({ success: false })
  }

  // NOTE: ROW_NUMBER() assigns a row number to each entry within its group based on entry_id order
  const sql = `SELECT we.*, wl.log_id
  FROM (
    SELECT 
      entry_id, 
      log_id, 
      exercise_id, 
      entry_load, 
      entry_reps,
      ROW_NUMBER() OVER (PARTITION BY exercise_id ORDER BY entry_id DESC) AS row_num
    FROM workout_entry
  ) we
  JOIN workout_log wl ON we.log_id = wl.log_id
  WHERE wl.member_id = ?
  AND we.row_num = 1
  `
  const [row] = await db.query(sql, [member_id])
  const exercises = row
  // console.log(exercises)

  if (!row.length) {
    console.log('failed')
    return res.json({ success: false })
  }

  res.json({ success: true, exercises })
})

// TED
// TITLE: FETCH ALL PERFORMANCE
router.get('/track-training/get-all-performance/api/', async (req, res) => {
  const { member_id, log_id } = req.query
  console.log('member_id', member_id)
  console.log('log_id', log_id)

  if (!member_id) {
    return res.json({ success: false })
  }

  const sql = `
  SELECT 
    entry_id, 
    we.log_id, 
    we.exercise_id, 
    entry_load, 
    entry_reps,
    ex.exercise_name_cn
    FROM 
    workout_entry we
  JOIN 
    workout_log wl ON we.log_id = wl.log_id
  JOIN
    workout_exercise ex ON we.exercise_id = ex.exercise_id
  WHERE 
    wl.member_id = ? AND we.log_id = ?
  `
  const [row] = await db.query(sql, [member_id, log_id])
  const exerciseResults = row
  console.log(exerciseResults)

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, exerciseResults })
})

// TED
// TITLE: CREATING WORKOUT ENTRIES
router.post(
  '/track-training/log-workout/create-entries/api',

  async (req, res) => {
    const output = {
      success: false,
      postData: req.body,
    }

    const { entries, logID, date, memberID } = req.body
    console.log(logID, date)

    const sql =
      'INSERT INTO `workout_entry`(`log_id`, `exercise_id`, `entry_load`, `entry_reps`) VALUES (?, ?, ?, ?)'

    const dateSql = 'UPDATE `workout_log` SET `log_date`=? WHERE `log_id`=?'

    const recentSql = `
    SELECT COUNT(log_id) AS log_count FROM workout_log WHERE member_id = ? AND log_date >= DATE_SUB(?, INTERVAL 7 DAY)`

    const updateActiveSql =
      'UPDATE `workout_log` SET `active`=? WHERE `log_id`=?'

    try {
      // const [result] = await db.query(sql, [load, reps])
      // output.result = result

      // NOTE: Update date of workout log
      const dateResult = await db.query(dateSql, [date, logID])

      const recentResult = await db.query(recentSql, [memberID, date])
      console.log(recentResult, 'recentResult')
      const activeBoolean = recentResult[0][0].log_count >= 3 ? 1 : 0
      // NOTE: It counts the current log_id, so 1 + 2 = 3
      const updateActiveResult = await db.query(updateActiveSql, [
        activeBoolean,
        logID,
      ])
      console.log(updateActiveResult, 'updateResult')

      const results = await Promise.all(
        entries
          .filter((entry) => entry.load > 0 && entry.reps > 0)
          .map(async (entry) => {
            const [result] = await db.query(sql, [
              logID,
              entry.exercise_id,
              entry.load,
              entry.reps,
            ])
            return result
          })
      )

      output.results = results
      // output.success = !!result.affectedRows
      output.dateResult = dateResult
      output.success = results.every((result) => result.affectedRows > 0)
      // console.log(output)

      if (output.success) {
        // output.entryID = result.insertId
        output.entryIDs = results.map((result) => result.insertId)
        console.log('success')
      }
    } catch (ex) {
      output.exception = ex
    }
    res.json(output)
  }
)

// TED
// TITLE: FETCH COMBINED INFO
router.get('/track-training/get-workout-logs/api/', async (req, res) => {
  const { member_id } = req.query
  // console.log('member_id', member_id)

  if (!member_id) {
    return res.json({ success: false })
  }

  const sql = `SELECT 
      wl.log_id, 
      wl.log_date, 
      wl.variation_id, 
      wl.active,
      wv.variation_name, 
      wp.plan_name
    FROM 
      workout_log wl
    JOIN 
      workout_variation wv ON wl.variation_id = wv.variation_id
    JOIN 
      workout_plan wp ON wv.plan_id = wp.plan_id
    WHERE 
      wl.member_id=?
    ORDER BY 
      wl.log_date DESC`

  const purchaseSql = `SELECT
      po.sid,
      po.member_id,
      po.created_at,
      od.purchase_order_sid,
      od.product_id,
      p.product_id,
      p.name,
      p.product_price
    FROM
      purchase_order po
    JOIN
      order_detail od ON po.sid = od.purchase_order_sid
    JOIN
      product p ON od.product_id = p.product_id
    WHERE
      po.member_id=?
    ORDER BY 
      po.created_at DESC`

  const blogSql = `SELECT
      bl.member_id,
      bl.blogarticle_id,
      bl.blogarticle_create,
      bl.blogarticle_title,
      bl.blogarticle_content,
      bl.blogclass_id,
      bc.blogclass_content
    FROM
      bloglist bl
    JOIN
      blogclass bc ON bl.blogclass_id = bc.blogclass_id
    WHERE
      bl.member_id=?
    ORDER BY 
      blogarticle_create DESC`

  const courseSql = `SELECT
      cp.course_id,
      cp.member_id,
      cp.course_datetime,
      cp.status,
      c.course_id,
      c.name,
      c.coach_id,
      ca.coach_id,
      ca.member_id,
      m.member_id,
      m.member_nickname,
      m.member_name
    FROM
      course_purchase cp
    JOIN
      course c ON cp.course_id = c.course_id
    JOIN
      coach ca ON c.coach_id = ca.coach_id
    JOIN
      member m ON ca.member_id = m.member_id
    WHERE
      cp.member_id=?
    ORDER BY 
      cp.course_datetime DESC`

  try {
    const [workoutRows, purchaseRows, blogRows, courseRows] = await Promise.all(
      [
        db.query(sql, [member_id]),
        db.query(purchaseSql, [member_id]),
        db.query(blogSql, [member_id]),
        db.query(courseSql, [member_id]),
      ]
    )

    const workoutData = workoutRows[0]
    const purchaseData = purchaseRows[0]
    const blogData = blogRows[0]
    const courseData = courseRows[0]

    const combinedData = [
      ...workoutData,
      ...purchaseData,
      ...blogData,
      ...courseData,
    ].sort((a, b) => {
      const dateA =
        a.log_date || a.created_at || a.blogarticle_create || a.course_datetime
      const dateB =
        b.log_date || b.created_at || b.blogarticle_create || b.course_datetime
      return new Date(dateB) - new Date(dateA)
    })

    const workoutCount = workoutData.length
    const purchaseCount = purchaseData.length
    const blogCount = blogData.length
    const courseCount = courseData.length

    const pageSize = 5
    const { page } = req.query

    const limit = pageSize
    const offset = (page - 1) * pageSize

    const pageData = combinedData.slice(offset, offset + limit)
    console.log(pageData, 'just 5')

    res.json({
      success: true,
      pageData,
      combinedData,
      workoutCount,
      purchaseCount,
      blogCount,
      courseCount,
    })
  } catch (error) {
    console.error(error)
    res.json({
      success: false,
      error: 'An error occurred while fetching data',
    })
  }

  // if (!row.length) {
  //   return res.json({ success: false })
  // }
})

// TED
// TITLE: FETCH WORKOUT DETAILS BELONGING TO CERTAIN MEMBER
router.get('/track-training/get-workout-detail/api/', async (req, res) => {
  const { member_id } = req.query
  console.log('member_id', member_id)

  if (!member_id) {
    return res.json({ success: false })
  }

  const sql = `SELECT 
      wl.log_id, 
      wl.log_date, 
      wl.variation_id, 
      wl.active,
      wv.variation_name, 
      wp.plan_name,
      we.entry_id,
      we.exercise_id,
      we.entry_load,
      we.entry_reps,
      wex.exercise_name_cn
    FROM 
      workout_log wl
    JOIN 
      workout_variation wv ON wl.variation_id = wv.variation_id
    JOIN 
      workout_plan wp ON wv.plan_id = wp.plan_id
    LEFT JOIN
      workout_entry we ON wl.log_id = we.log_id
    LEFT JOIN
      workout_exercise wex ON we.exercise_id = wex.exercise_id
    WHERE 
      wl.member_id=?
    ORDER BY 
      wl.log_date DESC, we.entry_id ASC`

  try {
    const workoutDetailRows = await db.query(sql, [member_id])

    const workoutDetailData = workoutDetailRows[0].reduce((acc, row) => {
      const logId = row.log_id

      if (!acc[logId]) {
        acc[logId] = {
          log_id: row.log_id,
          log_date: row.log_date,
          variation_id: row.variation_id,
          active: row.active,
          variation_name: row.variation_name,
          plan_name: row.plan_name,
          set_data: [],
        }
      }

      // NOTE: Add entry data to set_data array
      if (row.exercise_id) {
        const exerciseKey = `${row.exercise_id}_${row.exercise_name_cn}`
        const existingExercise = acc[logId].set_data.find(
          (exercise) => exercise.exercise_key === exerciseKey
        )

        if (!existingExercise) {
          // If exercise doesn't exist in set_data, add it with entry_count 1
          acc[logId].set_data.push({
            exercise_id: row.exercise_id,
            exercise_name_cn: row.exercise_name_cn,
            exercise_key: exerciseKey,
            entry_count: 1,
          })
        } else {
          // If exercise exists, increment the entry_count
          existingExercise.entry_count += 1
        }
      }

      return acc
    }, {})

    res.json({
      success: true,
      workoutDetailData: Object.values(workoutDetailData),
    })
  } catch (error) {
    console.error(error)
    res.json({
      success: false,
      error: 'An error occurred while fetching data',
    })
  }
})

// TITLE: FETCH WORKOUT FREQUENCY
router.get('/track-training/get-workout-frequency/api/', async (req, res) => {
  const { member_id } = req.query
  console.log('member_id', member_id)

  if (!member_id) {
    return res.json({ success: false })
  }

  const sql = `SELECT 
      log_id, 
      log_date
    FROM 
      workout_log
    WHERE 
      member_id=?
    ORDER BY 
      log_date ASC`

  try {
    const workoutRows = await db.query(sql, [member_id])
    const workoutFrequencyData = workoutRows[0]
    console.log('succeed', workoutRows)

    res.json({ success: true, workoutFrequencyData })
  } catch (error) {
    console.error(error)
    res.json({
      success: false,
      error: 'An error occurred while fetching data',
    })
  }
})

export default router
