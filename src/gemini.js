const {GoogleGenerativeAI} = require('@google/generative-ai');
const {GEMINI_API_KEY, BACKUP_GEMINI_API_KEY} = require('./geminiConfig');

const apiKey = GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(apiKey);

async function run(prompt) {

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro" });

        const fullPrompt = "Generate a few JSON testcases for this api endpoint: \n\n" + prompt;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        return text;
        
    } catch (error) {

        const backupApiKey = BACKUP_GEMINI_API_KEY;

        const genAIBackup = new GoogleGenerativeAI(backupApiKey);

        const model = genAIBackup.getGenerativeModel({ model: "gemini-pro" });

        const fullPrompt = "Generate a few JSON testcases for this api endpoint: \n\n" + prompt;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        const text = response.text();
        return text;
    }

    
}

module.exports = run;