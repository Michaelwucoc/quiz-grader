import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const SYSTEM_PROMPT = `你是一位经验丰富的教师，专门负责批改试卷。请仔细阅读学生的答案，并按照以下标准进行评分：
1. 准确性：答案的正确程度
2. 完整性：是否完整回答了问题的所有方面
3. 逻辑性：论述是否清晰，步骤是否合理
4. 创新性：是否有独特的见解或解决方案

请提供：
1. 总分数（满分100分）
2. 详细的评语
3. 每道题的得分和具体评价
4. 改进建议`;

const app = express();
app.use(cors());
app.use(express.json());

// 配置文件上传
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage: storage });

// 确保上传目录存在
if (!fs.existsSync('./uploads')) {
  fs.mkdirSync('./uploads');
}

// 文件上传接口
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const model = req.body.model || 'gpt-4-vision-preview';
    let aiResult;
    if (req.file.mimetype === 'application/pdf') {
      const pdfBytes = fs.readFileSync(req.file.path);
      const base64Pdf = pdfBytes.toString('base64');
      
      aiResult = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "请批改这份试卷，并给出详细的评分和反馈。" },
              {
                type: "image",
                image_url: {
                  "url": `data:application/pdf;base64,${base64Pdf}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096
      });
    } else {
      const imageBuffer = fs.readFileSync(req.file.path);
      const base64Image = imageBuffer.toString('base64');
      
      aiResult = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "请批改这份试卷，并给出详细的评分和反馈。" },
              {
                type: "image",
                image_url: {
                  "url": `data:image/${req.file.mimetype};base64,${base64Image}`
                }
              }
            ]
          }
        ],
        max_tokens: 4096
      });
    }

    // 解析AI返回的结果
    const result = {
      score: 0,
      feedback: '',
      details: []
    };

    try {
      const aiResponse = aiResult.choices[0].message.content;
      // 这里需要根据AI返回的具体格式进行解析
      // 暂时使用简单的解析逻辑
      result.feedback = aiResponse;
      // 尝试从AI响应中提取分数信息
      const scoreMatch = aiResponse.match(/总分[：:]\s*(\d+)/i) || 
                        aiResponse.match(/得分[：:]\s*(\d+)/i) || 
                        aiResponse.match(/分数[：:]\s*(\d+)/i);
      result.score = parseInt(scoreMatch?.[1] || '0');
    } catch (error) {
      console.error('解析AI响应失败:', error);
      result.feedback = '评分系统出现错误，请稍后重试';
    }

    res.json({
      success: true,
      filePath: req.file.path,
      result: result
    });
  } catch (error) {
    console.error('上传处理错误:', error);
    res.status(500).json({ error: '文件处理失败' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});