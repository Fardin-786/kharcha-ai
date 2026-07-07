import { useState, useEffect } from "react";
import { Button } from "./components/ui/button";
import ExpenseChart from "./ExpenseChart";
import { Card, CardContent } from "./components/ui/card";

export default function App() {
 
  // Expense List
  const [expenses, setExpenses] = useState([]);

  // Voice Recognition States
  const [transcript, setTranscript] = useState("");
  const [isListening, setIsListening] = useState(false);

  // Receipt Scanner State
  const [isScanning, setIsScanning] = useState(false);

  // ==========================
  // Load Expenses
  // ==========================
  const loadExpenses = async () => {
    try {
      const response = await fetch("https://kharcha-backend-ai.onrender.com/api/expenses");
      const realData = await response.json();
      setExpenses(realData);
    } catch (error) {
      console.error("Failed to load expenses", error);
    }
  };

  useEffect(() => {
    loadExpenses();
  }, []);

  // ==========================
  // Voice Recognition
  // ==========================
  const startListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Your browser does not support Voice Recognition. Please use Google Chrome.",
      );
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = async (event) => {
      const spokenText = event.results[0][0].transcript;

      setTranscript(spokenText);

      try {
        // Send voice text to Gemini
        const aiResponse = await fetch("https://kharcha-backend-ai.onrender.com/api/analyze", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            text: spokenText,
          }),
        });

        const aiData = await aiResponse.json();

        // Remove markdown if Gemini returns ```json
        const cleanJsonString = aiData.result
          .replace(/```json/g, "")
          .replace(/```/g, "")
          .trim();

        const extractedExpense = JSON.parse(cleanJsonString);

        // Save to backend
        await fetch("https://kharcha-backend-ai.onrender.com/api/expenses", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(extractedExpense),
        });

        // Refresh list
        loadExpenses();
      } catch (error) {
        console.error(error);
        alert("Something went wrong in the AI pipeline.");
      }
    };

    recognition.onerror = () => {
      alert("Voice recognition failed.");
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  // ==========================
  // Receipt Scanner
  // ==========================
  const handleFileUpload = (event) => {
  const file = event.target.files[0];
  if (!file) return;
  setIsScanning(true);

  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onloadend = async () => {
    const base64String = reader.result.split(',')[1];
    try {
      // 1. Image scan ke liye backend par bheja
      const response = await fetch('https://kharcha-backend-ai.onrender.com/api/scan-receipt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64String })
      });
      
      const data = await response.json();
      console.log("Scanned Data:", data.result);

      // Gemini ke response string ko JSON object mein parse karein
      let cleanData = {};
      if (typeof data.result === 'string') {
        const cleanJsonString = data.result.replace(/```json/g, "").replace(/```/g, "").trim();
        cleanData = JSON.parse(cleanJsonString);
      } else {
        cleanData = data.result;
      }

      // Merchant ko category ki tarah ya fir title ki tarah map karein
      // Agar merchant name hai toh use capital format mein extract karein
      const finalCategory = cleanData.merchant || cleanData.category || "Receipt Scan";
      const finalAmount = Number(cleanData.amount || 0);

      if (finalAmount <= 0) {
        alert("AI could not extract a valid amount from the receipt.");
        return;
      }

      // 🔥 AUTO-SAVE TO DB: Ab extracted data ko direct database endpoint par POST karein
      const saveResponse = await fetch("https://kharcha-backend-ai.onrender.com/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: finalAmount,
          category: finalCategory
        })
      });

      if (saveResponse.ok) {
        alert(`Success! Saved ₹${finalAmount} for ${finalCategory}`);
        loadExpenses(); // 🎉 Niche automatic card lane ke liye state refresh!
      } else {
        alert("Receipt scan toh ho gaya, par database mein save nahi ho paya.");
      }

    } catch (error) {
      console.error(error);
      alert("Something went wrong during image scan!");
    } finally {
      setIsScanning(false);
    }
  };
};
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-6">
      {/* Title */}
      <h1 className="text-3xl font-bold text-gray-800 mt-10 mb-10">
        Kharcha-AI Dashboard
      </h1>

      {/* Voice Button */}
      <div className="mb-6 flex flex-col items-center">
        <Button
          onClick={startListening}
          className={`w-40 h-40 rounded-full text-xl text-white shadow-lg transition-all ${
            isListening
              ? "bg-red-500 animate-pulse"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isListening ? "🎤 Listening..." : "🎤 Record"}
        </Button>

        {/* Upload Receipt */}
        <div className="mt-5">
          <label className="cursor-pointer bg-gray-200 hover:bg-gray-300 px-5 py-3 rounded-lg shadow">
            {isScanning ? "⏳ Scanning..." : "📷 Upload Receipt"}

            <input
              type="file"
              accept="image/*"
              hidden
              onChange={handleFileUpload}
            />
          </label>
        </div>

        {/* Transcript */}
        {transcript && (
          <div className="mt-6 bg-white shadow rounded-lg p-4 w-full max-w-md">
            <h3 className="font-semibold text-lg mb-2">You said:</h3>

            <p className="text-gray-700">"{transcript}"</p>
          </div>
        )}
      </div>

      <ExpenseChart />

      {/* Expense List */}
      <div className="w-full max-w-md">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">
          Recent Spending
        </h2>

        {expenses.length === 0 ? (
          <p className="text-center text-gray-500">No expenses found.</p>
        ) : (
          expenses.map((expense) => (
            <Card key={expense.id} className="mb-3">
              <CardContent className="p-4 flex justify-between items-center">
                <span className="font-medium text-gray-800">
                  {expense.category}
                </span>

                <span className="text-red-500 font-bold">
                  ₹{expense.amount}
                </span>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
