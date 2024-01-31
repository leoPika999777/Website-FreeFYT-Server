import express from 'express'
import db from './../utils/connect-mysql.js'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'
import nodemailer from 'nodemailer'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

// 獲得資料列表的函式
const getCourseData = async (req) => {
  const perPage = 9 // 每頁幾筆
  let page = +req.query.page || 1 // 用戶決定要看第幾頁
  let keyword =
    req.query.name_like && typeof req.query.name_like === 'string'
      ? req.query.name_like.trim()
      : ''
  let tagIds = req.query.tag_ids
    ? req.query.tag_ids.split(',').map((tagId) => parseInt(tagId, 10))
    : []
  // 將 tag_ids 字串解碼並分割成字串陣列

  let sort = req.query.sort || 'newest'

  let qs = {} // 用來把 query string 的設定傳給 template

  let where = `WHERE 1 ` // 1後面要有空白 // 開頭

  // 整合所有搜尋條件到 where 變數中
  if (keyword) {
    where += `AND (c.name LIKE '%${keyword}%' OR m.member_name LIKE '%${keyword}%') `
  }

  // 如果 tagIds 不是數字陣列，你可能想要進行額外的驗證
  if (!Array.isArray(tagIds)) {
    tagIds = []
  }

  if (tagIds.length > 0) {
    where += `AND ft.fitness_id IN (${tagIds.join(',')}) `
  }

  // 選擇排序方式
  let orderBy = ''
  switch (sort) {
    case 'newest':
      orderBy = 'ORDER BY c.course_id DESC'
      break
    case 'price_high':
      orderBy = 'ORDER BY c.price DESC'
      break
    case 'price_low':
      orderBy = 'ORDER BY c.price ASC'
      break
    default:
      orderBy = 'ORDER BY c.course_id DESC'
      break
  }

  let totalRows = 0
  let totalPages = 0
  let rows = []

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
    tagIds,
  }

  // 如果頁碼小於1,導向第一頁
  if (page < 1) {
    output.redirect = `?page=1`
    output.info = `頁碼值小於1`
    return output
  }

  const t_sql = `SELECT COUNT(DISTINCT c.course_id) totalRows FROM course c
                 JOIN coach co ON c.coach_id = co.coach_id
                 JOIN member m ON co.member_id = m.member_id
                 LEFT JOIN course_tag ctg ON c.course_id = ctg.course_id
                 LEFT JOIN fitness_tag ft ON ctg.fitness_id = ft.fitness_id
                 ${where}`
  ;[[{ totalRows }]] = await db.query(t_sql)
  totalPages = Math.ceil(totalRows / perPage)

  if (totalRows > 0) {
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`
      output.info = `頁碼值大於總頁數`
      return { ...output, totalRows, totalPages }
    }

    const sql = `SELECT
      c.*,
      m.member_pic AS coach_img,
      m.member_name AS coach_name,
      GROUP_CONCAT( ft.tag_name) AS fitness_tags
    FROM course c
    JOIN coach co ON c.coach_id = co.coach_id
    JOIN member m ON co.member_id = m.member_id
    LEFT JOIN course_tag ctg ON c.course_id = ctg.course_id
    LEFT JOIN fitness_tag ft ON ctg.fitness_id = ft.fitness_id
    ${where}
    GROUP BY c.course_id
    ${orderBy}
    LIMIT ${(page - 1) * perPage},${perPage}`

    ;[rows] = await db.query(sql)

    const course_ids = rows.map((r) => r.course_id)
    const sql2 = `SELECT course_id, tag_name FROM course_tag ct JOIN fitness_tag ft ON ct.fitness_id=ft.fitness_id WHERE course_id IN (${course_ids.join()})`
    const [rows2] = await db.query(sql2)

    output = { ...output, success: true, rows, totalRows, totalPages, rows2 }
  }

  return output
}

// 課程首頁
router.get('/', async (req, res) => {
  const output = await getCourseData(req)
  // if (output.redirect) {
  //   // 如果有redirect屬性，執行轉向 // 加return結束，不用再執行下面的render
  //   return res.redirect(output.redirect)
  // }
  // res.render('course', output)
  res.json(output)
})

// 課程標籤
router.get('/course-tags', async (req, res) => {
  const sql = `SELECT * FROM fitness_tag`
  const [rows] = await db.query(sql)
  res.json(rows)
})

//取得課程圖片的 api(WINDOWS)
router.get('/get-course-img/:filename', (req, res) => {
  const { filename } = req.params

  const imagePath = path.join(
    __dirname.replace(/\\/g, '/').replace(/\/routes/, '/public'),
    'course',
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

//取得會員圖片的 api(WINDOWS)
router.get('/get-coach-img/:filenameMember', (req, res) => {
  const { filenameMember } = req.params
  const imagePath = path.join(
    __dirname.replace(/\\/g, '/').replace(/\/routes/, '/public'),
    'member',
    'profile-img',
    filenameMember
  )
  res.sendFile(imagePath, (err) => {
    if (err) {
      console.error(`Error sending file ${filenameMember}: ${err.message}`)
      res.status(404).send('File not found')
    }
  })
})

// // 取得課程圖片的 api
// router.get('/get-course-img/:filename', (req, res) => {
//   const { filename } = req.params

//   const imagePath = path.join(
//     __dirname.replace('/routes', '/public'),
//     'course',
//     'img',
//     filename
//   )

//   res.sendFile(imagePath, (err) => {
//     if (err) {
//       console.error(`Error sending file ${filename}: ${err.message}`)
//       res.status(404).send('File not found')
//     }
//   })
// })

// // 取得會員圖片的 api
// router.get('/get-coach-img/:filenameMember', (req, res) => {
//   const { filenameMember } = req.params
//   const imagePath = path.join(
//     __dirname.replace('/routes', '/public'),
//     'member',
//     'profile-img',
//     filenameMember
//   )
//   res.sendFile(imagePath, (err) => {
//     if (err) {
//       console.error(`Error sending file ${filenameMember}: ${err.message}`)
//       res.status(404).send('File not found')
//     }
//   })
// })

// 課程詳細頁(取得單一課程資料)
router.get('/detail/:course_id', async (req, res) => {
  const course_id = +req.params.course_id
  const sql = `SELECT
  c.*,
  co.intro AS coach_intro,
  co.experience AS coach_experience,
  m.member_name AS coach_name,
  m.member_pic AS coach_img,
  m.member_email AS coach_email,
  GROUP_CONCAT(DISTINCT CONCAT(w.week, ' ', tp.period) ORDER BY ct.time_id) AS schedule,
  GROUP_CONCAT(DISTINCT cer.cert_name) AS coach_certs
FROM course c
JOIN coach co ON c.coach_id = co.coach_id
JOIN member m ON co.member_id = m.member_id
LEFT JOIN course_time ct ON c.course_id = ct.course_id
LEFT JOIN week w ON ct.week_id = w.week_id
LEFT JOIN time_period tp ON ct.period_id = tp.period_id
LEFT JOIN coach_cert_relation ccr ON co.coach_id = ccr.coach_id
LEFT JOIN cert cer ON ccr.cert_id = cer.cert_id
WHERE c.course_id = ?
GROUP BY c.course_id;`
  const [rows] = await db.query(sql, [course_id])

  if (!rows.length) {
    return res.json({ success: false })
  }
  const row = rows[0]
  res.json({ success: true, row })
})

// 課程評論總表
router.get('/comment-list/:course_id', async (req, res) => {
  const course_id = +req.params.course_id
  const sql = `
  SELECT cp.*, m.member_name, m.member_nickname,m.member_pic
  FROM course_purchase cp
  JOIN member m ON cp.member_id = m.member_id
  WHERE cp.course_id = ?
  ORDER BY cp.comment_time desc;`

  const [rows] = await db.query(sql, [course_id])
  res.json(rows)
})

// 課程訂單資料(購買後)
router.get('/course-purchase-order/:pid', async (req, res) => {
  // 解密
  const decrypt = (encodedData) => {
    const buffer = Buffer.from(encodedData, 'base64')
    const decoded = buffer.toString('utf-8')
    return decoded
  }

  const purchase_id = decrypt(req.params.pid)
  console.log(purchase_id)
  const sql = `SELECT c.*,cp.* FROM course_purchase cp
  JOIN course c ON cp.course_id = c.course_id
  WHERE purchase_id =?`
  const [rows] = await db.query(sql, [purchase_id])
  res.json(rows)
})

// 課程訂單資料
router.get('/course-order/:course_id', async (req, res) => {
  const course_id = +req.params.course_id
  const sql = `SELECT * FROM course_purchase
  WHERE course_id =?`
  const [rows] = await db.query(sql, [course_id])
  res.json(rows)
})



// 新增課程訂單
router.post('/add-purchase', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  try {
    const { course_datetime, course_id, member_id, status } = req.body

    // 生成 UUID 作為訂單編號
    const order_id = uuidv4().slice(0, 8)

    // 生成 TradeNo
    const tradeNo = 'FYT' + new Date().getTime()

    // 在這裡進行一些輸入驗證，確保必要的資料已經提供

    const sql = `
      INSERT INTO course_purchase (course_datetime, course_id,member_id, order_id, status, purchase_time)
      VALUES (?, ?, ?, ?,?,NOW())
    `

    const [result] = await db.query(sql, [
      course_datetime,
      course_id,
      member_id,
      tradeNo,
      status,
    ])

    // 取得剛插入的 purchase_id
    const purchaseId = result.insertId
    // 定義一個 output 的屬性 result 把 SQL查詢的值給他
    output.result = result
    // 如果 affectedRows 是1就是true,0就是false
    output.success = !!result.affectedRows
    output.tradeNo = tradeNo
    output.purchase_id = purchaseId // 將 purchase_id 加入回應中
  } catch (ex) {
    output.exception = ex
  }
  res.json(output)
})

// 寄信給教練(新增訂單)
router.post('/send-course-mail', async (req, res, next) => {
  const {
    tradeNo,
    coachEmail,
    coachName,
    memberId,
    courseName,
    course_datetime,
    memberName,
  } = req.body
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })

  await transporter.verify()

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: coachEmail,
    subject: '[Freefyt] 新訂單確認通知',
    html: `
    <p>親愛的 [${coachName}],</p>
    <p>我們有一位會員剛剛在 Freefyt 上訂購了您的課程，以下是詳細資訊：</p>
    <ul>
      <li>訂單編號：[${tradeNo}]</li>
      <li>會員姓名：[${memberName}]</li>
      <li>課程名稱：[${courseName}]</li>
      <li>課程時間：[${course_datetime}]</li>
    </ul>
    <p>請盡快回覆這封郵件，以確保會員獲得預定的服務。</p>
    <p><a href='http://localhost:3000/course/coach/course-record'>前往Freefyt</a></p>

    <p>如果您有任何疑問或需要進一步的信息，請隨時與我們聯繫。</p>

    <p>謝謝您對 Freefyt 的支持！</p>

    <p>祝您有一個愉快的一天。</p>

    <p>敬上，Freefyt 健身平台</p>
  `,
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err)
      res.status(500).send('Error sending email')
    } else {
      console.log(info)
      res.send('Email sent')
    }
  })
})

// 寄信給教練(更改時間)
router.post('/change-time-mail', async (req, res, next) => {
  const {
    coachEmail,
    coachName,
    courseName,
    originalTime,
    newTime,
    memberName,
  } = req.body
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_PASS,
    },
  })

  await transporter.verify()

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: coachEmail,
    subject: '[Freefyt] 課程時間更改通知',
    html: `
    <p>親愛的 [${coachName}],</p>
    <p>會員 [${memberName}] 已經更改了課程時間，以下是詳細資訊：</p>
    <ul>
      <li>課程名稱：[${courseName}]</li>
      <li>原本時間：[${originalTime}]</li>
      <li>新的時間：[${newTime}]</li>
    </ul>
    <p>請確認並更新您的行事曆，以確保會員獲得正確的服務。</p>
    <p><a href='http://localhost:3000/course/coach/course-record'>前往Freefyt</a></p>

    <p>如果您有任何疑問或需要進一步的信息，請隨時與會員聯繫。</p>

    <p>謝謝您對 Freefyt 的支持！</p>

    <p>祝您有一個愉快的一天。</p>

    <p>敬上，Freefyt 健身平台</p>
  `,
  }

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error(err)
      res.status(500).send('Error sending email')
    } else {
      console.log(info)
      res.send('Email sent')
    }
  })
})

// 拿到會員姓名和教練身份
router.get('/get-course-member-data', async (req, res) => {
  const member_id = +req.query.member_id
  const sql = `
  SELECT member.member_id, member.member_name, coach.member_id AS iscoach 
  FROM member 
  LEFT JOIN coach ON member.member_id = coach.member_id
  WHERE member.member_id =?
  `
  const [rows] = await db.query(sql, [member_id])
  res.json(rows)
})

// 加入收藏
router.post('/add-course-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  const { member_id, course_id } = req.body
  try {
    const sql = `
    INSERT INTO course_favorite (member_id, course_id) VALUES (?,?)
    `
    const [result] = await db.query(sql, [member_id, course_id])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

// 取得課程收藏
router.get('/get-course-fav', async (req, res) => {
  const member_id = +req.query.member_id
  // const output = {
  //   success: false,
  //   courseFav: [],
  // }
  try {
    const sql = `
    SELECT
        c.*,
        m.member_pic AS coach_img,
        m.member_name AS coach_name,
        GROUP_CONCAT(ft.tag_name) AS fitness_tags
    FROM
        course c
        JOIN coach co ON c.coach_id = co.coach_id
        JOIN member m ON co.member_id = m.member_id
        LEFT JOIN course_tag ctg ON c.course_id = ctg.course_id
        LEFT JOIN fitness_tag ft ON ctg.fitness_id = ft.fitness_id
        LEFT JOIN course_favorite cf ON c.course_id = cf.course_id AND cf.member_id = ?
    WHERE
        cf.course_id IS NOT NULL
    GROUP BY
        c.course_id
    ORDER BY
        c.course_id; 
    `
    const [result] = await db.query(sql, [member_id])

    // output.courseFav = result
    // output.success = true
    return res.json(result)
  } catch (ex) {
    console.log(ex)
  }
})

// 刪除收藏
router.delete('/delete-course-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  const { member_id, course_id } = req.body
  try {
    const sql = `
      DELETE FROM course_favorite WHERE member_id = ? AND course_id = ?
    `
    const [result] = await db.query(sql, [member_id, course_id])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})
export default router
