import express from 'express'
import db from './../utils/connect-mysql.js'
// Q: How connection works, process.env...etc.
// TODO: .env
import bcrypt from 'bcryptjs'
import jsonwebtoken from 'jsonwebtoken'
import multer from 'multer'
import path from 'path'
// Q: Newly installed
// Q: Can I move multer to index.js?
import nodemailer from 'nodemailer'
import totpGenerator from 'totp-generator'

const accessTokenSecret = process.env.ACCESS_TOKEN_SECRET
const totpSecret = process.env.TOTP_SECRET

const router = express.Router()

// import sequelize from '#configs/db.js'
// const { User } = sequelize.models
// import 'dotenv/config.js'

router.post('/signup', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
    // NOTE: For debugging
  }

  const {
    username,
    password,
    name,
    nickname,
    gender,
    birthday,
    email,
    mobile,
    city,
    district,
    address,
    height,
    weight,
    trainingFrequency,
    trainingIntensity,
  } = req.body

  console.log('req.body', req.body)

  const sql =
    'INSERT INTO `member`(`member_username`, `member_password`, `member_name`, `member_nickname`, `member_gender`, `member_birthday`, `member_email`, `member_mobile`, `member_city_id`, `member_district_id`, `member_address`, `member_height`, `member_weight`, `member_frequency`, `member_intensity`, `member_join_date`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'

  // NOTE: Hashing password
  const hashedPassword = await bcrypt.hash(password, 8)

  try {
    const [result] = await db.query(sql, [
      username,
      hashedPassword,
      name,
      nickname,
      gender,
      birthday,
      email,
      mobile,
      city,
      district,
      address,
      height,
      weight,
      trainingFrequency,
      trainingIntensity,
      // Q: Using [req.body] instead?
    ])
    console.log('result', result)
    output.result = result
    console.log('output', output)
    output.success = !!result.affectedRows
    // NOTE: mysql2 allow direct access to these values
    // NOTE: Truthy/falsy value to true/false
    // NOTE: member_city_id and member_district_id needs to be nullable

    // NOTE: Include memberID in response if signup was successful
    if (output.success) {
      output.memberID = result.insertId
    }
  } catch (ex) {
    output.exception = ex
  }
  res.json(output)
})

// TITLE: PROFILE IMG UPLOAD
const imgStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/member/profile-img')
  },
  // NOTE: Determines stored destination
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + '_' + Date.now() + path.extname(file.originalname)
      // NOTE: path.extname extracts file extension name
    )
  },
})

const uploadImg = multer({
  storage: imgStorage,
})

router.post(
  '/signup/profileimg',
  uploadImg.single('image'),
  async (req, res) => {
    if (req.file) {
      const image = req.file.filename
      const latestEntry =
        'SELECT `member_id` FROM `member` ORDER BY `member_id` DESC LIMIT 1'
      const [latestResult] = await db.query(latestEntry)
      // NOTE: member_id of latest added entry
      const latestMemberID = latestResult[0].member_id
      const sql = 'UPDATE `member` SET `member_pic`=? WHERE `member_id`=? '
      const [picResult] = await db.query(sql, [image, latestMemberID])
      if (picResult.affectedRows > 0) {
        return res.json({
          success: true,
        })
      } else {
        return res.json({
          success: false,
        })
      }
    } else {
      return res.json({ success: true })
      // NOTE: Also success if no photo uploaded
    }
  }
)

// TITLE: MEMBER INFO UPDATE
router.post('/profile/update-info/api', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
  }

  const {
    name,
    gender,
    birthday,
    trainingFrequency,
    trainingIntensity,
    height,
    weight,
    email,
    mobile,
    memberID,
  } = req.body

  console.log(req.body)

  const sql =
    'UPDATE `member` SET `member_name`=?, `member_gender`=?, `member_birthday`=?, `member_frequency`=?, `member_intensity`=?, `member_height`=?, `member_weight`=?, `member_email`=?, `member_mobile`=? WHERE `member_id`=?'

  try {
    const [result] = await db.query(sql, [
      name,
      gender,
      birthday,
      trainingFrequency,
      trainingIntensity,
      height,
      weight,
      email,
      mobile,
      memberID,
    ])
    output.result = result
    output.success = true
  } catch (ex) {
    output.exception = ex
    console.log(ex)
  }

  res.json(output)
})

// TITLE: PROFILE IMG UPDATE
const imgStorageUpdate = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/member/profile-img')
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + '_' + Date.now() + path.extname(file.originalname)
    )
  },
})

const uploadImgUpdate = multer({
  storage: imgStorageUpdate,
})

router.post(
  '/profile/update-profile-pic/api',
  uploadImgUpdate.single('image'),
  async (req, res) => {
    const { memberID } = req.body
    if (req.file) {
      const image = req.file.filename
      const sql = 'UPDATE `member` SET `member_pic`=? WHERE `member_id`=?'

      const [picResult] = await db.query(sql, [image, memberID])
      if (picResult.affectedRows > 0) {
        return res.json({
          success: true,
        })
      } else {
        return res.json({
          success: false,
        })
      }
    } else {
      return res.json({ success: true })
    }
  }
)

router.get('/profile/api/:member_id', async (req, res) => {
  // NOTE: User unauthorized
  if (!res.locals.jsonwebtoken?.id) {
    return res.json({ success: false, error: 'Unauthorized' })
  }

  const memberID = +req.params.member_id
  // console.log(memberID)
  const sql = 'SELECT * FROM `member` WHERE `member_id`=?'
  const [row] = await db.query(sql, [memberID])
  const memberInfo = row[0]

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, memberInfo })
  // console.log(memberInfo)
})

// NOTE: GETTING CITY AND DISTRICT INFO
router.get('/signup/city/api/', async (req, res) => {
  const sql = 'SELECT * FROM `address` WHERE `parent_sid`=0'
  const [row] = await db.query(sql)
  const addressInfo = row
  // NOTE: "row", not "[row]"

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, addressInfo })
})

router.get('/signup/city/api/:sid', async (req, res) => {
  const citySid = req.params.sid
  // console.log('city', req.params.sid)

  const sql = 'SELECT * FROM `address` WHERE `parent_sid`=?'
  const [row] = await db.query(sql, [citySid])
  const addressInfo = row
  // console.log(addressInfo)

  if (!row.length) {
    return res.json({ success: false })
  }

  // console.log(addressInfo)
  res.json({ success: true, addressInfo })
})

// NOTE: GET CITY NAME FOR MEMBER PROFILE PAGE
router.get('/signup/city-district/api/:sid', async (req, res) => {
  const citySid = req.params.sid
  // console.log('city', req.params.sid)

  const sql = 'SELECT * FROM `address` WHERE `sid`=?'
  const [row] = await db.query(sql, [citySid])
  const addressInfo = row
  // console.log(addressInfo)

  if (!row.length) {
    return res.json({ success: false })
  }

  // console.log(addressInfo)
  res.json({ success: true, addressInfo })
})

// TODO: Clean up
router.post('/signin', async (req, res) => {
  const output = {
    success: false,
    accountMessage: '',
    passMessage: '',
    id: 0,
    username: '',
    nickname: '',
    token: '',
  }

  const { username, password } = req.body

  if (!username || !password) {
    if (!username) {
      output.accountMessage = '請填入帳號或E-mail'
    } else {
      output.accountMessage = ''
    }

    if (!password) {
      output.passMessage = '請填入密碼'
    } else {
      output.passMessage = ''
    }

    return res.json(output)
  }

  const sql = 'SELECT * FROM `member` WHERE `member_username`=?'
  const [rows] = await db.query(sql, [req.body.username])

  if (!rows.length) {
    // NOTE: Account does not exist
    output.accountMessage = '帳號不存在'
    return res.json(output)
  }

  const row = rows[0]
  const pass = await bcrypt.compare(password, row.member_password)

  if (!pass) {
    // NOTE: Password is incorrect
    output.passMessage = '密碼錯誤'
    return res.json(output)
  }

  if (pass || rows.length || password || username) {
    output.accountMessage = ''
    output.passMessage = ''
    output.success = true
    output.id = row.member_id
    output.username = row.member_username
    output.nickname = row.member_nickname
    output.token = jsonwebtoken.sign(
      { id: row.member_id, username: row.member_username },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: '3d',
      }
    )

    res.cookie('accessToken', output.token, {
      httpOnly: true,
      // expires: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
    })
    // Q: Where is it stored?
    res.json(output)
  }
})

router.post('/signin/google', async function (req, res, next) {
  if (!req.body.providerData.providerId || !req.body.providerData.uid) {
    // console.log(res)
    return res.json({ status: 'error', message: '缺少Google登入資料' })
  }

  const { providerData } = req.body
  const uid = providerData.uid
  const photoURL = providerData.photoURL
  const displayName = providerData.displayName
  const email = providerData.email

  const sql = 'SELECT * FROM member WHERE google_uid=?'
  const [result] = await db.query(sql, [uid])
  // NOTE: Remember to use await to resolve promise
  // console.log(result)
  let existingMember = {
    id: 0,
    username: '',
    googleUID: '',
  }

  let returnMember = {}

  if (result.length > 0) {
    // NOTE: Cannot use "result" because an array is truthy
    existingMember = {
      id: result[0].member_id,
      username: result[0].member_username,
      googleUID: result[0].google_uid,
    }
  } else {
    const newMember = {
      name: displayName,
      email: email,
      googleUID: uid,
      googlePic: photoURL,
    }
    // console.log(newMember)

    const insertSql =
      'INSERT INTO member(`google_uid`, `google_name`, `google_email`, `google_pic`, `member_name`, `member_email`, `member_nickname`, `member_join_date`) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)'

    const googleMemberNickname = newMember.email.replace('@gmail.com', '')
    // NOTE: Using google username as nickname

    const [newResult] = await db.query(insertSql, [
      newMember.googleUID,
      newMember.name,
      newMember.email,
      newMember.googlePic,
      newMember.name,
      newMember.email,
      googleMemberNickname,
    ])

    const extractSql = 'SELECT * FROM `member` WHERE member_id=?'
    const [extractResult] = await db.query(extractSql, [newResult.insertId])

    returnMember = {
      id: extractResult[0].member_id,
      username: extractResult[0].member_username,
      googleUID: extractResult[0].google_uid,
    }
    // console.log(returnMember)
  }

  const signInMember = result.length > 0 ? existingMember : returnMember
  const accessToken = jsonwebtoken.sign(signInMember, accessTokenSecret, {
    expiresIn: '3d',
  })

  // console.log(accessToken)
  res.cookie('accessToken', accessToken, { httpOnly: true })
  return res.json({
    status: 'success',
    data: {
      id: result.length > 0 ? existingMember.id : returnMember.id,
      username:
        result.length > 0 ? existingMember.username : returnMember.username,
      token: accessToken,
    },
  })
})

router.post('/send-recovery-email', async function (req, res) {
  const { email } = req.body
  console.log(req.body)

  const otp = totpGenerator(totpSecret, { period: 60 })

  const sql = 'SELECT * FROM `member` WHERE `member_email`=?'
  const [row] = await db.query(sql, [email])
  const memberInfo = row[0]

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, memberInfo, otp: otp })

  // NOTE: Send e-mail
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
    to: email,
    subject: '[FreeFYT] 重設密碼 - 驗證信',
    html: `
    <p>親愛的會員 您好：</p>
    <p>這封認證信是由 FreeFYT 健身網發出，請將驗證碼 ${otp} 填入重設密碼的介面，謝謝！</p>
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

router.post('/reset-password', async (req, res) => {
  const output = {
    success: false,
    postData: req.body,
  }

  const { newPassword, email } = req.body

  const sql =
    'UPDATE `member` SET `member_password` = ? WHERE `member_email` = ?'

  const hashedNewPassword = await bcrypt.hash(newPassword, 8)

  try {
    const [result] = await db.query(sql, [hashedNewPassword, email])
    console.log('result', result)
    output.result = result
    console.log('output', output)
    output.success = !!result.affectedRows
  } catch (ex) {
    output.exception = ex
  }
  res.json(output)
})

// NOTE: GETTING COACH ID OF MEMBER
router.get('/search-coach-id/api', async (req, res) => {
  const { member_id } = req.query

  const sql = 'SELECT * FROM `coach` WHERE `member_id`=?'
  const [row] = await db.query(sql, [member_id])
  const coachInfo = row

  if (!row.length) {
    return res.json({ success: false })
  }

  res.json({ success: true, coachInfo })
})

export default router
