import express from 'express'
import db from '../utils/connect-mysql.js'
// eslint-disable-next-line import/no-unresolved
import dayjs from 'dayjs'
import upload from '../utils/upload-imgs.js'

import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const router = express.Router()

//敏新增ADD
// 新增
router.post('/addblog', upload.single('avatar'), async (req, res) => {
  const output = {
    success: false,
    postData: req.body, //除錯用
  }

  // // 檢查文件是否成功上傳
  // if (!req.files || req.files.length === 0) {
  //   output.error = '未上傳文件'
  //   return res.json(output)
  // }

  // // 取第一個文件的文件名
  // // const filename = req.files[0].filename;

  // // 取得所有上傳文件的檔案名稱
  // const filenames = req.files.map((file) => file.filename)

  // // 定義檔案類型 同PHP
  // const extMap = {
  //   'image/jpeg': '.jpg',
  //   'image/png': '.png',
  //   'image/webp': '.webp',
  // }

  // // 檢查副檔名
  // const fileFilter = (req, file, cb) => {
  //   cb(null, !!extMap[file.mimetype])
  // }

  // // 存放位置及設定檔名
  // const storage = multer.diskStorage({
  //   destination: (req, file, cb) => {
  //     cb(null, 'public/img')
  //   },
  //   filename: (req, file, cb) => {
  //     const main = uuidv4()
  //     const ext = extMap[file.mimetype]
  //     cb(null, main + ext)
  //   },
  // })

  // // 使用 multer 進行上傳檔案的設定
  // const upload = multer({
  //   storage: storage,
  //   fileFilter: fileFilter,
  // })

  //撈取登入的member_id
  if (!res.locals.jsonwebtoken?.id) {
    return res.json({ success: false, error: 'Unauthorized' })
  }
  const member_id = res.locals.jsonwebtoken?.id

  // sql
  const {
    blogread_sum,
    blogclass_id,

    blogarticle_public,
    blogarticle_title,
    blogarticle_content,
  } = req.body

  console.log('anchor', req.file)
  const course_img = req.file.filename

  const sql =
    'INSERT INTO `bloglist`(`member_id`, `blogread_sum`, `blogclass_id`, `blogarticle_create`, `blogarticle_time`,`blogarticle_public`, `blogarticle_title`,  `blogarticle_content`, `blogarticle_photo`) VALUES (?,?, ?, NOW(), NOW(),  ?, ?, ?, ?)'

  // console.log(`'/blogadd sql: '`, sql)
  try {
    // 會拿到 promise 所以要用await，加到資料庫會是陣列
    const [result] = await db.query(sql, [
      //productId,
      member_id,
      blogread_sum,
      blogclass_id,
      blogarticle_public,
      blogarticle_title,
      blogarticle_content,
      course_img,
    ])
    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    output.exception = ex
  }

  res.json(output)
})



//留言新增
router.post('/addreply', upload.none(), async (req, res) => {
  const output = {
    success: false,
    postData: req.body, // 除錯用
  }

  if (!res.locals.jsonwebtoken?.id) {
    return res.json({ success: false, error: 'Unauthorized' })
  }
  const member_id = res.locals.jsonwebtoken?.id

  console.log(req.query)

  // sql
  const { blogarticle_id, blogcomment_content } = req.body

  const sql =
    'INSERT INTO `blogreply`(`member_id`, `blogarticle_id`, `blogcomment_time`, `blogcomment_content`) VALUES (?, ?, NOW(), ? )'

  //21-3
  try {
    const [result] = await db.query(sql, [
      member_id,
      blogarticle_id,
      blogcomment_content,
    ])
    output.result = result
    output.success = !!result.affectedRows
  } catch (ex) {
    output.exception = ex
  }
  res.json(output)
})

export default router
