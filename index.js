import express from 'express'
import upload from './utils/upload-imgs.js'
import session from 'express-session'
import cors from 'cors'
import jsonwebtoken from 'jsonwebtoken'

import memberRouter from './routes/member.js'
import courseRouter from './routes/course.js'
import courseCoachRouter from './routes/course-coach.js'
import courseMemberRouter from './routes/course-member.js'
import productRouter from './routes/product-list.js' // 商品api
import blogRouter from './routes/blog-list.js' //論壇頁面
import blogAddRouter from './routes/blog-add.js' //論壇頁面
import cartRouter from './routes/cart.js' // 購物車api
import ecpayRouter from './routes/ecpay.js'
import fytrackRouter from './routes/fytrack.js' // 健身追蹤api
import fytrackFoodDataRouter from './routes/fytrack-fooddata.js' // 健身追蹤api
import { createServer } from 'http'
import { Server } from 'socket.io'

const app = express()
const server = createServer(app)
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
  },
})

app.use(express.urlencoded({ extended: false }))
app.use(express.json())

// top-level middlewares // 依檔頭Content-Type來決定是否解析
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
) // 放所有路由的前面

// session
app.use(
  session({
    saveUninitialized: false, // 新用戶沒有使用到 session 物件時不會建立 session 和發送 cookie
    resave: false, // 沒變更內容是否強制回存
    secret: 'feagfegwevgv213',
    // cookie: {
    // maxAge: 1200_000, // 20分鐘，單位毫秒
    // },
  })
)

// 自訂頂層 middleware
app.use((req, res, next) => {
  const auth = req.get('Authorization')
  if (auth && auth.indexOf('Bearer ') === 0) {
    const token = auth.slice(7)
    try {
      const payload = jsonwebtoken.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET
      )
      console.log({ payload })
      res.locals.jsonwebtoken = payload
    } catch (ex) {
      console.log(ex)
    }
  }

  next()
})

app.get('/', (req, res) => {
  res.send('<h2>首頁</h2>')
})

//1to1
io.on('connection', (socket) => {
  console.log('a user connected')
  // socket.emit('test', 'hello')

  // socket.on('client', (arg) => {
  //   console.log('server recieved: ', arg)
  // })
  // socket.on('getUser', (user) => {
  //   if (user === 'a') {
  //     socket.join('room a')
  //     io.to('room a').emit('room', 'room a', new Date().toString())
  //   } else {
  //     socket.join('room b')
  //     io.to('room b').emit('room', 'room b', new Date().toString())
  //   }
  // })
  socket.emit('connection', 'success')
  socket.on('user message', (userId, receiverId, message) => {
    console.log('user message: ', message)
    socket.broadcast.emit('room', userId, message)
  })
  // socket.join('room')
  // socket.on('user message', (userId, message)=>{
  //   console.log(userId, message)
  //   io.to('room').emit('room', userId, message)
  // })

  // io.to('room').emit('room', 'server', 'room opened')
})

app.post('/try-post', (req, res) => {
  res.json(req.body)
})
// course 路由
app.use('/course', courseRouter)
app.use('/course/coach', courseCoachRouter)
app.use('/course/member', courseMemberRouter)

app.post('/try-post', (req, res) => {
  res.json(req.body)
})

// 會員路由
app.use('/member', memberRouter)

// 商城路由
app.use('/product-list', productRouter)

// 論壇路由
app.use('/blog-list', blogRouter)

// 論壇路由
app.use('/blog-add', blogAddRouter)

// 購物車路由
app.use('/cart', cartRouter)

// 綠界路由
app.use('/ecpay', ecpayRouter)

// 健身追蹤路由
app.use('/fytrack', fytrackRouter)

// 健身追蹤-食品資料庫路由
app.use('/fytrack-fooddata', fytrackFoodDataRouter)

// 上傳單ㄧ照片的路由
app.post('/try-upload', upload.single('avatar'), (req, res) => {
  res.json(req.file)
})
// 上傳複數照片的路由
app.post('/try-uploads', upload.array('photos'), (req, res) => {
  res.json(req.files)
})

// 設定靜態內容的資料夾,相當於在根目錄
app.use(express.static('public'))

// 404 錯誤處理
app.use((req, res) => {
  res.status(404).send(`<h1>404 not found</h1>`)
})

// 通訊埠
const port = process.env.WEB_PORT || 3003 // 如果沒設定就使用3003

// 伺服器啟動
server.listen(port, () => {
  console.log(`express server ${port}`)
})
