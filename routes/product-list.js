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

// 商品總表
const getListData = async (req) => {
  const perPage = 12 // 每頁幾筆
  let page = +req.query.page || 1 //用戶決定要看第幾頁

  // 關鍵字搜尋
  let keyword =
    req.query.keyword && typeof req.query.keyword === 'string'
      ? req.query.keyword.trim()
      : '' //處理送進來的資料
  let keyword_ = db.escape(`%${keyword}%`) // 跳脫，避免SQL injection

  let qs = {} // 先宣告一個物件: 用來把 qs 的設定傳給 template

  // 主分類篩選
  let main_category =
    req.query.main_category && typeof req.query.main_category === 'string'
      ? req.query.main_category
      : ''

  // 分類篩選
  let category =
    req.query.category && typeof req.query.category === 'string'
      ? req.query.category
      : ''
  let category_ = db.escape(`${category}`)

  // 食物品牌篩選
  let foodBrand =
    req.query.foodBrand && typeof req.query.foodBrand === 'string'
      ? req.query.foodBrand
      : ''
  let foodBrand_ = db.escape(`${foodBrand}`)

  // 價格由高到低、低到高、最新上架
  let sortBy =
    req.query.sortBy && typeof req.query.sortBy === 'string'
      ? req.query.sortBy.trim()
      : ''

  let where = ` WHERE 1 ` // 代表true，加這個是因為後面不確定會有多少個搜尋條件
  if (keyword) {
    qs.keyword = keyword // 如果有qs 就給keyword屬性，設定到keyword
    where += ` AND ( \`name\` LIKE ${keyword_})`
  }
  if (main_category) {
    qs.main_category = main_category
    where += ` AND (main_category = ${main_category})`
  }

  // 次類別及食物品牌
  if (category) {
    qs.category = category
    where = `AS p JOIN \`product_category\` AS A ON p.sub_category = A.category_sid JOIN \`product_category\` AS B ON A.parent_sid = B.category_sid WHERE 1 AND sub_category = ${category_}`

    if (foodBrand) {
      qs.foodbrand = foodBrand
      where += ` AND brand_id = ${foodBrand_}`
    }
  }

  // 純點選食物品牌
  if (foodBrand && !category) {
    qs.foodbrand = foodBrand
    where = `AS p JOIN \`product_category\` AS A ON p.sub_category = A.category_sid JOIN \`product_category\` AS B ON A.parent_sid = B.category_sid WHERE 1 AND brand_id = ${foodBrand_}`
  }

  if (sortBy) {
    qs.sortBy = sortBy
    if (sortBy === 'priceFromHighToLow') {
      where += ` ORDER BY \`product_price\` DESC`
    } else if (sortBy === 'priceFromLowToHigh') {
      where += ` ORDER BY \`product_price\` ASC `
    } else if (sortBy === 'latest') {
      where += ` ORDER BY \`create_at\` ASC `
    }
  }

  let totalRows = 0
  let totalPages = 0
  let rows = [] //取當前頁面的資料

  let output = {
    success: false,
    page,
    perPage,
    rows,
    totalRows,
    totalPages,

    qs,
    redirect: '',
    info: '',
  }

  if (page < 1) {
    output.redirect = `?page=1`
    output.info = `頁碼值小於 1`
    return output
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM product ${where}`
  ;[[{ totalRows }]] = await db.query(t_sql)
  totalPages = Math.ceil(totalRows / perPage)
  if (totalRows > 0) {
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`
      output.info = `頁碼值大於總頁數`
      // 先把原本的值展開再把新拿到的資料放進來，否則會拿到原本的 0
      return { ...output, totalRows, totalPages }
    }

    const sql = `SELECT * FROM product ${where}
    LIMIT ${(page - 1) * perPage}, ${perPage}`
    ;[rows] = await db.query(sql)
    output = { ...output, success: true, rows, totalRows, totalPages }
  }

  return output
}

// 會員收藏紀錄(含分頁、主分類篩選、排序)
const getCollectionData = async (req) => {
  const mid = req.params.mid
  const perPage = 10
  let page = +req.query.page || 1

  let qs = {}

  // 主分類篩選
  let main_category =
    req.query.main_category && typeof req.query.main_category === 'string'
      ? req.query.main_category
      : ''

  // 價格由高到低、低到高、最新上架
  let sortBy =
    req.query.sortBy && typeof req.query.sortBy === 'string'
      ? req.query.sortBy.trim()
      : ''

  let where = ` WHERE pc.member_id = ? `

  if (main_category) {
    qs.main_category = main_category
    where += ` AND (main_category = ${main_category})`
  }

  if (sortBy) {
    qs.sortBy = sortBy
    if (sortBy === 'priceFromHighToLow') {
      where += ` ORDER BY \`product_price\` DESC`
    } else if (sortBy === 'priceFromLowToHigh') {
      where += ` ORDER BY \`product_price\` ASC `
    } else if (sortBy === 'latest') {
      where += ` ORDER BY \`create_at\` DESC `
    }
  }

  let totalRows = 0
  let totalPages = 0
  let rows = [] //取當前頁面的資料

  let output = {
    success: false,
    page,
    perPage,
    rows,
    totalRows,
    totalPages,

    qs,
    redirect: '',
    info: '',
  }

  if (page < 1) {
    output.redirect = `?page=1`
    output.info = `頁碼值小於 1`
    return output
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM product_collection pc JOIN product p ON pc.product_sid = p.sid ${where}`
  ;[[{ totalRows }]] = await db.query(t_sql, [mid])
  totalPages = Math.ceil(totalRows / perPage)
  if (totalRows > 0) {
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`
      output.info = `頁碼值大於總頁數`

      return { ...output, totalRows, totalPages }
    }

    const sql = `SELECT * FROM product_collection pc JOIN product p ON pc.product_sid = p.sid ${where}
    LIMIT ${(page - 1) * perPage}, ${perPage}`
    ;[rows] = await db.query(sql, [mid])
    output = { ...output, success: true, rows, totalRows, totalPages }
  }

  return output
}

// 單一商品的所有評論
const getCommentData = async (req) => {
  let sid = +req.params.sid
  let qs = {}
  let where = ` WHERE 1 AND sid = ?`
  let totalRows = 0
  let rows = []

  let output = {
    success: false,
    rows,
    totalRows,
    qs,
    redirect: '',
    info: '',
  }

  const t_sql = `SELECT COUNT(1) totalRows FROM product_comment pc JOIN product p ON pc.product_id = p.product_id JOIN member m ON m.member_id = pc.member_id ${where} ORDER BY pc.create_at DESC`

  ;[[{ totalRows }]] = await db.query(t_sql, [sid])

  if (totalRows > 0) {
    const sql = `SELECT p.sid, pc.product_id, pc.score, pc.comment, pc.member_id, pc.create_at, m.member_username, m.member_pic FROM product_comment pc JOIN product p ON pc.product_id = p.product_id JOIN member m ON m.member_id = pc.member_id ${where} ORDER BY pc.create_at DESC`
    ;[rows] = await db.query(sql, [sid])
    output = { ...output, success: true, rows, totalRows }
  }

  return output
}

// 取得商品所有資料
router.get('/api', async (req, res) => {
  res.json(await getListData(req))
})

// 取得單筆商品資料
router.get('/api/getProduct/:sid', async (req, res) => {
  const sid = +req.params.sid

  const sql = `SELECT * FROM product WHERE sid=?`
  const [rows] = await db.query(sql, [sid])
  if (!rows.length) {
    return res.json({ success: false })
  }
  const row = rows[0]

  res.json({ success: true, row })
})

// 取得單筆商品所有評論
router.get('/api/getProductComment/:sid', async (req, res) => {
  // 寫法一：無法做排序、頁碼等篩選
  // const sid = +req.params.sid
  // // console.log(sid)

  // const sql = `SELECT pc.score, pc.comment, pc.member_id, pc.create_at, m.member_username, m.member_pic FROM product_comment pc
  // JOIN product p ON pc.product_id = p.product_id
  // JOIN member m ON m.member_id = pc.member_id WHERE p.sid = ?
  // `
  // const [rows] = await db.query(sql, [sid])
  // if (!rows.length) {
  //   return res.json({ success: false })
  // }

  // res.json({ success: true, totalRows: rows.length, rows })

  // 寫法二
  res.json(await getCommentData(req))
})

// 取得會員圖片
router.get('/api/getMemberImage/:filename', (req, res) => {
  const { filename } = req.params

  const imagePath = path.resolve(
    __dirname,
    '..',
    'public',
    'member',
    'profile-img',
    filename
  )

  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error(`Error sending file ${filename}: ${err.message}`)
      res.status(404).send('File not found')
    }
  })
})

// 取得圖片 api: 用到 npm i path
router.get('/api/getImage/:filename', (req, res) => {
  const { filename } = req.params

  // mac windows 通用
  const imagePath = path.resolve(
    __dirname,
    '..',
    'public',
    'store',
    'img',
    filename
  )

  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error(`Error sending file ${filename}: ${err.message}`)
      res.status(404).send('File not found')
    }
  })
})

// 取得 10 筆熱門商品
router.get('/api/popularProducts', async (req, res) => {
  const sql = 'SELECT * FROM `product` ORDER BY `purchase_qty` DESC LIMIT 10'

  const [rows] = await db.query(sql)
  if (!rows.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, rows })
})

// 相關商品區：取得 10 筆同類別商品 row.sub_category
router.get('/api/relatedProducts', async (req, res) => {
  const sub_category = +req.query.sub_category || 1
  const sid = +req.query.pid || 1
  const sql =
    'SELECT * FROM `product` WHERE `sub_category` = ? AND `sid` != ? LIMIT 10 '

  const [rows] = await db.query(sql, [sub_category, sid])
  if (!rows.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, rows })
})

// 新增
router.post('/add', upload.array('imgs'), async (req, res) => {
  const output = {
    success: false,
    postData: req.body, //除錯用
  }

  // 檢查文件是否成功上傳
  if (!req.files || req.files.length === 0) {
    output.error = '未上傳文件'
    return res.json(output)
  }

  // 取第一個文件的文件名
  // const filename = req.files[0].filename;

  // 取得所有上傳文件的檔案名稱
  const filenames = req.files.map((file) => file.filename)

  // 將檔案名稱用逗號連接成字串
  const imgsString = filenames.join(',')

  // 定義檔案類型 同PHP
  const extMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
  }

  // 檢查副檔名
  const fileFilter = (req, file, cb) => {
    cb(null, !!extMap[file.mimetype])
  }

  // 存放位置及設定檔名
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'public/img')
    },
    filename: (req, file, cb) => {
      const main = uuidv4()
      const ext = extMap[file.mimetype]
      cb(null, main + ext)
    },
  })

  // 使用 multer 進行上傳檔案的設定
  const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
  })

  // 自動給商品編號: 日期＋有序編號 FYT-20231018-00001
  const generateProductId = async () => {
    const date = dayjs().format('YYYYMMDD')

    // 查詢資料庫目前最大的編號避免重複
    const productCount =
      'SELECT COUNT(*) as count FROM product WHERE DATE(create_at) = ?'
    const [countResult] = await db.query(productCount, [date])
    const orderedNumber = countResult[0].count + 1

    return `FYT-${date}-${padNumber(orderedNumber, 3)}`
  }

  // 補零函數，確保有序編號為三位數
  const padNumber = (number, length) => {
    return (Array(length).join('0') + number).slice(-length)
  }

  const productId = await generateProductId()

  // sql
  const {
    name,
    main_category,
    sub_category,
    product_price,
    stock,
    descriptions,
    purchase_qty,
    create_at,
    size,
    brand_id,
  } = req.body

  const sql =
    'INSERT INTO `product`(`product_id`, `name`, `main_category`, `sub_category`, `product_price`, `stock`, `descriptions`, `imgs`, `purchase_qty`, `create_at`, `size`, `brand_id`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?)'

  try {
    // 會拿到 promise 所以要用await，加到資料庫會是陣列
    const [result] = await db.query(sql, [
      productId,
      name,
      main_category,
      sub_category,
      product_price,
      stock,
      descriptions,
      imgsString,
      purchase_qty,
      create_at,
      size,
      brand_id,
    ])
    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    output.exception = ex
  }

  res.json(output)
})

// 取得歷史訂單 - status:訂單處理中
router.get('/api/GetOngoingPo/:mid', async (req, res) => {
  let output = {
    success: false,
    rows: [],
  }
  // 取得 member_id 去搜尋
  const mid = req.params.mid

  const sql =
    "SELECT `sid`, `purchase_order_id`, `member_id`, `total_amount`, `payment_status`, `status`, `created_at` FROM `purchase_order` WHERE `member_id` = ? AND (`status` = '訂單處理中' OR `status` = '運送中' OR `status` = '待取貨') ORDER BY created_at DESC"

  const [rows] = await db.query(sql, [mid])
  if (!rows.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, rows })
})

// 取得歷史訂單 - status:已完成
router.get('/api/GetCompletedPo/:mid', async (req, res) => {
  let output = {
    success: false,
    rows: [],
  }
  // 取得 member_id 去搜尋
  const mid = req.params.mid

  const sql =
    "SELECT `sid`, `purchase_order_id`, `member_id`, `total_amount`, `payment_status`, `status`, `created_at` FROM `purchase_order` WHERE `member_id` = ? AND `status` = '已完成' ORDER BY created_at DESC"

  const [rows] = await db.query(sql, [mid])
  if (!rows.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, rows })
})

// 新增商品評論
router.post('/product-comment', upload.none(), async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
    add_comment: false,
    avg_update: false,
    update_comment_result: false,
    exception: '',
  }

  try {
    const { product_id, member_id, purchase_order_id, score, comment } =
      req.body

    // 1. 新增評論
    const addCommentSql =
      'INSERT INTO `product_comment`(`product_id`, `member_id`, `purchase_order_id`, `score`, `comment`, `create_at`) VALUES (?, ?, ?, ?, ?, NOW())'

    const [addCommentResult] = await db.query(addCommentSql, [
      product_id,
      member_id,
      purchase_order_id,
      score,
      comment,
    ])

    output.add_comment = !!addCommentResult.affectedRows

    if (addCommentResult.affectedRows) {
      try {
        // 2. 更新商品分數
        const updateProductScoreSql =
          'UPDATE `product` SET `score` = (SELECT AVG(`score`) FROM `product_comment` WHERE `product_id` = ?) WHERE `product_id` = ?'

        const [avg_update] = await db.query(updateProductScoreSql, [
          product_id,
          product_id,
        ])

        output.avg_update = !!avg_update.affectedRows

        if (avg_update.affectedRows) {
          try {
            // 3. 更新 order_detail 的評論紀錄
            const updateCommentRecordSql = `UPDATE order_detail od
              JOIN purchase_order po ON od.purchase_order_sid = po.sid
              SET od.is_comment = 1
              WHERE od.product_id = ? AND po.purchase_order_id = ?`

            const [updateCommentResult] = await db.query(
              updateCommentRecordSql,
              [product_id, purchase_order_id]
            )

            output.update_comment_result = !!updateCommentResult.affectedRows
            output.success = !!addCommentResult.affectedRows
          } catch (ex) {
            output.exception = ex
          }
        }
      } catch (ex) {
        output.exception = ex
      }
    }
  } catch (ex) {
    output.exception = ex
  }

  res.json(output)
})

// 顯示會員收藏紀錄(含頁碼、篩選、排序功能)
router.get('/my-product-collection/:mid', async (req, res) => {
  res.json(await getCollectionData(req))
})

// 商品加入收藏
router.post('/add-product-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
  }
  const { member_id, product_sid } = req.body

  try {
    const sql = `
    INSERT INTO product_collection(member_id, product_sid) VALUES (?, ?)
    `
    const [result] = await db.query(sql, [member_id, product_sid])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

// 商品移除收藏
router.post('/remove-product-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
  }
  const { member_id, product_sid } = req.body

  try {
    const sql = `
    DELETE FROM product_collection WHERE member_id = ? AND product_sid = ?
    `
    const [result] = await db.query(sql, [member_id, product_sid])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

export default router
