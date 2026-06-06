// ===================================
// 🔥 ALEXA AI (NO DATABASE VERSION)
// ===================================

const express = require("express");
const bodyParser = require("body-parser");
const axios = require("axios");

const app = express();
app.use(bodyParser.json());

// ================= ENV =================
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ================= MEMORY =================
let memory = {};

// ================= PERSONALITY =================
function getPersonality(type) {
    if (type === "iraqi") {
        return "تتكلم بلهجة عراقية، ودود، ذكي، مختصر.";
    }
    if (type === "teacher") {
        return "تشرح كمدرس محترف وبأسلوب مبسط جداً.";
    }
    return "مساعد ذكي محترف.";
}

// ================= AI =================
async function askAI(user, text) {
    user.messages.push({ role: "user", content: text });

    const messages = [
        {
            role: "system",
            content: `
أنت أقوى مساعد ذكاء صناعي عربي.

${getPersonality(user.personality)}

- تجاوب بذكاء عالي
- تختصر بدون فقدان الفائدة
- تفهم السياق
- ترد طبيعي جداً مثل إنسان
`
        },
        ...user.messages.slice(-10)
    ];

    const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
            model: "gpt-4o-mini",
            messages: messages
        },
        {
            headers: {
                Authorization: `Bearer ${OPENAI_API_KEY}`,
                "Content-Type": "application/json"
            }
        }
    );

    const reply = response.data.choices[0].message.content;

    user.messages.push({ role: "assistant", content: reply });

    return reply;
}

// ================= COMMANDS =================
function handleCommands(text, user) {
    text = text.toLowerCase();

    if (text.includes("غير الشخصية")) {
        user.personality = "teacher";
        return "تم تغيير الشخصية إلى مدرس 👨‍🏫";
    }

    if (text.includes("ارجع عادي")) {
        user.personality = "iraqi";
        return "رجعت طبيعي 😎";
    }

    if (text.includes("امسح الذاكرة")) {
        user.messages = [];
        return "تم مسح الذاكرة 🧠";
    }

    return null;
}

// ================= ALEXA =================
app.post("/alexa", async (req, res) => {
    let userText = "مرحبا";
    let userId = "guest";

    try {
        userId = req.body.session.user.userId;
        userText =
            req.body.request.intent.slots.question.value || "مرحبا";
    } catch (e) {}

    if (!memory[userId]) {
        memory[userId] = {
            messages: [],
            personality: "iraqi"
        };
    }

    let user = memory[userId];

    const command = handleCommands(userText, user);
    if (command) {
        return res.json({
            version: "1.0",
            response: {
                outputSpeech: {
                    type: "PlainText",
                    text: command
                }
            }
        });
    }

    const reply = await askAI(user, userText);

    const ssml = `
<speak>
  <voice name="Zeina">
    <prosody rate="medium" pitch="+2%">
      ${reply}
    </prosody>
  </voice>
</speak>`;

    res.json({
        version: "1.0",
        response: {
            outputSpeech: {
                type: "SSML",
                ssml: ssml
            },
            shouldEndSession: false
        }
    });
});

// ================= RUN =================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("🔥 AI RUNNING WITHOUT DB"));
