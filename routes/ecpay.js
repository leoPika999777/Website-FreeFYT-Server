import express from 'express'
const router = express.Router()
import crypto from 'crypto'
import dotenv from 'dotenv'
import db from './../utils/connect-mysql.js'
// 綠界提供的 SDK
import ECPayPayment from 'ecpay_aio_nodejs/lib/ecpay_payment.js'

const { MERCHANTID, HASHKEY, HASHIV, HOST } = process.env

// SDK 提供的範例，初始化
// https://github.com/ECPay/ECPayAIO_Node.js/blob/master/ECPAY_Payment_node_js/conf/config-example.js
const options = {
  OperationMode: 'Test', //Test or Production
  MercProfile: {
    MerchantID: MERCHANTID,
    HashKey: HASHKEY,
    HashIV: HASHIV,
  },
  IgnorePayment: [
    //    "Credit",
    //    "WebATM",
    //    "ATM",
    //    "CVS",
    //    "BARCODE",
    //    "AndroidPay"
  ],
  IsProjectContractor: false,
}

router.get('/', async (req, res) => {
  const courseId = req.query.courseId
  const courseName = req.query.courseName
  const selectedTime = req.query.selectedTime
  const price = req.query.price
  const TradeNo = req.query.tradeNo
  const purchaseId = req.query.purchase_id
  // SDK 提供的範例，參數設定
  // https://github.com/ECPay/ECPayAIO_Node.js/blob/master/ECPAY_Payment_node_js/conf/config-example.js
  const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
    timeZone: 'UTC',
  })

  // 加密
  const encrypt = (data) => {
    const buffer = Buffer.from(data, 'utf-8')
    const encoded = buffer.toString('base64')
    return encoded
  }
  const encryptedPurchaseId = encrypt(purchaseId)

  // TradeNo = 'FYT' + new Date().getTime()
  let base_param = {
    MerchantTradeNo: TradeNo,
    MerchantTradeDate,
    TotalAmount: price,
    TradeDesc: selectedTime,
    ItemName: courseName,
    ReturnURL: `${HOST}/return`,
    ClientBackURL: `http://localhost:3000/course/payment/success/${encryptedPurchaseId}`,
  }
  const create = new ECPayPayment(options)

  // 注意：在此事直接提供 html + js 直接觸發的範例，直接從前端觸發付款行為
  const html = create.payment_client.aio_check_out_all(base_param)
  console.log(html)

  res.send(html)
})

// 後端接收綠界回傳的資料
router.post('/return', async (req, res) => {
  console.log('req.body:', req.body)

  const { CheckMacValue } = req.body
  const data = { ...req.body }
  delete data.CheckMacValue // 此段不驗證

  const create = new ECPayPayment(options)
  const checkValue = create.payment_client.helper.gen_chk_mac_value(data)

  console.log(
    '確認交易正確性：',
    CheckMacValue === checkValue,
    CheckMacValue,
    checkValue
  )

  // 交易成功後，需要回傳 1|OK 給綠界
  res.send('1|OK')
})

// 用戶交易完成後的轉址
router.get('/clientReturn', (req, res) => {
  // 在這裡指定您的前端應用的頁面
  const clientReturnURL = 'http://localhost:3000/course/payment/success'

  // 將用戶重定向到您的前端頁面
  res.redirect(clientReturnURL)
})

export default router
