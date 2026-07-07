// 1. IMPORT OUR TOOLS
const express = require("express");
const cors = require("cors");
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();
const { PrismaClient } = require("@prisma/client");

// 2. INITIALIZE THE SERVER AND DATABASE
const app = express();
const prisma = new PrismaClient();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 3. MIDDLEWARE
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 4. GET ALL EXPENSES
app.get("/api/expenses", async (req, res) => {
  try {
    const allExpenses = await prisma.expense.findMany();
    res.json(allExpenses);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

// 5. CREATE A NEW EXPENSE
app.post("/api/expenses", async (req, res) => {
  try {
    const { amount, category } = req.body;

    const newExpense = await prisma.expense.create({
      data: {
        amount: Number(amount),
        category,
      },
    });

    res.json(newExpense);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to save expense" });
  }
});

// 6. ANALYZE VOICE USING GEMINI
app.post("/api/analyze", async (req, res) => {
  try {
    const { text } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are an expert financial categorizer.

Read the spoken text and extract only:
1. amount
2. category

Return ONLY valid JSON.

Example:
{
  "amount": 150,
  "category": "Food"
}

Spoken Text:
"${text}"
`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const aiResponse = response.text();

    console.log("🤖 GEMINI AI SAYS:");
    console.log(aiResponse);

    res.json({
      success: true,
      result: aiResponse,
    });

  } catch (error) {
    console.error("Gemini Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// 7. SCAN RECEIPT USING GEMINI VISION
app.post("/api/scan-receipt", async (req, res) => {
  try {
    const { imageBase64 } = req.body;

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are an expert accountant.

Read the receipt image carefully.

Extract only:
1. Merchant Name
2. Total Amount Paid

Return ONLY valid JSON.

Example:
{
  "merchant": "Domino's",
  "amount": 560
}
`;

    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg",
      },
    };

    const result = await model.generateContent([
      prompt,
      imagePart,
    ]);

    const response = await result.response;
    const aiResponse = response.text();

    console.log("📷 GEMINI VISION SAYS:");
    console.log(aiResponse);

    res.json({
      success: true,
      result: aiResponse,
    });

  } catch (error) {
    console.error("Vision Error:", error);

    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});
// 8. START SERVER
const PORT = process.env.PORT || 8080;

app.listen(PORT, () => {
  console.log(`🚀 Server is running on http://localhost:${PORT}`);
});