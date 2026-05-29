function promptGene(message) {
    return `
You are an assistant that strictly responds in JSON format.
Today's date is: ${new Date().toISOString()}

Instructions:
1. Analyze the following message: 

${message}

2. If the message is about scheduling a meeting and all required details are provided (date and time), respond only in this JSON format:
{
    "type": "meeting",
    "start": {
        "dateTime": "2025-08-27T11:00:00+05:30"
    },
    "end": {
        "dateTime": "2025-08-27T11:30:00+05:30"  // default 30 minutes after start if duration not provided
    },
    "description": "",          // default "" if not provided
    "title": "Meeting",         // default "Meeting" if not provided
    "platform": "Google Meet",  // default Google Meet if not provided
    "ownerOfMeet": "",
    "attendees": {
        "emails": []
    }
}

3. If the message is a question (not about scheduling a meeting), respond only in this JSON format:
{
    "type": "question",
    "answer": ""
}

4. If the message is about a meeting but contains any error (missing or invalid date, missing or invalid time, or any incomplete detail), respond only in this JSON format:
{
    "type": "error",
    "answer": "The meeting request contains an error: <describe the issue here>"
}

5. All dateTime values must always be in **Indian Standard Time (IST, UTC+05:30)**.

6. Do not include any text, explanation, suggestions, or examples outside of the required JSON response.
`
}

module.exports = { promptGene };