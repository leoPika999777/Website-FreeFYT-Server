import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'

// 篩選檔案和決定副檔名
const extMap = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
}

const fileFilter = (req, file, cb) => {
  cb(null, !!extMap[file.mimetype])
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/blog/img')
  },
  filename: (req, file, cb) => {
    const main = uuidv4()
    const ext = extMap[file.mimetype]
    cb(null, main + ext)
  },
})
export default multer({ fileFilter, storage })
