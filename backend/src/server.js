import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import XLSX from 'xlsx';
import OpenAI from 'openai';

dotenv.config();
const app = express();
const upload = multer({ storage: multer.memoryStorage() });
const port = process.env.PORT || 4000;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

const expenseKeys = [
  'housing', 'transportation', 'food', 'debt', 'subscriptions',
  'medical', 'savings', 'personal', 'family', 'miscellaneous'
];

const toNumber = (v) => Number(v) || 0;
const calculateMetrics = ({ income, expenses }) => {
  const totalExpenses = Object.values(expenses).reduce((a, b) => a + toNumber(b), 0);
  const remaining = income - totalExpenses;
  const savingsPct = income > 0 ? (toNumber(expenses.savings) / income) * 100 : 0;
  const debtRatio = income > 0 ? (toNumber(expenses.debt) / income) * 100 : 0;
  const healthScore = Math.max(0, Math.min(100, 70 + (remaining / Math.max(income,1))*25 - debtRatio*0.35));
  return { totalExpenses, remaining, savingsPct, debtRatio, healthScore };
};

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    res.json({ rows });
  } catch {
    res.status(400).json({ error: 'Unable to parse spreadsheet' });
  }
});

app.post('/api/analyze', async (req, res) => {
  const { income = 0, expenses = {}, scenarios = [] } = req.body;
  const normalizedExpenses = Object.fromEntries(expenseKeys.map((k) => [k, toNumber(expenses[k])]));
  const base = calculateMetrics({ income: toNumber(income), expenses: normalizedExpenses });

  const scenarioMap = {
    jobLoss: (e, i) => ({ income: i * 0.2, expenses: e }),
    rentIncrease: (e, i) => ({ income: i, expenses: { ...e, housing: e.housing * 1.2 } }),
    medicalEmergency: (e, i) => ({ income: i, expenses: { ...e, medical: e.medical + 600 } }),
    carRepair: (e, i) => ({ income: i, expenses: { ...e, transportation: e.transportation + 400 } }),
    inflationIncrease: (e, i) => ({ income: i, expenses: Object.fromEntries(Object.entries(e).map(([k,v])=>[k,v*1.08])) }),
    creditInterestIncrease: (e, i) => ({ income: i, expenses: { ...e, debt: e.debt * 1.25 } })
  };

  const scenarioResults = scenarios.map((s) => {
    const transformed = scenarioMap[s]?.(normalizedExpenses, toNumber(income)) || { income: toNumber(income), expenses: normalizedExpenses };
    return { scenario: s, ...calculateMetrics(transformed) };
  });

  let advisor = 'AI service unavailable. AI-generated advice is educational only.';
  if (process.env.OPENAI_API_KEY) {
    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an educational household finance advisor. Never provide guarantees, legal advice, or investment instructions. End with: "AI-generated advice is educational only."' },
          { role: 'user', content: `Income: ${income}, Expenses: ${JSON.stringify(normalizedExpenses)}, Base: ${JSON.stringify(base)}, Scenarios: ${JSON.stringify(scenarioResults)}. Provide spending risk analysis, reductions, debt concerns, savings strategies, weaknesses, and 12-month outlook.` }
        ],
        temperature: 0.5
      });
      advisor = response.choices?.[0]?.message?.content || advisor;
    } catch {
      advisor = 'Unable to contact AI service. AI-generated advice is educational only.';
    }
  }

  res.json({ metrics: base, scenarios: scenarioResults, advisor });
});

app.listen(port, () => console.log(`Server listening on ${port}`));
