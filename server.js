const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
// Render ఇచ్చే పోర్ట్ మాత్రమే తీసుకోవాలి
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());

// కరెంట్ డైరెక్టరీ స్టాటిక్ ఫైల్స్
app.use(express.static(__dirname));

// హోమ్ పేజీ రూట్ - డైరెక్ట్ గా index.html సర్వ్ చేస్తుంది (Not Found ఎర్రర్ రాదు)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Buddy AI Backend Route
app.post('/api/analyze', (req, res) => {
  const query = (req.body.query || "").toLowerCase().trim();
  res.json({
    success: true,
    aiName: "Buddy",
    text: `Buddy Engine online. Query "${query}" processed successfully.`
  });
});

// మిగిలిన అన్ని లింకులకు కూడా index.html ఇవ్వడం
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Render లో తప్పనిసరిగా 0.0.0.0 పై బైండ్ అవ్వాలి
app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Buddy Terminal Engine] Live on port ${PORT}`);
});
