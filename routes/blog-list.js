import express from 'express'
import db from './../utils/connect-mysql.js'
import upload from './../utils/upload-imgs.js'
import dayjs from 'dayjs'

//dayjs().format('YYYY-MM-DD HH:mm:ss')

const router = express.Router()

//forpage  完整資料
const getListData = async (req) => {
  const perPage = 9 // 每頁幾筆
  let page = +req.query.page || 1 // 用戶決定要看第幾頁

  //23-1 搜尋關鍵字
  // blog/api?keyword=冠宇&page=2
  // /address-book?page=2
  let keyword =
    req.query.keyword && typeof req.query.keyword === 'string'
      ? req.query.keyword.trim()
      : ''
  let keyword_ = db.escape(`%${keyword}%`)

  // 搜尋tag
  let tag =
    req.query.tag && typeof req.query.tag === 'string'
      ? req.query.tag.trim()
      : ''
  let tag_ = db.escape(`%${tag}%`)

  // sort由高到低、低到高、最新上架
  let sortBy =
    req.query.sortBy && typeof req.query.sortBy === 'string'
      ? req.query.sortBy.trim()
      : ''

  //23-4 如果搜尋欄已有keyword 跳頁要保留
  let qs = {} // 用來把 query string 的設定傳給 template

  //23-2 搜尋生日 處理的是起始的日期
  let startDate = req.query.startDate ? req.query.startDate.trim() : ''
  const startDateD = dayjs(startDate) //包成dayjs的物件 做解析
  //要去判斷 startDateD  用isValid
  if (startDateD.isValid()) {
    //如果是合法的 就轉換格式
    startDate = startDateD.format('YYYY-MM-DD')
  } //不是就轉為空字串
  else {
    startDate = ''
  }

  //23-3 搜尋生日 處理的是結束的日期
  let endDate = req.query.endDate ? req.query.endDate.trim() : ''
  const endDateD = dayjs(endDate) //包成dayjs的物件 做解析
  //要去判斷 endDateD  用isValid
  if (endDateD.isValid()) {
    //如果是合法的 就轉換格式
    endDate = endDateD.format('YYYY-MM-DD')
  } //不是就轉為空字串
  else {
    endDate = ''
  }

  //23-1 WHERE 1看作true
  let where = ` WHERE 1 `
  if (keyword) {
    //23-4 如果有keyword 就把keyword放進
    qs.keyword = keyword

    where += ` AND ( \`blogarticle_title\` LIKE ${keyword_} OR \`blogarticle_content\` LIKE ${keyword_} ) `
  }

  //標籤 tag
  if (tag) {
    //23-4 如果有keyword 就把keyword放進
    qs.tag = tag

    where += ` AND ( \`blogclass_content\` LIKE ${tag_} ) `
  }

  //
  if (sortBy) {
    qs.sortBy = sortBy

    if (sortBy === 'createFromHighToLow') {
      where += ` ORDER BY \`blogarticle_create\` DESC`
    } else if (sortBy === 'readFromHighToLow') {
      where += ` ORDER BY \`blogarticle_id\` DESC `
    }
  } else {
    where += ` ORDER BY \`blogarticle_id\` DESC `
  }
  //23-2 起始日
  if (startDate) {
    qs.startDate = startDate
    where += ` AND blogarticle_time >= '${startDate}' `
  }

  //sortBy功能
  // if (sortBy) {
  //   qs.sortBy = sortBy
  //   if (sortBy === 'CreateFromHighToLow') {
  //     where += ` ORDER BY \`blogarticle_create\` DESC`
  //   } else if (sortBy === 'ReadFromHighToLow') {
  //     where += ` ORDER BY \`blogread_sum\` DESC `
  //   }
  // }

  //23-3 結束日
  //http://localhost:3002/blog-list/api?startDate=1995-01&endDate=1995-12-31
  if (endDate) {
    qs.endDate = endDate
    where += ` AND blogarticle_time <= '${endDate}' `
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
  }

  if (page < 1) {
    output.redirect = `?page=1`
    output.info = `頁碼值小於 1`
    return output
  }

  // ${where}` 算筆數 拿資料 條件會一樣
  const t_sql = `SELECT COUNT(1) totalRows FROM bloglist b 
  LEFT JOIN member m ON m.member_id=b.member_id 
  JOIN blogclass c ON c.blogclass_id = b.blogclass_id
  ${where}`
  ;[[{ totalRows }]] = await db.query(t_sql)
  totalPages = Math.ceil(totalRows / perPage)
  if (totalRows > 0) {
    if (page > totalPages) {
      output.redirect = `?page=${totalPages}`
      output.info = `頁碼值大於總頁數`
      return { ...output, totalRows, totalPages }
    }

    const sql = `SELECT * FROM bloglist b 
    LEFT JOIN member m ON m.member_id=b.member_id 
    JOIN blogclass c ON c.blogclass_id = b.blogclass_id
    ${where}  
    LIMIT ${(page - 1) * perPage}, ${perPage}`
    ;[rows] = await db.query(sql)

    //console.log(sql)

    output = { ...output, success: true, rows, totalRows, totalPages, sql }
  }

  return output
}

// BLogList

// 取得所有資料
router.get('/api', async (req, res) => {
  res.json(await getListData(req))
})

// 取得單筆商品資料
// router.get('/api/getbloglist/:blogarticle_id', async (req, res) => {
//   const blogarticle_id = +req.params.blogarticle_id

//   const sql = `SELECT * FROM bloglist WHERE blogarticle_id=?`
//   const [rows] = await db.query(sql, [blogarticle_id])
//   if (!rows.length) {
//     return res.json({ success: false })
//   }
//   const row = rows[0]

//   res.json({ success: true, row })
// })
router.get('/', async (req, res) => {
  const sql = `SELECT * FROM  bloglist c
  JOIN blogclass co ON c.blogclass_id = co.blogclass_id`
  const [rows] = await db.query(sql)
  res.json(rows)
})

// 詳細頁
router.get('/api/detail/:blogarticle_id', async (req, res) => {
  const blogarticle_id = +req.params.blogarticle_id
  const sql = `SELECT * 
  FROM  bloglist b
  JOIN blogclass co ON b.blogclass_id = co.blogclass_id
  LEFT JOIN member m ON m.member_id=b.member_id
  WHERE blogarticle_id = ? `
  const [rows] = await db.query(sql, [blogarticle_id])
  if (rows.length) {
    res.json(rows[0])
  } else {
    res.json({})
  }
})

router.get('/', async (req, res) => {
  res.locals.pageName = 'ab-list'

  //呼叫前面的getListData
  const output = await getListData(req)
  if (output.redirect) {
    return res.redirect(output.redirect)
  }
})

// router.get('/add', async (req, res) => {
//   res.render('blog-list/add')
// })

//個人的文章頁  撈該作者所有文章
router.get('/mypage', async (req, res) => {
  const sql = `SELECT * FROM bloglist b LEFT JOIN member m on m.member_id=b.member_id `
  const [rows] = await db.query(sql)
  res.json(rows)
})

router.get('/mypage/:member_id', async (req, res) => {
  const member_id = +req.params.member_id
  const sql = `SELECT * FROM bloglist b LEFT JOIN member m on m.member_id=b.member_id WHERE b.member_id=? order by b.blogarticle_id desc `
  const [rows] = await db.query(sql, member_id)
  if (rows.length) {
    res.json(rows)
  } else {
    res.json({})
  }
})

//個人的文章頁  撈該作者收藏的所有文章

router.get('/mypagecollect/:member_id', async (req, res) => {
  const member_id = +req.params.member_id
  const sql = `SELECT bc.member_id, bc.blogarticle_id AS collected_blog_id, bl.*, bcl.blogclass_content, m.* FROM blogcollect bc JOIN bloglist bl ON bc.blogarticle_id = bl.blogarticle_id JOIN blogclass bcl ON bl.blogclass_id = bcl.blogclass_id JOIN member m ON bc.member_id = m.member_id WHERE bc.member_id = ? ORDER by bc.blogarticle_id DESC; `
  const [rows] = await db.query(sql, member_id)
  if (rows.length) {
    res.json(rows)
  } else {
    res.json({})
  }
})

//個人的文章頁  撈該文章作者資料
router.get('/myonepage/:member_id', async (req, res) => {
  const member_id = +req.params.member_id
  const sql = `SELECT 
  COUNT(DISTINCT bloglist.blogarticle_title) AS total_bloglist_members,
  COUNT(DISTINCT blogfollow.member_id) AS followers_count,
  member.*
FROM member
LEFT JOIN bloglist ON member.member_id = bloglist.member_id
LEFT JOIN blogfollow ON member.member_id = blogfollow.follow_member
WHERE member.member_id =?`
  const [rows] = await db.query(sql, [member_id, member_id])
  if (rows.length) {
    res.json(rows[0])
  } else {
    res.json({})
  }
})

//撈該會員有多少粉絲
router.get('/fans/:member_id', async (req, res) => {
  const member_id = +req.params.member_id
  const sql = `SELECT COUNT( follow_member) AS follow_count from blogfollow WHERE follow_member =?`
  const [rows] = await db.query(sql, [member_id])
  if (rows.length) {
    res.json(rows[0])
  } else {
    res.json({})
  }
})

//撈該會員的粉絲明細
router.get('/fanslist/:member_id', async (req, res) => {
  const member_id = +req.params.member_id
  const sql = `SELECT 
  m.member_id,
  m.member_username,
  m.member_name,
m.member_pic
FROM member m
JOIN blogfollow bf ON m.member_id = bf.member_id
WHERE bf.follow_member =?`
  const [rows] = await db.query(sql, [member_id])
  if (rows.length) {
    res.json(rows)
  } else {
    res.json({})
  }
})



//詳細頁的文章留言
router.get('/api/reply/:blogarticle_id', async (req, res) => {
  const blogarticle_id = +req.params.blogarticle_id
  const sql = `SELECT * FROM blogreply l
LEFT JOIN member m ON m.member_id=l.member_id
WHERE l.blogarticle_id=? order by l.blogcomment_time desc`

  // `SELECT *
  // FROM bloglist b JOIN blogclass co ON b.blogclass_id = co.blogclass_id
  // LEFT JOIN member m ON m.member_id=b.member_id
  // JOIN blogreply r ON b.blogarticle_id=r.blogarticle_id
  // WHERE b.blogarticle_id = ?
  // ORDER BY r.blogcomment_id`
  const [rows] = await db.query(sql, [blogarticle_id])
  if (rows.length) {
    res.json(rows)
  } else {
    res.json({})
  }
})

// collect 撈該作者收藏哪些blogarticle_id
router.post('/blog/collect', function (req, res) {
  if (!res.locals.jsonwebtoken?.id) {
    return res.json({ success: false, error: 'Unauthorized' })
  }
  const member_id = res.locals.jsonwebtoken?.id
  //console.log(`'/blog/collect member_id: '`, member_id)
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }

  const { blogarticle_id } = req.body

  const sql =
    'INSERT INTO `blogcollect`(`member_id`,`blogarticle_id`) VALUES (?,? )'

  //console.log(`'/blog/collect sql: '`, sql)
  try {
    const [result] = db.query(sql, [member_id, blogarticle_id])
    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    output.exception = ex
  }

  // 把資料加到 data 中
  // 傳響應告訴前端已新增成功
  res.send({ success: true, output }).end()
  // console.log 看一下 data, 確認是否新增成功
  console.log(output)
})

router.post('/add', upload.none(), async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }

  //21-1-1 新增sql

  const {
    blogarticle_title,

    blogarticle_time,
    blogarticle_content,
  } = req.body
  const sql =
    'INSERT INTO `bloglist`(`blogarticle_title`, `blogarticle_time`, `blogarticle_content`, `blogarticle_create`) VALUES (?, ?, ?, ?, ?, NOW() )'

  //21-3
  try {
    const [result] = await db.query(sql, [
      blogarticle_title,
      blogarticle_time,
      blogarticle_content,
    ])
    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    output.exception = ex
  }

  //21-2調整
  /*
  sql = "INSERT INTO `bloglist` SET ?"
  INSERT INTO `bloglist` SET `blogarticle_title`='abc',
  req.body.blogarticle_create = new Date()
  const [result] = await db.query(sql, [req.body])
  */

  //12-1-2 回的會是一個物件
  /*
  {
    "fieldCount": 0,
    "affectedRows": 1,  # 影響的列數
    "insertId": 1021,   # 取得的 PK 
    "info": "",
    "serverStatus": 2,
    "warningStatus": 0,
    "changedRows": 0    # 修改時真正有變動的資料筆數
  }
  */
  //router.post("/add",upload.none(), async (req, res) => {
  res.json(output)
})

//22-1 編輯
router.get('/edit/:blogarticle_id', async (req, res) => {
  //req.params 路徑變數
  //拿到blogarticle_id
  const blogarticle_id = +req.params.blogarticle_id

  //新增網頁名稱
  res.locals.title = '編輯 | ' + res.locals.title

  //進行搜尋
  const sql = `SELECT * FROM bloglist WHERE blogarticle_id=?`

  //拿到陣列
  const [rows] = await db.query(sql, [blogarticle_id])
  //如果有長度代表有資料
  //rows有可能拿到undefine 如果只寫rows.length 會出錯   所以建議寫成下列方式：rows && rows.length 或是! rows.length
  //rows?.length  ？代表有  .代表去取 ＝>  如果rows有值就去看length屬性
  if (!rows.length) {
    return res.redirect(req.baseUrl)
  }
  //res.json(rows[0]);

  //22-2 用後端的方式 把date改成字串
  //22-2 透過新增birthday2 不會改到原本的資料
  const row = rows[0]
  //row.birthday2 = dayjs(row.birthday).format("YYYY-MM-DD")
  //1220改成只有birthday 不用birthday2
  row.blogarticle_create = dayjs(row.blogarticle_create).format('YYYY-MM-DD')
  res.json(row)
})

//edit
router.put('/edit/:blogarticle_id', async (req, res) => {
  //TODO: 欄位資料檢查

  //同樣可以做輸出  輸出格式先給false
  const output = {
    success: false,
    postData: req.body,
    result: null,
  }

  //去掉資料字串的頭尾 => trim()去除頭尾空白
  //req.body.blogarticle_content = req.body.blogarticle_content.trim()

  let { blogarticle_content, blogarticle_title, blogarticle_id } = req.body
  blogarticle_content = blogarticle_content.trim()
  const updateData = {
    blogarticle_content,
    blogarticle_title,
    blogarticle_time: new Date(),
  }

  const sql = `update bloglist SET ? WHERE blogarticle_id=?`

  const [result] = await db.query(sql, [updateData, blogarticle_id])
  // return res.json(output)
  //看結果
  output.result = result
  output.success = !!result.changedRows

  //資料送做來 再丟回去
  res.json(output)
})

//1223新增
// 取得單筆的資料
//http://localhost:3002/address-book/api/edit/5
router.get('/api/edit/:blogarticle_id', async (req, res) => {
  const blogarticle_id = +req.params.blogarticle_id
  const sql = `SELECT * FROM bloglist WHERE blogarticle_id=?`
  const [rows] = await db.query(sql, [blogarticle_id])
  if (!rows.length) {
    return res.json({ success: false })
  }
  const row = rows[0]
  row.blogarticle_create = dayjs(row.blogarticle_create).format('YYYY-MM-DD')
  res.json({ success: true, row })
})

//22-3
router.put('/api/edit2/:blogarticle_id', async (req, res) => {
  res.json(req.params)
})

router.put('/edit/:blogarticle_id', async (req, res) => {
  //TODO: 欄位資料檢查

  //同樣可以做輸出  輸出格式先給false
  const output = {
    success: false,
    postData: req.body,
    result: null,
  }

  //去掉資料字串的頭尾 => trim()去除頭尾空白
  //req.body.blogarticle_content = req.body.blogarticle_content.trim()

  let { blogarticle_content, blogarticle_title, blogarticle_id } = req.body
  blogarticle_content = blogarticle_content.trim()
  const updateData = {
    blogarticle_content,
    blogarticle_title,
    blogarticle_time: new Date(),
  }

  const sql = `UPDATE bloglist SET ? WHERE blogarticle_id=?`

  const [result] = await db.query(sql, [updateData, blogarticle_id])
  // return res.json(output)
  //看結果
  output.result = result
  output.success = !!result.changedRows

  //資料送做來 再丟回去
  res.json(output)
})

// 刪除收藏
router.delete('/delete-blog-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  const { member_id, blogarticle_id } = req.body
  try {
    const sql = `
      DELETE FROM blogcollect WHERE member_id = ? AND blogarticle_id = ?
    `
    console.log(`
DELETE FROM blogcollect WHERE member_id = ${member_id} AND blogarticle_id = ${blogarticle_id}
`)

    const [result] = await db.query(sql, [member_id, blogarticle_id])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

// 刪除follow
router.delete('/delete-follow-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  const { member_id, follow_member } = req.body
  try {
    const sql = `
      DELETE FROM blogfollow WHERE member_id = ? AND follow_member  = ?
    `
    console.log(`
DELETE FROM blogfollow WHERE member_id = ${member_id} AND follow_member  = ${follow_member}
`)

    const [result] = await db.query(sql, [member_id, follow_member])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

//21-4刪除
router.delete('/:blogarticle_id', async (req, res) => {
  const output = {
    success: false,
    result: null,
  }
  const blogarticle_id = +req.params.blogarticle_id

  //如果數值 才會進來
  if (!blogarticle_id || blogarticle_id < 1) {
    return res.json(output)
  }

  const sql = `DELETE FROM bloglist WHERE blogarticle_id=${blogarticle_id}`
  const [result] = await db.query(sql)
  output.result = result
  output.success = !!result.affectedRows
  res.json(output)
})

//提供完整class
router.get('/myclass', async (req, res) => {
  const sql = `SELECT * FROM blogclass `
  const [rows] = await db.query(sql)
  res.json(rows)
})

//yang的收藏
// 加入收藏
router.post('/add-blog-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  const { member_id, blogarticle_id } = req.body
  try {
    const sql = `
    INSERT INTO blogcollect (member_id, blogarticle_id) VALUES (?,?)
    `
    const [result] = await db.query(sql, [member_id, blogarticle_id])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

// 取得收藏
router.get('/get-blog-fav', async (req, res) => {
  const member_id = +req.query.member_id

  console.log(member_id)
  const output = {
    success: false,
    courseFav: [],
  }
  try {
    const sql = `SELECT * FROM blogcollect where member_id=?; `
    const [result] = await db.query(sql, [member_id])

    // output.courseFav = result
    // output.success = true
    return res.json(result)
  } catch (ex) {
    console.log(ex)
  }
})

// 加入follow
router.post('/add-follow-fav', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  const { member_id, follow_member } = req.body
  try {
    const sql = `
    INSERT INTO blogfollow (member_id, follow_member) VALUES (?,?)
    `
    const [result] = await db.query(sql, [member_id, follow_member])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    console.log(ex)
  }

  return res.json(output)
})

// 取得follow
router.get('/get-follow-fav', async (req, res) => {
  const member_id = +req.query.member_id

  console.log(member_id)
  const output = {
    success: false,
    courseFav: [],
  }
  try {
    const sql = `SELECT * FROM blogfollow where member_id=? `
    const [result] = await db.query(sql, [member_id])

    // output.courseFav = result
    // output.success = true
    return res.json(result)
  } catch (ex) {
    console.log(ex)
  }
})

export default router
