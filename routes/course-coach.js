import express from 'express'
import db from './../utils/connect-mysql.js'
import upload from './../utils/upload-imgs.js'

const router = express.Router()

// TODO:教練課表
router.get('/', async (req, res) => {
  res.send('教練課表')
})

// 教練課程管理(上課記錄)
router.get('/coach-order',async(req,res)=>{
  const coach_member_id = +req.query.member_id
  const sql = `
  SELECT 
      c.coach_id,
      cr.name AS course_name,
      cp.*,
      m.member_name,
      m.member_mobile
    FROM coach AS c
    INNER JOIN course AS cr ON c.coach_id = cr.coach_id
    INNER JOIN course_purchase AS cp ON cr.course_id = cp.course_id
    INNER JOIN member AS m ON cp.member_id = m.member_id
    WHERE c.member_id = ?
    ORDER BY cp.course_datetime ASC;
  `
  const [rows] = await db.query(sql, [coach_member_id])
  res.json(rows)
})

// 教練課程管理(課表)
router.get('/coach-record',async(req,res)=>{
  const coach_member_id = +req.query.member_id
  const sql = `
  SELECT 
      c.coach_id,
      cr.name AS course_name,
      cp.*,
      m.member_name,
      m.member_mobile
    FROM coach AS c
    INNER JOIN course AS cr ON c.coach_id = cr.coach_id
    INNER JOIN course_purchase AS cp ON cr.course_id = cp.course_id
    INNER JOIN member AS m ON cp.member_id = m.member_id
    WHERE c.member_id = ?
    ORDER BY cp.course_datetime DESC;
  `
  const [rows] = await db.query(sql, [coach_member_id])
  res.json(rows)
})

// 更改課程狀態
router.put('/record-status-changed',async(req,res)=>{
  const output={
    success:false,
    postData:req.body
  }
  const {status,purchase_id}=req.body
  try{
    const sql=`
    UPDATE course_purchase 
    SET status = ?
    WHERE purchase_id = ?
    `
    const [result]=await db.query(sql,[status,purchase_id])
    output.result = result
    output.success = !!courseResult.changedRows
  }catch(ex){
    console.log(ex)
  }
  res.json(output)
})


// 新增課程
router.post('/add', upload.single('avatar'), async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  const {
    coach_id,
    name,
    intro,
    price,
    gym_name,
    gym_address,
    tags,
    times,
    is_published,
  } = req.body

  const course_img = req.file.filename

  try {
    // 插入 course 表
    const courseSql = `
    INSERT INTO course (coach_id, name, intro, price, gym_name, gym_address, created_at, updated_at,is_published,course_img)
    VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW(),?,?)
  `
    const [courseResult] = await db.query(courseSql, [
      coach_id,
      name,
      intro,
      price,
      gym_name,
      gym_address,
      is_published,
      course_img,
    ])

    // 取得插入的 course_id
    const courseId = courseResult.insertId

    // 插入 tags 到 course_tag 表
    if (tags && tags.length > 0) {
      const tagSql =
        'INSERT INTO course_tag (course_id, fitness_id) VALUES (?, ?)'
      for (const tagId of tags) {
        await db.query(tagSql, [courseId, tagId])
      }
    }
    // 插入 times 到 course_time 表
    if (times && times.length > 0) {
      const timeSql =
        'INSERT INTO course_time (course_id, week_id, period_id) VALUES (?, ?, ?)'
      for (const { week_id, period_id } of times) {
        await db.query(timeSql, [courseId, week_id, period_id])
      }
    }

    // 查詢最後一次插入的結果
    const [result] = await db.query(
      'SELECT * FROM course WHERE course_id = ?',
      [courseId]
    )

    // 定義一個 output 的屬性 result 把 SQL查詢的值給他
    output.result = courseResult
    // 如果 affectedRows 是1就是true,0就是false
    output.success = !!courseResult.affectedRows
    output.course_img = course_img // 將 course_img 加入到 output 中
  } catch (ex) {
    output.exception = ex
  }

  res.json(output)
})

// 編輯課程
router.put('/edit/:course_id', upload.single('avatar'), async (req, res) => {
  const course_id = +req.params.course_id
  const output = {
    success: false,
    postData: req.body,
  }
  const {
    coach_id,
    name,
    intro,
    price,
    gym_name,
    gym_address,
    tags,
    times,
    is_published,
  } = req.body

  try {
    let course_img = null

    // 如果有新的圖片，則獲取圖片檔名
    if (req.file) {
      course_img = req.file.filename
    }

    // 更新 course 表
    const updateCourseSql = `
      UPDATE course
      SET coach_id = ?, name = ?, intro = ?, price = ?, gym_name = ?, gym_address = ?, updated_at = NOW(),is_published=?,course_img=?
      WHERE course_id = ?
    `
    const [courseResult] = await db.query(updateCourseSql, [
      coach_id,
      name,
      intro,
      price,
      gym_name,
      gym_address,
      is_published,
      course_img,
      course_id,
    ])

    // 刪除原有的 tags
    await db.query('DELETE FROM course_tag WHERE course_id = ?', [course_id])

    // 插入新的 tags 到 course_tag 表
    if (tags && tags.length > 0) {
      const tagSql =
        'INSERT INTO course_tag (course_id, fitness_id) VALUES (?, ?)'
      for (const tagId of tags) {
        await db.query(tagSql, [course_id, tagId])
      }
    }

    // 刪除原有的 times
    await db.query('DELETE FROM course_time WHERE course_id = ?', [course_id])

    // 插入新的 times 到 course_time 表
    if (times && times.length > 0) {
      const timeSql =
        'INSERT INTO course_time (course_id, week_id, period_id) VALUES (?, ?, ?)'
      for (const { week_id, period_id } of times) {
        await db.query(timeSql, [course_id, week_id, period_id])
      }
    }

    output.result = courseResult
    output.success = !!(courseResult.affectedRows || courseResult.changedRows)
  } catch (ex) {
    output.exception = ex
  }

  res.json(output)
})

// 刪除課程
router.delete('/delete/:course_id', async (req, res) => {
  const course_id = +req.params.course_id
  const output = {
    success: false,
    postData: { course_id },
  }

  try {
    // 刪除 course_tag 表中對應的標籤
    await db.query('DELETE FROM course_tag WHERE course_id = ?', [course_id])

    // 刪除 course_time 表中對應的上課時間
    await db.query('DELETE FROM course_time WHERE course_id = ?', [course_id])

    // 刪除 course 表中的課程
    const [result] = await db.query('DELETE FROM course WHERE course_id = ?', [
      course_id,
    ])

    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    output.exception = ex
  }

  res.json(output)
})

export default router
