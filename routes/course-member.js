import express from 'express'
import db from './../utils/connect-mysql.js'
import dayjs from 'dayjs'
import moment from 'moment-timezone'

const router = express.Router()

// 會員訂單資料(課表用)
router.get('/member-order', async (req, res) => {
  const member_id = +req.query.member_id
  const sql = `
  SELECT cp.*, 
  c.name AS course_name, 
  c.gym_name, 
  c.course_img,
  c.price,
  co.member_id AS coach_member_id, 
  m.member_name AS coach_name ,
  m.member_mobile AS mobile,
  m.member_pic AS coach_img,
  m.member_email AS coach_email
  FROM course_purchase cp 
  JOIN course c ON cp.course_id = c.course_id 
  JOIN coach co ON c.coach_id = co.coach_id 
  JOIN member m ON co.member_id = m.member_id 
  WHERE cp.member_id = ?
  ORDER BY 
  cp.course_datetime ASC`

  const [rows] = await db.query(sql, [member_id])
  // 將日期欄位轉換成台灣時區
  const t_Rows = rows.map((row) => ({
    ...row,
    course_datetime: dayjs(
      moment(row.course_datetime).tz('Asia/Taipei')
    ).format('YYYY-MM-DD HH:mm:ss'),
    // 可以添加其他需要轉換時區的日期欄位
  }))

  res.json(t_Rows)
})

// 會員訂單資料(我的課程用)
router.get('/member-order-course', async (req, res) => {
  const member_id = +req.query.member_id
  const sql = `
  SELECT cp.*, 
  c.name AS course_name, 
  c.gym_name, 
  c.course_img,
  c.price,
  co.member_id AS coach_member_id, 
  m.member_name AS coach_name ,
  m.member_mobile AS mobile,
  m.member_pic AS coach_img,
  m.member_email AS coach_email
  FROM course_purchase cp 
  JOIN course c ON cp.course_id = c.course_id 
  JOIN coach co ON c.coach_id = co.coach_id 
  JOIN member m ON co.member_id = m.member_id 
  WHERE cp.member_id = ?
  ORDER BY 
  cp.purchase_id desc`

  const [rows] = await db.query(sql, [member_id])
  // 將日期欄位轉換成台灣時區
  const t_Rows = rows.map((row) => ({
    ...row,
    course_datetime: dayjs(
      moment(row.course_datetime).tz('Asia/Taipei')
    ).format('YYYY-MM-DD HH:mm:ss'),
    // 可以添加其他需要轉換時區的日期欄位
  }))

  res.json(t_Rows)
})

// 課程評論
router.put('/course-comment', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  try {
    const { score, course_comment, purchase_id } = req.body
    const sql = `
    UPDATE course_purchase
    SET
      score = ?,
      course_comment = ?,
      comment_time = IF(score <> ? OR course_comment <> ? OR comment_time IS NULL, NOW(), comment_time)
    WHERE purchase_id = ?
  `;
  // comment_time = IF(score <> ? OR course_comment <> ?, NOW(), course_comment)
  
  const [result] = await db.query(sql, [
    score,
    course_comment,
    score,
    course_comment,
    purchase_id,
  ]);

    // 更新課程表中的評分欄位
    const updateCourseSql = `
      UPDATE course
      SET score = (SELECT AVG(score) FROM course_purchase WHERE course_id = course.course_id)
      WHERE course_id = (SELECT course_id FROM course_purchase WHERE purchase_id = ?)
    `
    await db.query(updateCourseSql, [purchase_id])

    output.result = result
    output.success = !!result.changedRows
  } catch (ex) {
    output.exception = ex
  }
  res.json(output)
})

// 課程時間更改
router.put('/change-time', async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }
  try {
    const { time, purchase_id } = req.body
    const sql = `
      UPDATE course_purchase
      SET course_datetime = ? , status = '未確認預約'
      WHERE purchase_id = ?
    `
    const [result] = await db.query(sql, [time, purchase_id])
    output.result = result
    output.success = !!result.changedRows
  } catch (ex) {
    output.exception = ex
  }
  res.json(output)
})
export default router
